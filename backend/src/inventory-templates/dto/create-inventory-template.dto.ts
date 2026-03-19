import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryCategory } from '@prisma/client';

class CreateInventoryTemplateItemDto {
  @IsString()
  name: string;

  @IsString()
  category: InventoryCategory;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateInventoryTemplateDto {
  @IsString()
  tenantId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryTemplateItemDto)
  items: CreateInventoryTemplateItemDto[];
}
