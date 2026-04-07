import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SlaMatrixService } from './sla-matrix.service';
import { EmailService } from '../cognitive/email.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { TicketPriority } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;

  const mockPrismaService = {
    ticket: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    workflow: { findUnique: jest.fn() },
    workflowState: { findUnique: jest.fn() },
    ticketStateLog: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };

  const mockWhatsappService = {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    sendRawMessage: jest.fn().mockResolvedValue(undefined),
  };

  const mockSlaMatrixService = {
    calculateDueDate: jest.fn().mockResolvedValue(new Date()),
  };

  const mockEmailService = {
    sendFormalReport: jest.fn().mockResolvedValue(undefined),
    sendSurveyRequest: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockCognitiveService = {
    classifyPriority: jest.fn().mockResolvedValue({ priority: TicketPriority.MEDIUM, reason: 'test reason' }),
    generateResponse: jest.fn().mockResolvedValue({
      shortResponse: 'Test response',
      longEmail: 'Test email',
      sentiment: 'NEUTRAL',
      alignment: { score: 0.9, feedback: 'ok' },
    }),
    logInteraction: jest.fn().mockResolvedValue(undefined),
    generateExecutiveQuotation: jest.fn().mockResolvedValue('## COTIZACIÓN PROFESIONAL'),
    generateQuotationDocx: jest.fn().mockResolvedValue('/uploads/test.docx'),
    generateQuotationPdf: jest.fn().mockResolvedValue('/uploads/test.pdf'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: SlaMatrixService, useValue: mockSlaMatrixService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CognitiveService, useValue: mockCognitiveService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSatisfaction', () => {
    it('should update satisfaction stars and comment', async () => {
      const mockTicket = { id: 'ticket-1', satisfactionStars: 5, satisfactionComment: 'Excellent' };
      mockPrismaService.ticket.update.mockResolvedValue(mockTicket);

      const result = await service.updateSatisfaction('ticket-1', 5, 'Excellent');

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { satisfactionStars: 5, satisfactionComment: 'Excellent' },
      });
      expect(result).toEqual(mockTicket);
    });
  });

  describe('findLatestByPhone', () => {
    it('should find the most recent ticket by phone number', async () => {
      const mockTicket = { id: 'ticket-1', reportedByUserPhone: '+57300123456' };
      mockPrismaService.ticket.findFirst.mockResolvedValue(mockTicket);

      const result = await service.findLatestByPhone('+57300123456');

      expect(mockPrismaService.ticket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reportedByUserPhone: '+57300123456' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual(mockTicket);
    });

    it('should return null when no ticket found', async () => {
      mockPrismaService.ticket.findFirst.mockResolvedValue(null);
      const result = await service.findLatestByPhone('+57000000000');
      expect(result).toBeNull();
    });
  });
});
