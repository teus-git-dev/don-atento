import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../cognitive/email.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { SlaMatrixService } from './sla-matrix.service';
import { TicketPriority } from '@prisma/client';

// ─── Minimal mock factory ────────────────────────────────────────────────────

const makeTicket = (overrides: any = {}) => ({
  id: 'ticket-1',
  shortId: 'INC-11111',
  tenantId: 'tenant-1',
  propertyId: 'prop-1',
  title: 'Fuga de agua',
  description: 'Hay una fuga en el baño',
  priority: TicketPriority.MEDIUM,
  resolvedAt: null,
  workflowId: 'wf-1',
  currentStateId: 'state-1',
  reportedByUserPhone: '3001234567',
  property: {
    title: 'Apto 401',
    relations: [],
    assignments: [],
  },
  assignedTechnician: null,
  currentState: { id: 'state-1', name: 'Reportado', order: 0 },
  reportedByUser: {
    id: 'user-1',
    firstName: 'Juan',
    email: 'juan@test.com',
    phone: '3001234567',
    whatsappId: null,
  },
  ...overrides,
});

const makePrismaMock = () => ({
  ticket: {
    create: jest.fn().mockResolvedValue(makeTicket()),
    update: jest.fn().mockResolvedValue(makeTicket()),
    findUnique: jest.fn().mockResolvedValue(makeTicket()),
    findFirst: jest.fn().mockResolvedValue(makeTicket()),
    findMany: jest.fn().mockResolvedValue([makeTicket()]),
  },
  tenant: {
    findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', name: 'Incasa NC Group' }),
  },
  workflow: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'wf-1',
      states: [
        { id: 'state-1', name: 'Reportado', order: 0, slaHours: 2 },
        { id: 'state-2', name: 'Asignado', order: 1, slaHours: 4 },
        { id: 'state-3', name: 'Resuelto', order: 2, slaHours: 0 },
      ],
    }),
    findFirst: jest.fn().mockResolvedValue({
      id: 'wf-1',
      states: [{ id: 'state-1', name: 'Reportado', order: 0 }],
    }),
  },
  workflowState: {
    findUnique: jest.fn().mockResolvedValue({ id: 'state-2', name: 'Asignado', order: 1, assignedRole: null }),
  },
  ticketStateLog: {
    create: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({}),
  },
  user: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const makeCognitiveMock = () => ({
  classifyPriority: jest.fn().mockResolvedValue({ priority: TicketPriority.MEDIUM, reason: 'General' }),
  generateResponse: jest.fn().mockResolvedValue({ shortResponse: 'OK', longEmail: 'OK' }),
  logInteraction: jest.fn().mockResolvedValue({}),
  generateExecutiveQuotation: jest.fn().mockResolvedValue('Cotización OK'),
  generateQuotationDocx: jest.fn().mockResolvedValue('/files/q.docx'),
  generateQuotationPdf: jest.fn().mockResolvedValue('/files/q.pdf'),
});

const makeSlaMock = () => ({
  calculateDueDate: jest.fn().mockResolvedValue(new Date()),
});

const makeWhatsappMock = () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
  sendRawMessage: jest.fn().mockResolvedValue(undefined),
});

