import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService, Intent } from './whatsapp.service';
import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { CrmService } from '../crm/crm.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const mockPrismaService = {
    user: { findFirst: jest.fn() },
    prospect: { findFirst: jest.fn() },
    tenant: { findFirst: jest.fn() },
    propertyRelation: { findFirst: jest.fn() },
    ticket: { findFirst: jest.fn() },
    workflow: { findFirst: jest.fn() },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockTicketsService = {
    findLatestByPhone: jest.fn(),
    createTicket: jest.fn(),
    addAttachment: jest.fn(),
    updateSatisfaction: jest.fn(),
  };

  const mockCognitiveService = {
    generateAiChatResponse: jest.fn().mockResolvedValue({ reply: 'Hola!' }),
    generateResponse: jest.fn().mockResolvedValue({
      shortResponse: 'Test response',
      longEmail: 'Test',
      sentiment: 'NEUTRAL',
      alignment: { score: 0.9, feedback: 'ok' },
    }),
    logInteraction: jest.fn(),
  };

  const mockCrmService = {
    createProspect: jest.fn(),
    addInteraction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: CognitiveService, useValue: mockCognitiveService },
        { provide: CrmService, useValue: mockCrmService },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Intent Detection: Pure Function Tests ──────────────────────────────────
  describe('detectIntent', () => {
    it('should detect GREETING intent', () => {
      expect(service.detectIntent('Hola buenos días')).toBe(Intent.GREETING);
      expect(service.detectIntent('buenos tardes')).toBe(Intent.GREETING);
    });

    it('should detect MAINTENANCE_REQUEST intent', () => {
      expect(service.detectIntent('El calentador está roto')).toBe(Intent.MAINTENANCE_REQUEST);
      expect(service.detectIntent('hay un daño en el baño')).toBe(Intent.MAINTENANCE_REQUEST);
      expect(service.detectIntent('necesito reparar la llave')).toBe(Intent.MAINTENANCE_REQUEST);
    });

    it('should detect PHOTO_SUBMISSION intent', () => {
      expect(service.detectIntent('aqui esta la foto')).toBe(Intent.PHOTO_SUBMISSION);
      expect(service.detectIntent('te mando el video')).toBe(Intent.PHOTO_SUBMISSION);
      expect(service.detectIntent('aqui esta la evidencia del caso')).toBe(Intent.PHOTO_SUBMISSION);
    });

    it('should detect STATUS_QUERY intent', () => {
      expect(service.detectIntent('como va mi ticket?')).toBe(Intent.STATUS_QUERY);
      expect(service.detectIntent('cual es el estado de mi solicitud')).toBe(Intent.STATUS_QUERY);
    });

    it('should detect SURVEY_RESPONSE intent for ratings 1-5', () => {
      expect(service.detectIntent('5')).toBe(Intent.SURVEY_RESPONSE);
      expect(service.detectIntent('1 excelente')).toBe(Intent.SURVEY_RESPONSE);
    });

    it('should detect GOODBYE intent', () => {
      expect(service.detectIntent('gracias hasta luego')).toBe(Intent.GOODBYE);
      expect(service.detectIntent('chao')).toBe(Intent.GOODBYE);
    });

    it('should return UNKNOWN for unrecognized messages', () => {
      expect(service.detectIntent('quiero saber el precio del arriendo')).toBe(Intent.UNKNOWN);
    });
  });
});
