import { ApiProperty } from '@nestjs/swagger';
import { ZoneType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

export class CreateZoneDto {
  @ApiProperty({ example: 'Cocina principal' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: ZoneType })
  @IsEnum(ZoneType)
  type!: ZoneType;

  @ApiProperty({ type: [CreateInventoryItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryItemDto)
  items!: CreateInventoryItemDto[];
}
