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
exports.CreateTicketDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateTicketDto {
    tenantId;
    propertyId;
    reportedByUserId;
    workflowId;
    title;
    description;
    priority;
    severity;
    reportedByUserPhone;
    assignedTechnicianId;
    attachments;
}
exports.CreateTicketDto = CreateTicketDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-tenant-123' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-property-456' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "propertyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-user-789' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "reportedByUserId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'uuid-workflow-000' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "workflowId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Fuga de agua en cocina' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Se evidencia goteo constante bajo el lavaplatos.' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TicketPriority, example: 'MEDIUM' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TicketSeverity, example: 'MEDIUM' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "severity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+573001234567' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "reportedByUserPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'uuid-tech-321' }),
    __metadata("design:type", String)
], CreateTicketDto.prototype, "assignedTechnicianId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['https://example.com/photo.jpg'] }),
    __metadata("design:type", Object)
], CreateTicketDto.prototype, "attachments", void 0);
//# sourceMappingURL=create-ticket.dto.js.map