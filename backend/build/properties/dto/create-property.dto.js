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
exports.CreatePropertyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreatePropertyDto {
    tenantId;
    propertyCode;
    propertyType;
    title;
    description;
    address;
    city;
    department;
    country;
    isVip;
    parentPropertyId;
    rentAmount;
    adminAmount;
    taxAmount;
    managementName;
    managementNit;
    insuranceCompany;
    splatUrl;
    ownerInfo;
    tenantInfo;
    latitude;
    longitude;
}
exports.CreatePropertyDto = CreatePropertyDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tenant ID common to the organization',
        example: 'uuid-tenant-123',
    }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "tenantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Internal or external property code (ID Inmueble)',
        example: 'INC-99',
        required: false,
    }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "propertyCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.PropertyType, example: 'APARTMENT' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "propertyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Property title or name',
        example: 'Apto 402 Torre B',
    }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Detailed description' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Full address' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Department/State' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VIP status for prioritized SLA' }),
    __metadata("design:type", Boolean)
], CreatePropertyDto.prototype, "isVip", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ID of a parent property for complexes' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "parentPropertyId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Rental amount', example: 1500000 }),
    __metadata("design:type", Number)
], CreatePropertyDto.prototype, "rentAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Administration fee', example: 200000 }),
    __metadata("design:type", Number)
], CreatePropertyDto.prototype, "adminAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VAT amount', example: 285000 }),
    __metadata("design:type", Number)
], CreatePropertyDto.prototype, "taxAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Complex or Management Company name' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "managementName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Management company NIT' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "managementNit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Insurance company for the property' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "insuranceCompany", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Gaussian Splat 3D URL' }),
    __metadata("design:type", String)
], CreatePropertyDto.prototype, "splatUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Owner Information Object' }),
    __metadata("design:type", Object)
], CreatePropertyDto.prototype, "ownerInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tenant Information Object (if rented)' }),
    __metadata("design:type", Object)
], CreatePropertyDto.prototype, "tenantInfo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Added coordinates for the 3D viewer' }),
    __metadata("design:type", Number)
], CreatePropertyDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Added coordinates for the 3D viewer' }),
    __metadata("design:type", Number)
], CreatePropertyDto.prototype, "longitude", void 0);
//# sourceMappingURL=create-property.dto.js.map