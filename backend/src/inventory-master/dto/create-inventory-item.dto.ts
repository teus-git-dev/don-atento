import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryCategory, InventoryCondition } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateEvidenceDto } from './create-evidence.dto';

export class CreateInventoryItemDto {
  @ApiProperty({ enum: InventoryCategory })
  @IsEnum(InventoryCategory)
  category!: InventoryCategory;

  @ApiProperty({ example: 'Nevera Mabe 250L' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    enum: InventoryCondition,
    description: 'Default GOOD si no se provee',
  })
  @IsOptional()
  @IsEnum(InventoryCondition)
  condition?: InventoryCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  material?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isFunctional?: boolean;

  @ApiPropertyOptional({
    description:
      'JSON con detalles técnicos heterogéneos (max 16KB serializado)',
  })
  @IsOptional()
  @IsObject()
  technicalDetails?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Vida útil esperada en meses' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1200)
  expectedLifespanMonths?: number;

  @ApiPropertyOptional({ type: [CreateEvidenceDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateEvidenceDto)
  evidences?: CreateEvidenceDto[];
}
