import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyStatus, PropertyType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiPropertyOptional({
    description:
      'Tenant ID common to the organization (Injected by controller; ignored if supplied)',
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
  @MinLength(1)
  @MaxLength(64)
  propertyCode?: string;

  @ApiProperty({ enum: PropertyType, example: 'APARTMENT' })
  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @ApiProperty({
    description: 'Property title or name',
    example: 'Apto 402 Torre B',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ description: 'Full address' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address!: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @ApiProperty({ description: 'Department/State' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  department!: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  country!: string;

  @ApiPropertyOptional({ description: 'VIP status for prioritized SLA' })
  @IsBoolean()
  @IsOptional()
  isVip?: boolean;

  @ApiPropertyOptional({ description: 'ID of a parent property for complexes' })
  @IsString()
  @IsOptional()
  parentPropertyId?: string;

  @ApiPropertyOptional({ description: 'Area in square meters', example: 80 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1_000_000)
  areaM2?: number;

  @ApiPropertyOptional({ description: 'Number of rooms', example: 3 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(999)
  rooms?: number;

  @ApiPropertyOptional({ description: 'Number of bathrooms', example: 2 })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(999)
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'Rental amount', example: 1500000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rentAmount?: number;

  @ApiPropertyOptional({ description: 'Administration fee', example: 200000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  adminAmount?: number;

  @ApiPropertyOptional({ description: 'VAT amount', example: 285000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Complex or Management Company name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  managementName?: string;

  @ApiPropertyOptional({ description: 'Management company NIT' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  managementNit?: string;

  @ApiPropertyOptional({ description: 'Insurance company for the property' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  insuranceCompany?: string;

  @ApiPropertyOptional({
    enum: PropertyStatus,
    example: 'AVAILABLE',
  })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @ApiPropertyOptional({ description: 'Management company email' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  managementEmail?: string;

  @ApiPropertyOptional({ description: 'Management company phone' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
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
  @MaxLength(1024)
  splatUrl?: string;

  // visionVideoUrl, visionAnalysis, attachments, ownerInfo, tenantInfo are
  // loosely typed by design — they accept JSON payloads from
  // heterogeneous sources (vision pipelines, file upload responses, bulk
  // CSV imports). Nested DTOs are a future refactor; for now we accept
  // them as opaque blobs with shape constraints at the service layer.
  @ApiPropertyOptional({ description: 'Vision Video URL or metadata blob' })
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

  @ApiPropertyOptional({ description: 'Latitude (decimal degrees)' })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude (decimal degrees)' })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
