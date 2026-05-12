import { Test, TestingModule } from '@nestjs/testing';
import { CognitiveService } from './cognitive.service';
import { PrismaService } from '../prisma/prisma.service';
import { BrandBrainService } from './brand-brain.service';
import { AiChatService } from './ai-chat.service';
import { FileUploadService } from '../storage/file-upload.service';

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

  const mockFileUploadService = {
    upload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitiveService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrandBrainService, useValue: mockBrandBrainService },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: FileUploadService, useValue: mockFileUploadService },
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
});
