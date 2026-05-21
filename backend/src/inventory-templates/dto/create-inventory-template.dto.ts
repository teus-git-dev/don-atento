import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryCategory, ZoneType, TemplateStatus } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

// ─── Nested DTOs ─────────────────────────────────────────────────────────────

export class CreateInventoryTemplateItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateInventoryTemplateZoneDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(ZoneType)
  type?: ZoneType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryTemplateItemDto)
  items?: CreateInventoryTemplateItemDto[];
}

// ─── Root DTOs ────────────────────────────────────────────────────────────────

export class CreateInventoryTemplateDto {
  /** Injected from JWT by the controller — must NOT be trusted from body. */
  tenantId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryTemplateZoneDto)
  zones?: CreateInventoryTemplateZoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryTemplateItemDto)
  items?: CreateInventoryTemplateItemDto[];
}

export class UpdateInventoryTemplateDto extends PartialType(
  CreateInventoryTemplateDto,
) {}
