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
exports.WorkflowsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WorkflowsService = class WorkflowsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllByTenant(tenantId) {
        return this.prisma.workflow.findMany({
            where: { tenantId },
            include: {
                states: {
                    orderBy: { order: 'asc' },
                    include: { responsible: true },
                },
            },
        });
    }
    async create(data) {
        const { states, ...workflowData } = data;
        return this.prisma.workflow.create({
            data: {
                ...workflowData,
                states: states ? {
                    create: states.map((state, index) => ({
                        name: state.name,
                        order: state.order || index + 1,
                        slaHours: state.slaHours ? Number(state.slaHours) : null,
                        assignedRole: state.assignedRole,
                        assignedUserId: state.assignedUserId,
                        aiInstructions: state.aiInstructions,
                        color: state.color
                    }))
                } : undefined
            },
            include: {
                states: true
            }
        });
    }
    async createState(data) {
        return this.prisma.workflowState.create({
            data: {
                ...data,
                slaHours: data.slaHours ? Number(data.slaHours) : null,
            },
        });
    }
    async getInitialState(workflowId) {
        const firstState = await this.prisma.workflowState.findFirst({
            where: { workflowId },
            orderBy: { order: 'asc' },
        });
        return firstState;
    }
    async update(id, data) {
        return this.prisma.workflow.update({
            where: { id },
            data,
        });
    }
    async deleteStatesByWorkflow(workflowId) {
        return this.prisma.workflowState.deleteMany({
            where: { workflowId },
        });
    }
    async delete(id) {
        return this.prisma.workflow.delete({
            where: { id },
        });
    }
};
exports.WorkflowsService = WorkflowsService;
exports.WorkflowsService = WorkflowsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkflowsService);
//# sourceMappingURL=workflows.service.js.map