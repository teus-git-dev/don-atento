import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { FileUploadService } from '../storage/file-upload.service';
import type { Request } from 'express';

describe('TicketsController', () => {
  let controller: TicketsController;

  const mockTicketsService = {};
  const mockFileUpload = { upload: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: FileUploadService, useValue: mockFileUpload },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    const fakeFile = (
      overrides: Partial<Express.Multer.File> = {},
    ): Express.Multer.File =>
      ({
        fieldname: 'file',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('img-bytes'),
        size: 9,
        ...overrides,
      }) as Express.Multer.File;

    const fakeReq = (tenantId = 't1'): Request =>
      ({ tenantId }) as unknown as Request;

    it('returns an error object when no file is uploaded', async () => {
      const result = await controller.uploadFile(
        undefined as unknown as Express.Multer.File,
        fakeReq(),
      );
      expect(result).toEqual({ error: 'No se subió ningún archivo' });
      expect(mockFileUpload.upload).not.toHaveBeenCalled();
    });

    it('delegates to FileUploadService with tickets category + 7d TTL', async () => {
      mockFileUpload.upload.mockResolvedValue({
        url: 'https://sig/url',
        filename: 'abc.jpg',
        bucketKey: 't1/tickets/abc.jpg',
      });

      const file = fakeFile();
      const result = await controller.uploadFile(file, fakeReq('t1'));

      expect(mockFileUpload.upload).toHaveBeenCalledWith(
        't1',
        'tickets',
        file.buffer,
        {
          mimeType: 'image/jpeg',
          originalName: 'photo.jpg',
          ttlSeconds: 7 * 24 * 60 * 60,
        },
      );
      expect(result).toEqual({
        url: 'https://sig/url',
        name: 'photo.jpg',
        filename: 'abc.jpg',
        type: 'image',
      });
    });

    it.each([
      ['video/mp4', 'video'],
      ['application/pdf', 'pdf'],
      ['application/msword', 'document'],
      [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'document',
      ],
      ['image/png', 'image'],
    ])(
      'classifies mimetype=%s as type="%s"',
      async (mimetype, expectedType) => {
        mockFileUpload.upload.mockResolvedValue({
          url: 'u',
          filename: 'f',
          bucketKey: 'k',
        });
        const result = await controller.uploadFile(
          fakeFile({ mimetype }),
          fakeReq(),
        );
        expect((result as { type: string }).type).toBe(expectedType);
      },
    );

    it('propagates errors from FileUploadService', async () => {
      mockFileUpload.upload.mockRejectedValue(new Error('storage down'));
      await expect(
        controller.uploadFile(fakeFile(), fakeReq()),
      ).rejects.toThrow('storage down');
    });
  });
});
