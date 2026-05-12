import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { Reflector } from '@nestjs/core';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflectorMock: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as any;
    guard = new TenantGuard(reflectorMock);
  });

  const makeContext = (
    user: any,
    query: any = {},
    body: any = {},
    params: any = {},
  ): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user, query, body, params }),
      }),
    } as any;
  };

  it('allows access if public decorator bypasses it', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    const context = makeContext(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access and skips tenant enforcement if no user is present (public route)', () => {
    const context = makeContext(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  describe('ADMIN_TENANT role', () => {
    it('passes if user has a tenantId and assigns it to req.tenantId', () => {
      const user = { role: 'ADMIN_TENANT', tenantId: 'tenant-1' };
      const req = makeContext(user).switchToHttp().getRequest();

      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(req['tenantId']).toBe('tenant-1');
      expect(req.query.tenantId).toBe('tenant-1');
    });

    it('throws Forbidden if user has no tenantId', () => {
      const user = { role: 'ADMIN_TENANT', tenantId: null };
      const context = makeContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('SUPERADMIN role', () => {
    it('passes if ?tenantId query param is provided, overriding user tenantId', () => {
      const user = { role: 'SUPERADMIN', tenantId: 'super-tenant' };
      const req = makeContext(user, { tenantId: 'target-tenant' })
        .switchToHttp()
        .getRequest();
      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(req['tenantId']).toBe('target-tenant');
    });

    it('uses user.tenantId if no query/param tenantId is provided', () => {
      const user = { role: 'SUPERADMIN', tenantId: 'super-tenant' };
      const req = makeContext(user).switchToHttp().getRequest();
      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
      expect(req['tenantId']).toBe('super-tenant');
    });
  });
});