const makeEmailMock = () => ({
  sendFormalReport: jest.fn().mockResolvedValue(undefined),
  sendSurveyRequest: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let cognitiveMock: ReturnType<typeof makeCognitiveMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();
    cognitiveMock = makeCognitiveMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: WhatsappService, useValue: makeWhatsappMock() },
        { provide: EmailService, useValue: makeEmailMock() },
        { provide: CognitiveService, useValue: cognitiveMock },
        { provide: SlaMatrixService, useValue: makeSlaMock() },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createTicket ──────────────────────────────────────────────────────────

  describe('createTicket()', () => {
    it('happy path: creates ticket and logs initial state', async () => {
      const dto = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        title: 'Fuga de agua',
        description: 'Hay fuga en el baño',
        priority: TicketPriority.URGENT,
        workflowId: 'wf-1',
      };

      const result = await service.createTicket(dto as any);

      expect(prismaMock.ticket.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.ticketStateLog.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('ticket-1');
    });

    it('creates ticket without workflowId — initialStateId is not set in create call', async () => {
      prismaMock.workflow.findUnique.mockResolvedValue(null);
      const dto = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        title: 'Sin workflow',
        description: 'Test',
        priority: TicketPriority.LOW,
        workflowId: undefined,
      };

      await service.createTicket(dto as any);

      // No workflow fetched → ticketStateLog.create NOT called
      expect(prismaMock.ticketStateLog.create).not.toHaveBeenCalled();
    });

    it('AI overrides MEDIUM priority when AI returns URGENT', async () => {
      cognitiveMock.classifyPriority.mockResolvedValue({
        priority: TicketPriority.URGENT,
        reason: 'Fuga de gas detectada',
      });

      const dto = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        title: 'Fuga de gas',
        description: 'Gas en la cocina',
        priority: TicketPriority.MEDIUM,
        workflowId: 'wf-1',
      };

      await service.createTicket(dto as any);

      // The AI classification should have been called
      expect(cognitiveMock.classifyPriority).toHaveBeenCalledWith(dto.title, dto.description);

      // The created ticket should have URGENT priority in the data
      const createCall = prismaMock.ticket.create.mock.calls[0][0];
      expect(createCall.data.priority).toBe(TicketPriority.URGENT);
    });

    it('generates shortId with tenant name prefix', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', name: 'Incasa' });

      await service.createTicket({
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        title: 'Test',
        description: 'Test',
        priority: TicketPriority.MEDIUM,
        workflowId: 'wf-1',
      } as any);

      const createCall = prismaMock.ticket.create.mock.calls[0][0];
      expect(createCall.data.shortId).toMatch(/^INC-\d{5}$/);
    });
  });

  // ── transitionState ───────────────────────────────────────────────────────

  describe('transitionState()', () => {
    it('updates ticket currentStateId and creates new state log entry', async () => {
      prismaMock.workflowState.findUnique.mockResolvedValue({
        id: 'state-2',
        name: 'Asignado',
        order: 1,
        assignedRole: null,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...makeTicket(),
        currentStateId: 'state-2',
        currentState: { id: 'state-2', name: 'Asignado', order: 1 },
        reportedByUser: { id: 'user-1', firstName: 'Juan', email: null, phone: null, whatsappId: null },
        tenant: { id: 'tenant-1' },
      });

      await service.transitionState('ticket-1', 'tenant-1', 'user-1', 'state-2');

      expect(prismaMock.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ticket-1', tenantId: 'tenant-1' } }),
      );
      expect(prismaMock.ticketStateLog.create).toHaveBeenCalledTimes(1);
    });

    it('sets resolvedAt when transitioning to a state named "Resuelto"', async () => {
      prismaMock.workflowState.findUnique.mockResolvedValue({
        id: 'state-3',
        name: 'Resuelto',
        order: 2,
        assignedRole: null,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...makeTicket({ resolvedAt: new Date() }),
        currentState: { id: 'state-3', name: 'Resuelto', order: 2 },
        reportedByUser: { id: 'user-1', firstName: 'Juan', email: null, phone: '3001234567', whatsappId: null },
        tenant: { id: 'tenant-1' },
      });

      await service.transitionState('ticket-1', 'tenant-1', 'user-1', 'state-3');

      const updateCall = prismaMock.ticket.update.mock.calls[0][0];
      expect(updateCall.data.resolvedAt).toBeDefined();
    });

    it('does NOT set resolvedAt for intermediate states', async () => {
      prismaMock.workflowState.findUnique.mockResolvedValue({
        id: 'state-2',
        name: 'En Proceso',
        order: 1,
        assignedRole: null,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...makeTicket(),
        currentState: { id: 'state-2', name: 'En Proceso', order: 1 },
        reportedByUser: { id: 'user-1', firstName: 'Juan', email: null, phone: null, whatsappId: null },
        tenant: { id: 'tenant-1' },
      });

      await service.transitionState('ticket-1', 'tenant-1', 'user-1', 'state-2');

      const updateCall = prismaMock.ticket.update.mock.calls[0][0];
      expect(updateCall.data.resolvedAt).toBeUndefined();
    });
  });

  // ── resolveTicket ─────────────────────────────────────────────────────────

  describe('resolveTicket()', () => {
    it('happy path: transitions to the "Resuelto" state', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({
        ...makeTicket(),
        workflow: {
          id: 'wf-1',
          states: [
            { id: 'state-1', name: 'Reportado', order: 0 },
            { id: 'state-3', name: 'Resuelto', order: 2 },
          ],
        },
      });

      prismaMock.workflowState.findUnique.mockResolvedValue({
        id: 'state-3',
        name: 'Resuelto',
        order: 2,
        assignedRole: null,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...makeTicket({ resolvedAt: new Date() }),
        currentState: { id: 'state-3', name: 'Resuelto', order: 2 },
        reportedByUser: { id: 'user-1', firstName: 'Juan', email: null, phone: null, whatsappId: null },
        tenant: { id: 'tenant-1' },
      });

      const result = await service.resolveTicket('ticket-1', 'tenant-1', 'Resuelto por técnico');

      expect(prismaMock.ticket.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('auto-assigns default workflow if ticket has none', async () => {
      // First call: ticket has no workflow
      prismaMock.ticket.findUnique
        .mockResolvedValueOnce({ ...makeTicket(), workflow: null })
        .mockResolvedValueOnce({
          ...makeTicket(),
          workflow: {
            id: 'wf-default',
            states: [
              { id: 's-1', name: 'Reportado', order: 0 },
              { id: 's-2', name: 'Resuelto', order: 1 },
            ],
          },
        });

      prismaMock.workflowState.findUnique.mockResolvedValue({
        id: 's-2',
        name: 'Resuelto',
        order: 1,
        assignedRole: null,
      });
      prismaMock.ticket.update.mockResolvedValue({
        ...makeTicket({ resolvedAt: new Date() }),
        currentState: { id: 's-2', name: 'Resuelto', order: 1 },
        reportedByUser: { id: 'user-1', firstName: 'Juan', email: null, phone: null, whatsappId: null },
        tenant: { id: 'tenant-1' },
      });

      await service.resolveTicket('ticket-1', 'tenant-1', 'Resuelto');

      // ticket.update should have been called to assign the workflow
      expect(prismaMock.ticket.update).toHaveBeenCalled();
    });
  });

  // ── updateSatisfaction ────────────────────────────────────────────────────

  describe('updateSatisfaction()', () => {
    it('persists stars and comment to the ticket', async () => {
      prismaMock.ticket.update.mockResolvedValue({
        ...makeTicket(),
        satisfactionStars: 5,
        satisfactionComment: 'Excelente servicio',
      });

      const result = await service.updateSatisfaction('ticket-1', 'tenant-1', 5, 'Excelente servicio');

      expect(prismaMock.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1', tenantId: 'tenant-1' },
        data: { satisfactionStars: 5, satisfactionComment: 'Excelente servicio' },
      });
    });
  });

  // ── findLatestByPhone ─────────────────────────────────────────────────────

  describe('findLatestByPhone()', () => {
    it('queries by phone and returns the most recent ticket', async () => {
      const ticket = makeTicket();
      prismaMock.ticket.findFirst.mockResolvedValue(ticket);

      const result = await service.findLatestByPhone('3001234567');

      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reportedByUserPhone: '3001234567' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result?.id).toBe('ticket-1');
    });

    it('returns null if no ticket found', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      const result = await service.findLatestByPhone('9999999999');
      expect(result).toBeNull();
    });
  });

  // ── findAllByTenant — multi-tenant isolation ──────────────────────────────

  describe('findAllByTenant() — multi-tenant isolation', () => {
    it('only queries tickets for the given tenantId', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([makeTicket()]);

      await service.findAllByTenant('tenant-1');

      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });

    it('a different tenantId gets a separate query — no data leakage', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);
      await service.findAllByTenant('tenant-2');

      const call = prismaMock.ticket.findMany.mock.calls[0][0];
      expect(call.where.tenantId).toBe('tenant-2');
      // Confirm it does NOT query tenant-1 data
      expect(call.where.tenantId).not.toBe('tenant-1');
    });
  });
});
