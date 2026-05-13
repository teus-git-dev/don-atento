import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InventoryTemplatesController } from './inventory-templates.controller';
import { InventoryTemplatesService } from './inventory-templates.service';
import { FeatureDisabledGuard } from './feature-disabled.guard';
import type { Request } from 'express';

describe('InventoryTemplatesController', () => {
  let controller: InventoryTemplatesController;
  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    toggleStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryTemplatesController],
      providers: [{ provide: InventoryTemplatesService, useValue: mockService }],
    }).compile();
    controller = module.get<InventoryTemplatesController>(
      InventoryTemplatesController,
    );
  });

  const fakeReq = (tenantId = 't1'): Request =>
    ({ tenantId }) as unknown as Request;

  describe('read endpoints (v1 enabled)', () => {
    it('findAll forwards req.tenantId to the service', async () => {
      mockService.findAll.mockResolvedValue(['template-1']);
      const result = await controller.findAll(fakeReq('t1'));
      expect(mockService.findAll).toHaveBeenCalledWith('t1');
      expect(result).toEqual(['template-1']);
    });

    it('findOne scopes by both id and req.tenantId', async () => {
      mockService.findOne.mockResolvedValue({ id: 'tpl-1' });
      const result = await controller.findOne(fakeReq('t1'), 'tpl-1');
      expect(mockService.findOne).toHaveBeenCalledWith('tpl-1', 't1');
      expect(result).toEqual({ id: 'tpl-1' });
    });
  });

  describe('FeatureDisabledGuard (write endpoints)', () => {
    let guard: FeatureDisabledGuard;
    const fakeCtx = {} as ExecutionContext;

    beforeEach(() => {
      guard = new FeatureDisabledGuard();
    });

    it('throws ForbiddenException with the v2 message', () => {
      try {
        guard.canActivate(fakeCtx);
        fail('expected guard to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('v2');
      }
    });

    it('throws on every call (no caching, no exceptions)', () => {
      expect(() => guard.canActivate(fakeCtx)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(fakeCtx)).toThrow(ForbiddenException);
    });
  });
});
