import { Test, TestingModule } from '@nestjs/testing';
import { CognitiveService } from './cognitive.service';
import { PrismaService } from '../prisma/prisma.service';
import { BrandBrainService } from './brand-brain.service';
import { AiChatService } from './ai-chat.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

describe('CognitiveService', () => {
  let service: CognitiveService;

  const mockPrismaService = {
    ticket: { findUnique: jest.fn() },
    ticketInteraction: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'InCasa',
        brandBrain: null,
      }),
    },
    fileAsset: { create: jest.fn() },
  };

  const mockBrandBrainService = {
    getBrandContext: jest
      .fn()
      .mockResolvedValue('Don Atento es tu asistente de gestión de inmuebles.'),
    generateBrandResponse: jest
      .fn()
      .mockResolvedValue('Respuesta de marca generada.'),
  };

  const mockAiChatService = {
    generateChatResponse: jest
      .fn()
      .mockResolvedValue('Hola, soy el asistente de Don Atento.'),
  };

  const mockStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    signedUrl: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitiveService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrandBrainService, useValue: mockBrandBrainService },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: SupabaseStorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<CognitiveService>(CognitiveService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── classifyPriority: Pure keyword matching — no external deps ────────────
  // Signature: classifyPriority(title: string, description: string)
  describe('classifyPriority', () => {
    it('should classify URGENT for gas keyword in title', async () => {
      const result = await service.classifyPriority(
        'Fuga de gas en el apartamento',
        'Hay olor a gas en la cocina',
      );
      expect(result.priority).toBe('URGENT');
    });

    it('should classify URGENT for inundacion (without accent)', async () => {
      const result = await service.classifyPriority(
        'Inundacion en la cocina',
        'Se está inundando la cocina',
      );
      expect(result.priority).toBe('URGENT');
    });

    it('should classify URGENT for inundación (with accent) — accent normalization check', async () => {
      const result = await service.classifyPriority(
        'Inundación',
        'Hay una inundación grave',
      );
      expect(result.priority).toBe('URGENT');
    });

    it('should handle both accented and non-accented inundacion consistently', async () => {
      const withAccent = await service.classifyPriority(
        'Inundación',
        'descripcion con acento',
      );
      const withoutAccent = await service.classifyPriority(
        'Inundacion',
        'descripcion sin acento',
      );
      expect(withAccent.priority).toBe(withoutAccent.priority);
    });

    it('should classify HIGH for agua caliente keyword', async () => {
      const result = await service.classifyPriority(
        'Sin agua caliente',
        'El calentador no funciona',
      );
      expect(result.priority).toBe('HIGH');
    });

    it('should classify HIGH for seguridad keyword', async () => {
      const result = await service.classifyPriority(
        'Problema de seguridad',
        'La cerradura está dañada',
      );
      expect(result.priority).toBe('HIGH');
    });

    it('should classify LOW for pintura/mancha keywords', async () => {
      const result = await service.classifyPriority(
        'Mancha en la pared',
        'Hay una mancha de pintura en la sala',
      );
      expect(result.priority).toBe('LOW');
    });

    it('should default to MEDIUM for general unrecognized requests', async () => {
      const result = await service.classifyPriority(
        'Solicitud general',
        'Tengo una inquietud sin urgencia',
      );
      expect(result.priority).toBe('MEDIUM');
    });

    it('should always return a non-empty reason string', async () => {
      const result = await service.classifyPriority(
        'Daño en el techo',
        'Requiere inspección',
      );
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  // ── persistQuotation (private — accessed via typed cast) ───────────────────
  describe('persistQuotation', () => {
    type InternalAccess = {
      persistQuotation: (
        tenantId: string,
        buffer: Buffer,
        opts: { mimeType: string; originalName: string },
      ) => Promise<string>;
    };

    const callPersist = (
      tenantId: string,
      buffer: Buffer,
      opts: { mimeType: string; originalName: string },
    ) =>
      (service as unknown as InternalAccess).persistQuotation(
        tenantId,
        buffer,
        opts,
      );

    it('uploads, creates FileAsset, and returns a 7-day signed URL', async () => {
      mockStorageService.upload.mockResolvedValue({
        bucketKey: 't1/quotations/abc.pdf',
        filename: 'abc.pdf',
      });
      mockPrismaService.fileAsset.create.mockResolvedValue({});
      mockStorageService.signedUrl.mockResolvedValue('https://sig/url');

      const buffer = Buffer.from('pdf-bytes');
      const url = await callPersist('t1', buffer, {
        mimeType: 'application/pdf',
        originalName: 'quote.pdf',
      });

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        't1',
        'quotations',
        buffer,
        { mimeType: 'application/pdf', originalName: 'quote.pdf' },
      );
      expect(mockPrismaService.fileAsset.create).toHaveBeenCalledWith({
        data: {
          tenantId: 't1',
          filename: 'abc.pdf',
          bucketKey: 't1/quotations/abc.pdf',
          originalName: 'quote.pdf',
          mimeType: 'application/pdf',
          sizeBytes: buffer.length,
        },
      });
      expect(mockStorageService.signedUrl).toHaveBeenCalledWith(
        't1/quotations/abc.pdf',
        7 * 24 * 60 * 60,
      );
      expect(url).toBe('https://sig/url');
    });

    it('rolls back the Supabase object when FileAsset.create fails', async () => {
      mockStorageService.upload.mockResolvedValue({
        bucketKey: 'k',
        filename: 'f',
      });
      mockPrismaService.fileAsset.create.mockRejectedValue(
        new Error('DB constraint'),
      );
      mockStorageService.delete.mockResolvedValue(undefined);

      await expect(
        callPersist('t1', Buffer.from('x'), {
          mimeType: 'application/pdf',
          originalName: 'q.pdf',
        }),
      ).rejects.toThrow('DB constraint');

      expect(mockStorageService.delete).toHaveBeenCalledWith('k');
      expect(mockStorageService.signedUrl).not.toHaveBeenCalled();
    });

    it('does not shadow the original error when rollback delete itself fails', async () => {
      mockStorageService.upload.mockResolvedValue({
        bucketKey: 'k',
        filename: 'f',
      });
      mockPrismaService.fileAsset.create.mockRejectedValue(
        new Error('Original DB error'),
      );
      mockStorageService.delete.mockRejectedValue(
        new Error('Rollback also failed'),
      );

      await expect(
        callPersist('t1', Buffer.from('x'), {
          mimeType: 'application/pdf',
          originalName: 'q.pdf',
        }),
      ).rejects.toThrow('Original DB error');
    });
  });
});
