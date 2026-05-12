import { Test, TestingModule } from '@nestjs/testing';
import { InventoryMasterController } from './inventory-master.controller';
import { InventoryMasterService } from './inventory-master.service';
import { FileUploadService } from '../storage/file-upload.service';
import type { Request } from 'express';

describe('InventoryMasterController', () => {
  let controller: InventoryMasterController;
  const mockService = {};
  const mockFileUpload = { upload: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryMasterController],
      providers: [
        { provide: InventoryMasterService, useValue: mockService },
        { provide: FileUploadService, useValue: mockFileUpload },
      ],
    }).compile();
    controller = module.get<InventoryMasterController>(
      InventoryMasterController,
    );
  });

  const fakeFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: 'evidence.mp4',
      encoding: '7bit',
      mimetype: 'video/mp4',
      buffer: Buffer.from('mp4-bytes'),
      size: 10,
      ...overrides,
    }) as Express.Multer.File;

  const fakeReq = (tenantId = 't1'): Request =>
    ({ tenantId }) as unknown as Request;

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('returns an error object when no file is uploaded', async () => {
      const result = await controller.uploadFile(
        undefined as unknown as Express.Multer.File,
        fakeReq(),
      );
      expect(result).toEqual({ error: 'No se subió ningún archivo' });
      expect(mockFileUpload.upload).not.toHaveBeenCalled();
    });

    it('delegates to FileUploadService with inventory category + 7d TTL', async () => {
      mockFileUpload.upload.mockResolvedValue({
        url: 'https://sig/url',
        filename: 'abc.mp4',
        bucketKey: 't1/inventory/abc.mp4',
      });

      const file = fakeFile();
      const result = await controller.uploadFile(file, fakeReq('t1'));

      expect(mockFileUpload.upload).toHaveBeenCalledWith(
        't1',
        'inventory',
        file.buffer,
        {
          mimeType: 'video/mp4',
          originalName: 'evidence.mp4',
          ttlSeconds: 7 * 24 * 60 * 60,
        },
      );
      expect(result).toEqual({
        url: 'https://sig/url',
        name: 'evidence.mp4',
        filename: 'abc.mp4',
      });
    });

    it('propagates errors from FileUploadService', async () => {
      mockFileUpload.upload.mockRejectedValue(new Error('storage down'));
      await expect(
        controller.uploadFile(fakeFile(), fakeReq()),
      ).rejects.toThrow('storage down');
    });
  });
});
