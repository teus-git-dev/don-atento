import { Test, TestingModule } from '@nestjs/testing';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_BUCKET,
  SUPABASE_CLIENT,
  SupabaseStorageService,
} from './supabase-storage.service';

interface BucketApiMock {
  upload: jest.Mock;
  download: jest.Mock;
  createSignedUrl: jest.Mock;
  remove: jest.Mock;
}

interface ClientMock {
  storage: { from: jest.Mock };
}

const makeClientMock = (): { bucketApi: BucketApiMock; client: ClientMock } => {
  const bucketApi: BucketApiMock = {
    upload: jest.fn().mockResolvedValue({ data: { path: 'ok' }, error: null }),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    bucketApi,
    client: {
      storage: {
        from: jest.fn().mockReturnValue(bucketApi),
      },
    },
  };
};

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;
  let mock: ReturnType<typeof makeClientMock>;
  const BUCKET = 'atento-media';

  beforeEach(async () => {
    mock = makeClientMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseStorageService,
        {
          provide: SUPABASE_CLIENT,
          useValue: mock.client as unknown as SupabaseClient,
        },
        { provide: SUPABASE_BUCKET, useValue: BUCKET },
      ],
    }).compile();

    service = module.get(SupabaseStorageService);
  });

  // ── upload() ───────────────────────────────────────────────────────────────

  describe('upload()', () => {
    it('builds key as <tenantId>/<category>/<random>.<ext> and returns it', async () => {
      const result = await service.upload(
        'tenant-1',
        'tickets',
        Buffer.from('hello'),
        { mimeType: 'image/png', originalName: 'photo.PNG' },
      );

      expect(result.bucketKey).toMatch(
        /^tenant-1\/tickets\/[0-9a-f]{32}\.png$/,
      );
      expect(result.filename).toMatch(/^[0-9a-f]{32}\.png$/);
      expect(mock.client.storage.from).toHaveBeenCalledWith(BUCKET);
    });

    it('forwards contentType and forbids upsert', async () => {
      await service.upload('t', 'contracts', Buffer.from('x'), {
        mimeType: 'application/pdf',
        originalName: 'doc.pdf',
      });

      expect(mock.bucketApi.upload).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Buffer),
        { contentType: 'application/pdf', upsert: false },
      );
    });

    it('lowercases the extension regardless of original casing', async () => {
      const result = await service.upload('t', 'tickets', Buffer.from('x'), {
        mimeType: 'application/pdf',
        originalName: 'INVOICE.PDF',
      });
      expect(result.filename.endsWith('.pdf')).toBe(true);
    });

    it('generates unique keys across calls', async () => {
      const a = await service.upload('t', 'tickets', Buffer.from('x'), {
        mimeType: 'image/png',
        originalName: 'a.png',
      });
      const b = await service.upload('t', 'tickets', Buffer.from('x'), {
        mimeType: 'image/png',
        originalName: 'b.png',
      });
      expect(a.bucketKey).not.toBe(b.bucketKey);
    });

    it('throws when supabase returns an error', async () => {
      mock.bucketApi.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'quota exceeded' },
      });

      await expect(
        service.upload('t', 'tickets', Buffer.from('x'), {
          mimeType: 'image/png',
          originalName: 'a.png',
        }),
      ).rejects.toThrow(/quota exceeded/);
    });

    it('throws when tenantId is empty', async () => {
      await expect(
        service.upload('', 'tickets', Buffer.from('x'), {
          mimeType: 'image/png',
          originalName: 'a.png',
        }),
      ).rejects.toThrow(/tenantId is required/);
    });
  });

  // ── download() ─────────────────────────────────────────────────────────────

  describe('download()', () => {
    it('returns a Buffer of the object contents', async () => {
      const payload = Buffer.from('file-contents');
      mock.bucketApi.download.mockResolvedValueOnce({
        data: {
          arrayBuffer: () =>
            Promise.resolve(
              payload.buffer.slice(
                payload.byteOffset,
                payload.byteOffset + payload.byteLength,
              ),
            ),
        },
        error: null,
      });

      const result = await service.download('t/tickets/abc.png');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('file-contents');
    });

    it('throws when supabase returns an error', async () => {
      mock.bucketApi.download.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });
      await expect(service.download('missing')).rejects.toThrow(/not found/);
    });
  });

  // ── signedUrl() ────────────────────────────────────────────────────────────

  describe('signedUrl()', () => {
    it('returns the signed URL string', async () => {
      mock.bucketApi.createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'https://example/signed?token=abc' },
        error: null,
      });

      const url = await service.signedUrl('t/tickets/abc.png');
      expect(url).toBe('https://example/signed?token=abc');
    });

    it('defaults TTL to 86400 (24h) and forwards an explicit TTL', async () => {
      mock.bucketApi.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'x' },
        error: null,
      });

      await service.signedUrl('k');
      expect(mock.bucketApi.createSignedUrl).toHaveBeenLastCalledWith(
        'k',
        86_400,
      );

      await service.signedUrl('k', 600);
      expect(mock.bucketApi.createSignedUrl).toHaveBeenLastCalledWith('k', 600);
    });

    it('throws when supabase returns an error', async () => {
      mock.bucketApi.createSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'bad key' },
      });
      await expect(service.signedUrl('k')).rejects.toThrow(/bad key/);
    });
  });

  // ── delete() ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('forwards the key as a single-element array to remove()', async () => {
      await service.delete('t/tickets/abc.png');
      expect(mock.bucketApi.remove).toHaveBeenCalledWith(['t/tickets/abc.png']);
    });

    it('throws when supabase returns an error', async () => {
      mock.bucketApi.remove.mockResolvedValueOnce({
        data: null,
        error: { message: 'forbidden' },
      });
      await expect(service.delete('k')).rejects.toThrow(/forbidden/);
    });
  });
});
