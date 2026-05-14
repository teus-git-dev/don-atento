import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProspectTaskDto {
  @ApiProperty({ example: 'Llamar para agendar visita' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Detalle adicional (max 2000 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Fecha límite. Acepta ISO-8601; debe ser futura.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;
}
