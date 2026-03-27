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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByRole(role, tenantId) {
        return this.prisma.user.findMany({
            where: {
                role,
                ...(tenantId && { tenantId })
            }
        });
    }
    async findAllByTenant(tenantId) {
        return this.prisma.user.findMany({
            where: { tenantId }
        });
    }
    async findAdmin(tenantId) {
        console.log(`[UsersService] Finding admin for tenant: ${tenantId}`);
        const admin = await this.prisma.user.findFirst({
            where: { tenantId, role: client_1.UserRole.ADMIN_TENANT }
        });
        if (!admin)
            console.warn(`[UsersService] NO ADMIN FOUND for tenant: ${tenantId}`);
        return admin;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map