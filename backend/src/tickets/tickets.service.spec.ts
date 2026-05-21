import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../cognitive/email.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { SlaMatrixService } from './sla-matrix.service';
import { SurveyTokenService } from './survey-token.service';
import { TicketPriority } from '@prisma/client';

// ─── Minimal mock factory ────────────────────────────────────────────────────

const makeTicket = (overrides: Record<string, unknown> = {}) => ({
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
    count: jest.fn().mockResolvedValue(0),
  },
  tenant: {
    findUnique: jest
      .fn()
      .mockResolvedValue({ id: 'tenant-1', name: 'Incasa NC Group' }),
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
    findUnique: jest.fn().mockResolvedValue({
      id: 'state-2',
      name: 'Asignado',
      order: 1,
      assignedRole: null,
    }),
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
  classifyPriority: jest
    .fn()
    .mockResolvedValue({ priority: TicketPriority.MEDIUM, reason: 'General' }),
  generateResponse: jest
    .fn()
    .mockResolvedValue({ shortResponse: 'OK', longEmail: 'OK' }),
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

const makeSurveyTokenMock = () => ({
  generate: jest.fn().mockReturnValue('deadbeefdeadbeef'),
  verify: jest.fn().mockReturnValue(true),
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let cognitiveMock: ReturnType<typeof makeCognitiveMock>;
  let whatsappMock: Record<string, jest.Mock>;

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
        { provide: SurveyTokenService, useValue: makeSurveyTokenMock() },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    whatsappMock = module.get<WhatsappService>(WhatsappService);
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

      const result = await service.createTicket(
        dto as unknown as import('./dto/create-ticket.dto').CreateTicketDto,
      );

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

      await service.createTicket(
        dto as unknown as import('./dto/create-ticket.dto').CreateTicketDto,
      );

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

      await service.createTicket(
        dto as unknown as import('./dto/create-ticket.dto').CreateTicketDto,
      );

      // The AI classification should have been called
      expect(cognitiveMock.classifyPriority).toHaveBeenCalledWith(
        dto.title,
        dto.description,
      );

      // The created ticket should have URGENT priority in the data
      const createCall = (
        prismaMock.ticket.create.mock.calls as unknown[][]
      )[0][0] as { data: { priority: string } };
      expect(createCall.data.priority).toBe(TicketPriority.URGENT);
    });

    it('generates shortId with tenant name prefix', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Incasa',
      });

      await service.createTicket({
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        title: 'Test',
        description: 'Test',
        priority: TicketPriority.MEDIUM,
        workflowId: 'wf-1',
      } as unknown as import('./dto/create-ticket.dto').CreateTicketDto);

      const createCall = (
        prismaMock.ticket.create.mock.calls as unknown[][]
      )[0][0] as { data: { shortId: string } };
      // 5 bytes of crypto.randomBytes → 10 uppercase hex chars (Block E
      // replaced the old Math.random 5-digit numeric space).
      expect(createCall.data.shortId).toMatch(/^INC-[0-9A-F]{10}$/);
    });

    it('notifies the assigned technician via WhatsApp if technician.phone is present', async () => {
      const techUser = {
        id: 'tech-1',
        firstName: 'Jose',
        email: 'jose@test.com',
        phone: '3009876543',
        whatsappId: null,
      };

      prismaMock.ticket.create.mockResolvedValue(
        makeTicket({
          assignedTechnicianId: 'tech-1',
          assignedTechnician: techUser,
        }),
      );

      await service.createTicket({
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        title: 'Fuga de agua',
        description: 'Test description',
        priority: TicketPriority.MEDIUM,
        assignedTechnicianId: 'tech-1',
      } as unknown as import('./dto/create-ticket.dto').CreateTicketDto);

      // Allow async sendTicketNotifications call to execute
      await new Promise((resolve) => setImmediate(resolve));

      expect(whatsappMock.sendMessage).toHaveBeenCalledWith(
        '3009876543',
        expect.stringContaining('Se te ha asignado un nuevo ticket'),
        'tenant-1',
      );
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
        reportedByUser: {
          id: 'user-1',
          firstName: 'Juan',
          email: null,
          phone: null,
          whatsappId: null,
        },
        tenant: { id: 'tenant-1' },
      });

      await service.transitionState(
        'ticket-1',
        'tenant-1',
        'user-1',
        'state-2',
      );

      expect(prismaMock.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1', tenantId: 'tenant-1' },
        }),
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
        reportedByUser: {
          id: 'user-1',
          firstName: 'Juan',
          email: null,
          phone: '3001234567',
          whatsappId: null,
        },
        tenant: { id: 'tenant-1' },
      });

      await service.transitionState(
        'ticket-1',
        'tenant-1',
        'user-1',
        'state-3',
      );

      const updateCall = (
        prismaMock.ticket.update.mock.calls as unknown[][]
      )[0][0] as { data: { resolvedAt: Date } };
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
        reportedByUser: {
          id: 'user-1',
          firstName: 'Juan',
          email: null,
          phone: null,
          whatsappId: null,
        },
        tenant: { id: 'tenant-1' },
      });

      await service.transitionState(
        'ticket-1',
        'tenant-1',
        'user-1',
        'state-2',
      );

      const updateCall = (
        prismaMock.ticket.update.mock.calls as unknown[][]
      )[0][0] as { data: { resolvedAt?: Date } };
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
        reportedByUser: {
          id: 'user-1',
          firstName: 'Juan',
          email: null,
          phone: null,
          whatsappId: null,
        },
        tenant: { id: 'tenant-1' },
      });

      const result = await service.resolveTicket(
        'ticket-1',
        'tenant-1',
        'Resuelto por técnico',
      );

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
        reportedByUser: {
          id: 'user-1',
          firstName: 'Juan',
          email: null,
          phone: null,
          whatsappId: null,
        },
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

      await service.updateSatisfaction(
        'ticket-1',
        'tenant-1',
        5,
        'Excelente servicio',
      );

      expect(prismaMock.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1', tenantId: 'tenant-1' },
        data: {
          satisfactionStars: 5,
          satisfactionComment: 'Excelente servicio',
        },
      });
    });
  });

  // ── findLatestByPhone ─────────────────────────────────────────────────────

  describe('findLatestByPhone()', () => {
    it('queries by phone and tenantId, returns most recent ticket', async () => {
      const ticket = makeTicket();
      prismaMock.ticket.findFirst.mockResolvedValue(ticket);

      const result = await service.findLatestByPhone('3001234567', 'tenant-1');

      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            reportedByUserPhone: '3001234567',
          },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result?.id).toBe('ticket-1');
    });

    it('returns null if no ticket found', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      const result = await service.findLatestByPhone('9999999999', 'tenant-1');
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

      const call = (
        prismaMock.ticket.findMany.mock.calls as unknown[][]
      )[0][0] as { where: { tenantId: string } };
      expect(call.where.tenantId).toBe('tenant-2');
      // Confirm it does NOT query tenant-1 data
      expect(call.where.tenantId).not.toBe('tenant-1');
    });
  });

  // ── P0.3 dual-shape pagination ───────────────────────────────────────────
  //
  // Phase 1 contract: when `opts` is omitted, the service returns the
  // legacy array (current frontend keeps working). When `opts` is given,
  // it returns `{ data, totalRecords, totalPages, currentPage }` and
  // issues a parallel count query. Tests verify both branches across the
  // three list methods. Phase 2 (next commit) removes the legacy branch.

  describe('findAllByTenant() — paginated shape (P0.3)', () => {
    it('returns paginated shape when opts is provided', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([
        makeTicket(),
        makeTicket(),
      ]);
      prismaMock.ticket.count.mockResolvedValue(42);

      const result = await service.findAllByTenant('tenant-1', {
        page: 2,
        limit: 10,
      });

      expect(result).toEqual(
        expect.objectContaining({
          totalRecords: 42,
          totalPages: 5, // ceil(42 / 10)
          currentPage: 2,
        }),
      );
      expect(Array.isArray((result as Record<string, unknown>).data)).toBe(
        true,
      );
    });

    it('passes skip/take/orderBy correctly to findMany', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);
      prismaMock.ticket.count.mockResolvedValue(0);

      await service.findAllByTenant('tenant-1', { page: 3, limit: 25 });

      const call = (
        prismaMock.ticket.findMany.mock.calls as unknown[][]
      )[0][0] as { skip: number; take: number; orderBy: unknown };
      expect(call.skip).toBe(50); // (3 - 1) * 25
      expect(call.take).toBe(25);
      // id tiebreaker for stable pagination across rows sharing createdAt
      expect(call.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });

    it('issues count with the same where clause as findMany', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);
      prismaMock.ticket.count.mockResolvedValue(0);

      await service.findAllByTenant('tenant-1', { page: 1, limit: 20 });

      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });

    it('legacy branch (no opts) does NOT call count', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([makeTicket()]);
      await service.findAllByTenant('tenant-1');
      expect(prismaMock.ticket.count).not.toHaveBeenCalled();
    });
  });

  describe('findAllByOwner() — paginated shape (P0.3)', () => {
    it('returns paginated shape when opts is provided', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([makeTicket()]);
      prismaMock.ticket.count.mockResolvedValue(7);

      const result = await service.findAllByOwner('owner-1', 'tenant-1', {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(
        expect.objectContaining({
          totalRecords: 7,
          totalPages: 1,
          currentPage: 1,
        }),
      );
    });

    it('count uses the same composite where (tenantId + owner relation)', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);
      prismaMock.ticket.count.mockResolvedValue(0);

      await service.findAllByOwner('owner-1', 'tenant-1', {
        page: 1,
        limit: 20,
      });

      const countCall = (
        prismaMock.ticket.count.mock.calls as unknown[][]
      )[0][0] as {
        where: {
          tenantId: string;
          property: { relations: { some: { userId: string } } };
        };
      };
      expect(countCall.where.tenantId).toBe('tenant-1');
      expect(countCall.where.property.relations.some.userId).toBe('owner-1');
    });
  });

  describe('findAllByTechnician() — paginated shape (P0.3)', () => {
    it('returns paginated shape when opts is provided', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([
        makeTicket(),
        makeTicket(),
        makeTicket(),
      ]);
      prismaMock.ticket.count.mockResolvedValue(15);

      const result = await service.findAllByTechnician('tech-1', 'tenant-1', {
        page: 1,
        limit: 5,
      });

      expect(result).toEqual(
        expect.objectContaining({
          totalRecords: 15,
          totalPages: 3, // ceil(15 / 5)
          currentPage: 1,
        }),
      );
    });

    it('count uses tenantId + assignedTechnicianId composite where', async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);
      prismaMock.ticket.count.mockResolvedValue(0);

      await service.findAllByTechnician('tech-1', 'tenant-1', {
        page: 1,
        limit: 20,
      });

      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', assignedTechnicianId: 'tech-1' },
      });
    });
  });
});
