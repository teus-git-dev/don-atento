import { Test, TestingModule } from '@nestjs/testing';
import { BrandBrainService } from './brand-brain.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileUploadService } from '../storage/file-upload.service';

describe('BrandBrainService', () => {
  let service: BrandBrainService;
  const mockPrisma = {};
  const mockFileUpload = { upload: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandBrainService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FileUploadService, useValue: mockFileUpload },
      ],
    }).compile();
    service = module.get<BrandBrainService>(BrandBrainService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadBrandDocument', () => {
    it('delegates to FileUploadService with brand category + 7d TTL', async () => {
      mockFileUpload.upload.mockResolvedValue({
        url: 'https://sig/url',
        filename: 'abc.pdf',
        bucketKey: 't1/brand/abc.pdf',
      });

      const content = Buffer.from('pdf-bytes');
      const result = await service.uploadBrandDocument(
        't1',
        'policies.pdf',
        content,
      );

      expect(mockFileUpload.upload).toHaveBeenCalledWith(
        't1',
        'brand',
        content,
        {
          mimeType: 'application/octet-stream',
          originalName: 'policies.pdf',
          ttlSeconds: 7 * 24 * 60 * 60,
        },
      );
      expect(result).toEqual({
        success: true,
        url: 'https://sig/url',
        filename: 'abc.pdf',
      });
    });

    it('propagates errors from FileUploadService', async () => {
      mockFileUpload.upload.mockRejectedValue(new Error('storage down'));
      await expect(
        service.uploadBrandDocument('t1', 'x.pdf', Buffer.from('x')),
      ).rejects.toThrow('storage down');
    });
  });
});
