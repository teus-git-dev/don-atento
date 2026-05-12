import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { LegalAiService } from '../cognitive/legal-ai.service';
import { FileUploadService } from '../storage/file-upload.service';
import type { Request } from 'express';

describe('CrmController', () => {
  let controller: CrmController;
  const mockFileUpload = { upload: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [
        { provide: CrmService, useValue: {} },
        { provide: LegalAiService, useValue: {} },
        { provide: FileUploadService, useValue: mockFileUpload },
      ],
    }).compile();
    controller = module.get<CrmController>(CrmController);
  });

  const fakeFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: 'contrato.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('pdf-bytes'),
      size: 9,
      ...overrides,
    }) as Express.Multer.File;

  const fakeReq = (tenantId = 't1'): Request =>
    ({ tenantId }) as unknown as Request;

  describe('uploadFile', () => {
    it('returns an error object when no file is uploaded', async () => {
      const result = await controller.uploadFile(
        undefined as unknown as Express.Multer.File,
        fakeReq(),
      );
      expect(result).toEqual({ error: 'No se subió ningún archivo' });
      expect(mockFileUpload.upload).not.toHaveBeenCalled();
    });

    it('delegates to FileUploadService with contracts category + 7d TTL', async () => {
      mockFileUpload.upload.mockResolvedValue({
        url: 'https://sig/url',
        filename: 'abc.pdf',
        bucketKey: 't1/contracts/abc.pdf',
      });

      const file = fakeFile();
      const result = await controller.uploadFile(file, fakeReq('t1'));

      expect(mockFileUpload.upload).toHaveBeenCalledWith(
        't1',
        'contracts',
        file.buffer,
        {
          mimeType: 'application/pdf',
          originalName: 'contrato.pdf',
          ttlSeconds: 7 * 24 * 60 * 60,
        },
      );
      expect(result).toEqual({
        url: 'https://sig/url',
        name: 'contrato.pdf',
        filename: 'abc.pdf',
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
