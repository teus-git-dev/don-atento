import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiPropertyOptional({
    description:
      'Tenant ID common to the organization (Injected by controller)',
    example: 'uuid-tenant-123',
  })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({
    description: 'Internal or external property code (ID Inmueble)',
    example: 'INC-99',
    required: false,
  })
  @IsString()
  @IsOptional()
  propertyCode?: string;

  @ApiProperty({ enum: PropertyType, example: 'APARTMENT' })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiProperty({
    description: 'Property title or name',
    example: 'Apto 402 Torre B',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Full address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Department/State' })
  @IsString()
  department: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: 'VIP status for prioritized SLA' })
  @IsBoolean()
  @IsOptional()
  isVip?: boolean;

  @ApiPropertyOptional({ description: 'ID of a parent property for complexes' })
  @IsString()
  @IsOptional()
  parentPropertyId?: string;

  @ApiPropertyOptional({ description: 'Rental amount', example: 1500000 })
  @IsNumber()
  @IsOptional()
  rentAmount?: number;

  @ApiPropertyOptional({ description: 'Administration fee', example: 200000 })
  @IsNumber()
  @IsOptional()
  adminAmount?: number;

  @ApiPropertyOptional({ description: 'VAT amount', example: 285000 })
  @IsNumber()
  @IsOptional()
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Complex or Management Company name' })
  @IsString()
  @IsOptional()
  managementName?: string;

  @ApiPropertyOptional({ description: 'Management company NIT' })
  @IsString()
  @IsOptional()
  managementNit?: string;

  @ApiPropertyOptional({ description: 'Insurance company for the property' })
  @IsString()
  @IsOptional()
  insuranceCompany?: string;

  @ApiPropertyOptional({
    enum: ['AVAILABLE', 'RENTED', 'UNDER_MAINTENANCE', 'SOLD'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  status?: any;

  @ApiPropertyOptional({ description: 'Management company email' })
  @IsString()
  @IsOptional()
  managementEmail?: string;

  @ApiPropertyOptional({ description: 'Management company phone' })
  @IsString()
  @IsOptional()
  managementPhone?: string;

  @ApiPropertyOptional({ description: 'Inventory Template ID' })
  @IsString()
  @IsOptional()
  inventoryTemplateId?: string;

  @ApiPropertyOptional({ description: 'Workflow ID' })
  @IsString()
  @IsOptional()
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Gaussian Splat 3D URL' })
  @IsString()
  @IsOptional()
  splatUrl?: string;

  @ApiPropertyOptional({ description: 'Vision Video URL' })
  @IsOptional()
  visionVideoUrl?: any;

  @ApiPropertyOptional({ description: 'Vision AI Analysis Data' })
  @IsOptional()
  visionAnalysis?: any;

  @ApiPropertyOptional({ description: 'Uploaded files' })
  @IsArray()
  @IsOptional()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Owner Information Object' })
  @IsOptional()
  ownerInfo?: any;

  @ApiPropertyOptional({ description: 'Tenant Information Object (if rented)' })
  @IsOptional()
  tenantInfo?: any;

  @ApiPropertyOptional({ description: 'Added coordinates for the 3D viewer' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Added coordinates for the 3D viewer' })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
