import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Tenant ID common to the organization',
    example: 'uuid-tenant-123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Internal or external property code (ID Inmueble)',
    example: 'INC-99',
    required: false,
  })
  propertyCode?: string;

  @ApiProperty({ enum: PropertyType, example: 'APARTMENT' })
  propertyType: PropertyType;

  @ApiProperty({
    description: 'Property title or name',
    example: 'Apto 402 Torre B',
  })
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  description?: string;

  @ApiProperty({ description: 'Full address' })
  address: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'Department/State' })
  department: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiPropertyOptional({ description: 'VIP status for prioritized SLA' })
  isVip?: boolean;

  @ApiPropertyOptional({ description: 'ID of a parent property for complexes' })
  parentPropertyId?: string;

  @ApiPropertyOptional({ description: 'Rental amount', example: 1500000 })
  rentAmount?: number;

  @ApiPropertyOptional({ description: 'Administration fee', example: 200000 })
  adminAmount?: number;

  @ApiPropertyOptional({ description: 'VAT amount', example: 285000 })
  taxAmount?: number;

  @ApiPropertyOptional({ description: 'Complex or Management Company name' })
  managementName?: string;

  @ApiPropertyOptional({ description: 'Management company NIT' })
  managementNit?: string;

  @ApiPropertyOptional({ description: 'Insurance company for the property' })
  insuranceCompany?: string;

  @ApiPropertyOptional({ description: 'Gaussian Splat 3D URL' })
  splatUrl?: string;

  @ApiPropertyOptional({ description: 'Owner Information Object' })
  ownerInfo?: any;

  @ApiPropertyOptional({ description: 'Tenant Information Object (if rented)' })
  tenantInfo?: any;

  @ApiPropertyOptional({ description: 'Added coordinates for the 3D viewer' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Added coordinates for the 3D viewer' })
  longitude?: number;
}
