import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateZoneDto } from './create-zone.dto';
import { CreateMeterReadingDto } from './create-meter-reading.dto';
import { CreatePropertyAccessItemDto } from './create-property-access-item.dto';

/**
 * Body for `POST /inventory-master/property/:propertyId`.
 *
 * `propertyId` viene del path (no del body). `tenantId` se inyecta
 * desde el JWT en el controller — whitelist+forbidNonWhitelisted
 * rechaza cualquier intento de smuggle vía el body.
 */
export class CreatePropertyInventoryDto {
  @ApiProperty({
    type: [CreateZoneDto],
    description: 'Zonas del inmueble con sus items (mínimo 1, máximo 50)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateZoneDto)
  zones!: CreateZoneDto[];

  @ApiPropertyOptional({ type: [CreateMeterReadingDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateMeterReadingDto)
  meterReadings?: CreateMeterReadingDto[];

  @ApiPropertyOptional({ type: [CreatePropertyAccessItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyAccessItemDto)
  accessItems?: CreatePropertyAccessItemDto[];
}
