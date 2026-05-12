import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FileUploadService', () => {
  let service: FileUploadService;
  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    signedUrl: jest.fn(),
    delete: jest.fn(),
  };
  const mockPrisma = {
    fileAsset: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: SupabaseStorageService, useValue: mockStorage },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(FileUploadService);
  });

  it('uploads, creates FileAsset, and returns a signed URL with default 24h TTL', async () => {
    mockStorage.upload.mockResolvedValue({
      bucketKey: 't1/contracts/abc.pdf',
      filename: 'abc.pdf',
    });
    mockPrisma.fileAsset.create.mockResolvedValue({});
    mockStorage.signedUrl.mockResolvedValue('https://sig/url');

    const buffer = Buffer.from('pdf-bytes');
    const result = await service.upload('t1', 'contracts', buffer, {
      mimeType: 'application/pdf',
      originalName: 'contrato.pdf',
    });

    expect(mockStorage.upload).toHaveBeenCalledWith('t1', 'contracts', buffer, {
      mimeType: 'application/pdf',
      originalName: 'contrato.pdf',
    });
    expect(mockPrisma.fileAsset.create).toHaveBeenCalledWith({
      data: {
        tenantId: 't1',
        filename: 'abc.pdf',
        bucketKey: 't1/contracts/abc.pdf',
        originalName: 'contrato.pdf',
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      },
    });
    expect(mockStorage.signedUrl).toHaveBeenCalledWith(
      't1/contracts/abc.pdf',
      24 * 60 * 60,
    );
    expect(result).toEqual({
      url: 'https://sig/url',
      filename: 'abc.pdf',
      bucketKey: 't1/contracts/abc.pdf',
    });
  });

  it('forwards a custom ttlSeconds to signedUrl', async () => {
    mockStorage.upload.mockResolvedValue({ bucketKey: 'k', filename: 'f' });
    mockPrisma.fileAsset.create.mockResolvedValue({});
    mockStorage.signedUrl.mockResolvedValue('x');

    await service.upload('t', 'quotations', Buffer.from('x'), {
      mimeType: 'application/pdf',
      originalName: 'q.pdf',
      ttlSeconds: 7 * 24 * 60 * 60,
    });

    expect(mockStorage.signedUrl).toHaveBeenCalledWith('k', 7 * 24 * 60 * 60);
  });

  it('rolls back the Supabase object when FileAsset.create fails', async () => {
    mockStorage.upload.mockResolvedValue({ bucketKey: 'k', filename: 'f' });
    mockPrisma.fileAsset.create.mockRejectedValue(new Error('DB constraint'));
    mockStorage.delete.mockResolvedValue(undefined);

    await expect(
      service.upload('t', 'contracts', Buffer.from('x'), {
        mimeType: 'application/pdf',
        originalName: 'q.pdf',
      }),
    ).rejects.toThrow('DB constraint');

    expect(mockStorage.delete).toHaveBeenCalledWith('k');
    expect(mockStorage.signedUrl).not.toHaveBeenCalled();
  });

  it('does not shadow the original error when rollback delete itself fails', async () => {
    mockStorage.upload.mockResolvedValue({ bucketKey: 'k', filename: 'f' });
    mockPrisma.fileAsset.create.mockRejectedValue(
      new Error('Original DB error'),
    );
    mockStorage.delete.mockRejectedValue(new Error('Rollback also failed'));

    await expect(
      service.upload('t', 'contracts', Buffer.from('x'), {
        mimeType: 'application/pdf',
        originalName: 'q.pdf',
      }),
    ).rejects.toThrow('Original DB error');
  });
});
