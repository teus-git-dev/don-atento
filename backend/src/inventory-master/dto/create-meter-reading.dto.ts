import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeterType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMeterReadingDto {
  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  type!: MeterType;

  @ApiProperty({ example: '1234.56' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  value!: string;

  @ApiPropertyOptional({ description: 'URL (HTTPS) de foto del medidor' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  photoUrl?: string;
}
