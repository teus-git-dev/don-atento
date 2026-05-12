import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

const makeProperty = (overrides = {}) => ({
  id: 'prop-1',
  tenantId: 'tenant-1',
  title: 'Apto 101',
  propertyType: 'APARTMENT',
  address: 'Calle 123',
  isActive: true,
  propertyCode: 'P-123',
  ...overrides,
});

// `any` return type is required because makePrismaMock is recursively
// referenced from $transaction's callback below — TS can't infer otherwise.
const makePrismaMock = (): any => ({
  property: {
    create: jest.fn().mockResolvedValue(makeProperty()),
    findMany: jest.fn().mockResolvedValue([makeProperty()]),
    count: jest.fn().mockResolvedValue(1),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findFirst: jest.fn().mockResolvedValue(makeProperty()),
  },
  user: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'user-1' }),
    update: jest.fn().mockResolvedValue({ id: 'user-1' }),
  },
  propertyRelation: {
    create: jest.fn().mockResolvedValue({ id: 'rel-1' }),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ id: 'rel-1' }),
  },
  inventoryTemplate: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
    return cb(makePrismaMock());
  }),
});

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = makePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create()', () => {
    it('creates property, owner, and relations inside $transaction', async () => {
      const data = {
        tenantId: 'tenant-1',
        title: 'Apto 101',
        propertyType: 'APARTMENT',
        ownerInfo: { name: 'Owner Test', email: 'owner@test.com' },
      };

      const txMock = {
        property: { create: jest.fn().mockResolvedValue(makeProperty()) },
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'user-2' }),
        },
        propertyRelation: { create: jest.fn().mockResolvedValue({}) },
        inventoryTemplate: { findUnique: jest.fn().mockResolvedValue(null) },
      };

      prismaMock.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(txMock),
      );

      const result = await service.create(data);

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(txMock.property.create).toHaveBeenCalled();
      expect(txMock.user.create).toHaveBeenCalled();
      expect(txMock.propertyRelation.create).toHaveBeenCalled();
      expect(result.id).toBe('prop-1');
    });

    it('rolls back (throws error) if transaction fails', async () => {
      prismaMock.$transaction.mockRejectedValue(new Error('DB Error'));

      await expect(service.create({ tenantId: 't1' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllByTenant()', () => {
    it('applies pagination correctly (skip, take)', async () => {
      await service.findAllByTenant('tenant-1', 2, 5);

      expect(prismaMock.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          skip: 5,
          take: 5,
        }),
      );
      expect(prismaMock.property.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
    });
  });

  describe('update()', () => {
    it('updates only the provided fields on the property', async () => {
      await service.update('prop-1', 'tenant-1', {
        title: 'New Title',
        bathrooms: 2,
      });

      expect(prismaMock.property.updateMany).toHaveBeenCalledWith({
        where: { id: 'prop-1', tenantId: 'tenant-1' },
        data: expect.objectContaining({ title: 'New Title', bathrooms: 2 }),
      });
    });
  });

  describe('updateStatus()', () => {
    it('activates or deactivates the property', async () => {
      await service.updateStatus('prop-1', 'tenant-1', false);

      expect(prismaMock.property.updateMany).toHaveBeenCalledWith({
        where: { id: 'prop-1', tenantId: 'tenant-1' },
        data: { isActive: false },
      });
    });
  });

  describe('findByPropertyCode()', () => {
    it('queries property by external propertyCode', async () => {
      await service.findByPropertyCode('tenant-1', 'EXT-999');

      expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', propertyCode: 'EXT-999' },
        }),
      );
    });
  });
});
