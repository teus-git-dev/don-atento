"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvidersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProvidersService = class ProvidersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.provider.findMany({
            where: { tenantId },
            include: {
                technicians: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        photoUrl: true,
                    },
                },
                additionalContacts: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id) {
        return this.prisma.provider.findUnique({
            where: { id },
            include: {
                technicians: true,
                additionalContacts: true,
            },
        });
    }
    async create(tenantId, data) {
        const { additionalContacts, ...providerData } = data;
        return this.prisma.provider.create({
            data: {
                ...providerData,
                tenantId,
                additionalContacts: additionalContacts ? {
                    create: additionalContacts
                } : undefined
            },
            include: { additionalContacts: true }
        });
    }
    async update(id, data) {
        return this.prisma.provider.update({
            where: { id },
            data,
        });
    }
    async remove(id) {
        return this.prisma.provider.delete({
            where: { id },
        });
    }
    async assignTechnician(providerId, userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { providerId },
        });
    }
};
exports.ProvidersService = ProvidersService;
exports.ProvidersService = ProvidersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProvidersService);
//# sourceMappingURL=providers.service.js.map