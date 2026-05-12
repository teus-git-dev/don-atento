jest.mock('fs', () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(() => ({ pipe: jest.fn(), on: jest.fn() })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, StreamableFile } from '@nestjs/common';
import { existsSync, createReadStream } from 'fs';
import { FilesController } from './files.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import type { Request, Response } from 'express';

describe('FilesController', () => {
  let controller: FilesController;
  const mockPrisma = { fileAsset: { findUnique: jest.fn() } };
  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    signedUrl: jest.fn(),
    delete: jest.fn(),
  };

  const fakeReq = (tenantId = 't1'): Request =>
    ({ tenantId }) as unknown as Request;
  const fakeRes = (): Response => ({ set: jest.fn() }) as unknown as Response;

  const assetWithBucket = {
    id: 'a',
    tenantId: 't1',
    filename: 'abc.pdf',
    bucketKey: 't1/contracts/abc.pdf',
    originalName: 'contract.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    uploadedById: null,
    createdAt: new Date(),
  };
  const assetLegacy = { ...assetWithBucket, bucketKey: null };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SupabaseStorageService, useValue: mockStorage },
      ],
    }).compile();
    controller = module.get<FilesController>(FilesController);
  });

  // ── getFile ────────────────────────────────────────────────────────────────
  describe('getFile', () => {
    it('streams from Supabase when bucketKey is set', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(assetWithBucket);
      mockStorage.download.mockResolvedValue(Buffer.from('pdf-bytes'));

      const result = await controller.getFile(fakeReq(), 'abc.pdf', fakeRes());

      expect(mockStorage.download).toHaveBeenCalledWith('t1/contracts/abc.pdf');
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('falls back to disk when bucketKey is null', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(assetLegacy);
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await controller.getFile(fakeReq(), 'abc.pdf', fakeRes());

      expect(mockStorage.download).not.toHaveBeenCalled();
      expect(existsSync).toHaveBeenCalled();
      expect(createReadStream).toHaveBeenCalled();
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('rejects path traversal attempts', async () => {
      await expect(
        controller.getFile(fakeReq(), '../etc/passwd', fakeRes()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 404 when no FileAsset record exists', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(null);
      await expect(
        controller.getFile(fakeReq(), 'abc.pdf', fakeRes()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 404 when tenant does not match', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue({
        ...assetWithBucket,
        tenantId: 'otherTenant',
      });
      await expect(
        controller.getFile(fakeReq('t1'), 'abc.pdf', fakeRes()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 404 when Supabase download fails', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(assetWithBucket);
      mockStorage.download.mockRejectedValue(new Error('not in bucket'));
      await expect(
        controller.getFile(fakeReq(), 'abc.pdf', fakeRes()),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 404 when bucketKey null AND disk file missing', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(assetLegacy);
      (existsSync as jest.Mock).mockReturnValue(false);
      await expect(
        controller.getFile(fakeReq(), 'abc.pdf', fakeRes()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getSignedUrl ───────────────────────────────────────────────────────────
  describe('getSignedUrl', () => {
    it('returns signed URL and expiresAt for files with bucketKey', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(assetWithBucket);
      mockStorage.signedUrl.mockResolvedValue('https://sig/url');

      const result = await controller.getSignedUrl(fakeReq(), 'abc.pdf');

      expect(mockStorage.signedUrl).toHaveBeenCalledWith(
        't1/contracts/abc.pdf',
        24 * 60 * 60,
      );
      expect(result.url).toBe('https://sig/url');
      expect(typeof result.expiresAt).toBe('string');
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('returns 404 when bucketKey is null (legacy file)', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(assetLegacy);
      await expect(
        controller.getSignedUrl(fakeReq(), 'abc.pdf'),
      ).rejects.toThrow(NotFoundException);
      expect(mockStorage.signedUrl).not.toHaveBeenCalled();
    });

    it('returns 404 when no FileAsset record exists', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue(null);
      await expect(
        controller.getSignedUrl(fakeReq(), 'abc.pdf'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns 404 when tenant does not match', async () => {
      mockPrisma.fileAsset.findUnique.mockResolvedValue({
        ...assetWithBucket,
        tenantId: 'otherTenant',
      });
      await expect(
        controller.getSignedUrl(fakeReq('t1'), 'abc.pdf'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects path traversal in filename', async () => {
      await expect(
        controller.getSignedUrl(fakeReq(), '../etc/passwd'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
