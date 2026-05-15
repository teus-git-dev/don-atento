import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePropertyAccessItemDto {
  @ApiProperty({ enum: AccessType })
  @IsEnum(AccessType)
  type!: AccessType;

  @ApiProperty({ example: 'Llave de la puerta principal' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiPropertyOptional({ description: 'URL (HTTPS) de foto' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  photoUrl?: string;
}
