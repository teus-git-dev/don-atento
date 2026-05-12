import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService, Intent } from './whatsapp.service';
import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { CrmService } from '../crm/crm.service';
import { BaileysManager } from './baileys.manager';

// Mock ioredis
jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    })),
  };
});

describe('WhatsappService', () => {
  let service: WhatsappService;
  let redisMock: any;
  let ticketsServiceMock: any;
  let cognitiveServiceMock: any;

  beforeEach(async () => {
    const IORedis = require('ioredis');

    ticketsServiceMock = {
      findLatestByPhone: jest
        .fn()
        .mockResolvedValue({ id: 'ticket-1', shortId: 'TKT-1' }),
      createTicket: jest
        .fn()
        .mockResolvedValue({ id: 'ticket-2', shortId: 'TKT-2' }),
    };

    cognitiveServiceMock = {
      processWhatsappWithAi: jest
        .fn()
        .mockResolvedValue(
          'Respuesta AI [METADATA]Action: GENERAL_REPLY[/METADATA]',
        ),
      logInteraction: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: HttpService, useValue: { post: jest.fn() } },
        { provide: TicketsService, useValue: ticketsServiceMock },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'user-1',
                firstName: 'Pepe',
                tenantId: 't1',
              }),
            },
            propertyRelation: {
              findFirst: jest
                .fn()
                .mockResolvedValue({ property: { title: 'Apto', id: 'p1' } }),
            },
            ticket: { findMany: jest.fn().mockResolvedValue([]) },
            workflow: { findFirst: jest.fn().mockResolvedValue({ id: 'wf1' }) },
            tenant: { findFirst: jest.fn().mockResolvedValue(null) },
          },
        },
        { provide: CognitiveService, useValue: cognitiveServiceMock },
        { provide: CrmService, useValue: {} },
        {
          provide: BaileysManager,
          useValue: {
            setMessageHandler: jest.fn(),
            getAdapter: jest
              .fn()
              .mockReturnValue({ getStatus: () => 'disconnected' }),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    // Grab the redis instance from the service to spy on it
    redisMock = (service as any).redis;
  });

  afterEach(() => jest.clearAllMocks());

  describe('classifyIntent() (detectIntent)', () => {
    it('detects MAINTENANCE_REQUEST for keywords', () => {
      expect(service.detectIntent('se ha roto la tuberia')).toBe(
        Intent.MAINTENANCE_REQUEST,
      );
      expect(service.detectIntent('falla en el baño')).toBe(
        Intent.MAINTENANCE_REQUEST,
      );
    });

    it('detects STATUS_QUERY for keywords', () => {
      expect(service.detectIntent('como va mi reporte')).toBe(
        Intent.STATUS_QUERY,
      );
    });
  });

  describe('getState / setState fallback', () => {
    it('getState returns null if Redis throws error (graceful fallback)', async () => {
      redisMock.get.mockRejectedValueOnce(new Error('Redis is down'));
      const state = await (service as any).getState('phone');
      expect(state).toBeNull();
    });
  });

  describe('processIncomingMessage()', () => {
    it('AI DE_ESCALATE action does not create a ticket', async () => {
      cognitiveServiceMock.processWhatsappWithAi.mockResolvedValue(
        'Tranquilo [METADATA]Action: DE_ESCALATE[/METADATA]',
      );

      // Stub sendMessage to prevent actual HTTP calls
      jest.spyOn(service, 'sendMessage').mockResolvedValue(undefined);

      await service.processIncomingMessage('3000000000', 'Estoy muy molesto');

      expect(ticketsServiceMock.createTicket).not.toHaveBeenCalled();
      expect(service.sendMessage).toHaveBeenCalledWith(
        '3000000000',
        'Tranquilo',
        expect.anything(),
      );
    });

    it('AI CREATE_TICKET action calls ticketsService.createTicket', async () => {
      cognitiveServiceMock.processWhatsappWithAi.mockResolvedValue(
        'Creando ticket [METADATA]Action: CREATE_TICKET[/METADATA]',
      );

      jest.spyOn(service, 'sendMessage').mockResolvedValue(undefined);

      await service.processIncomingMessage(
        '3000000000',
        'Necesito reparar la puerta',
      );

      expect(ticketsServiceMock.createTicket).toHaveBeenCalled();
      expect(service.sendMessage).toHaveBeenCalledWith(
        '3000000000',
        expect.stringContaining('TKT-2'),
        expect.anything(),
      );
    });
  });
});
