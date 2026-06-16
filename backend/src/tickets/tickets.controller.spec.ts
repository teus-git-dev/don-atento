import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { SurveyTokenService } from './survey-token.service';
import { FileUploadService } from '../storage/file-upload.service';
import type { Request } from 'express';

describe('TicketsController', () => {
  let controller: TicketsController;

  const mockTicketsService = {
    findAllByTenant: jest.fn(),
    findAllByOwner: jest.fn(),
    findAllByTechnician: jest.fn(),
  };
  const mockFileUpload = { upload: jest.fn() };
  const mockSurveyToken = {
    generate: jest.fn().mockReturnValue('deadbeefdeadbeef'),
    verify: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: FileUploadService, useValue: mockFileUpload },
        { provide: SurveyTokenService, useValue: mockSurveyToken },
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

  // ── P0.3 dual-shape pagination ───────────────────────────────────────────
  //
  // Phase 1 contract: presence of `?page=` OR `?limit=` switches the
  // controller from legacy array shape (passing no opts to the service)
  // to paginated shape (passing { page, limit }). Tests verify the
  // routing + the page/limit parsing — the actual shape comes back from
  // the service which is mocked here. Phase 2 will remove the legacy
  // branch and these tests update accordingly.

  describe('findAll (P0.3 dual-shape)', () => {
    const fakeReq = (tenantId = 't1') =>
      ({ tenantId }) as unknown as Parameters<typeof controller.findAll>[0];

    it('legacy: no params → calls findAllByTenant(tenantId) without opts', async () => {
      mockTicketsService.findAllByTenant.mockResolvedValue([]);
      await controller.findAll(fakeReq('t1'));
      expect(mockTicketsService.findAllByTenant).toHaveBeenCalledWith('t1', undefined, undefined);
      expect(mockTicketsService.findAllByOwner).not.toHaveBeenCalled();
    });

    it('legacy: with ownerId → calls findAllByOwner without opts', async () => {
      mockTicketsService.findAllByOwner.mockResolvedValue([]);
      await controller.findAll(fakeReq('t1'), 'owner-7');
      expect(mockTicketsService.findAllByOwner).toHaveBeenCalledWith(
        'owner-7',
        't1',
        undefined,
        undefined,
      );
      expect(mockTicketsService.findAllByTenant).not.toHaveBeenCalled();
    });

    it('paginated: ?page=1 → calls findAllByTenant with { page: 1, limit: 20 }', async () => {
      mockTicketsService.findAllByTenant.mockResolvedValue({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
      });
      await controller.findAll(fakeReq('t1'), undefined, '1');
      expect(mockTicketsService.findAllByTenant).toHaveBeenCalledWith('t1', {
        page: 1,
        limit: 20,
      }, undefined);
    });

    it('paginated: ?limit=50 → calls findAllByTenant with { page: 1, limit: 50 }', async () => {
      mockTicketsService.findAllByTenant.mockResolvedValue({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
      });
      await controller.findAll(fakeReq('t1'), undefined, undefined, '50');
      expect(mockTicketsService.findAllByTenant).toHaveBeenCalledWith('t1', {
        page: 1,
        limit: 50,
      }, undefined);
    });

    it('paginated: ?limit=200 → caps limit at 100', async () => {
      mockTicketsService.findAllByTenant.mockResolvedValue({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
      });
      await controller.findAll(fakeReq('t1'), undefined, '1', '200');
      expect(mockTicketsService.findAllByTenant).toHaveBeenCalledWith('t1', {
        page: 1,
        limit: 100,
      }, undefined);
    });

    it('paginated: ?limit=0 → coerces to default 20', async () => {
      mockTicketsService.findAllByTenant.mockResolvedValue({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
      });
      await controller.findAll(fakeReq('t1'), undefined, '1', '0');
      expect(mockTicketsService.findAllByTenant).toHaveBeenCalledWith('t1', {
        page: 1,
        limit: 20,
      }, undefined);
    });

    it('paginated: ?ownerId + ?page + ?limit → calls findAllByOwner with opts', async () => {
      mockTicketsService.findAllByOwner.mockResolvedValue({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 2,
      });
      await controller.findAll(fakeReq('t1'), 'owner-7', '2', '10');
      expect(mockTicketsService.findAllByOwner).toHaveBeenCalledWith(
        'owner-7',
        't1',
        { page: 2, limit: 10 },
        undefined,
      );
    });
  });

  describe('findByTechnician (P0.3 dual-shape)', () => {
    const fakeReq = (tenantId = 't1') =>
      ({
        tenantId,
      }) as unknown as Parameters<typeof controller.findByTechnician>[0];

    it('legacy: no params → calls findAllByTechnician without opts', async () => {
      mockTicketsService.findAllByTechnician.mockResolvedValue([]);
      await controller.findByTechnician(fakeReq('t1'), 'tech-1');
      expect(mockTicketsService.findAllByTechnician).toHaveBeenCalledWith(
        'tech-1',
        't1',
        undefined,
        undefined,
      );
    });

    it('paginated: ?page=3&limit=5 → calls findAllByTechnician with opts', async () => {
      mockTicketsService.findAllByTechnician.mockResolvedValue({
        data: [],
        totalRecords: 0,
        totalPages: 0,
        currentPage: 3,
      });
      await controller.findByTechnician(fakeReq('t1'), 'tech-1', '3', '5');
      expect(mockTicketsService.findAllByTechnician).toHaveBeenCalledWith(
        'tech-1',
        't1',
        { page: 3, limit: 5 },
        undefined,
      );
    });
  });
});
