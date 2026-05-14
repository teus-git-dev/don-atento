import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `PATCH /crm/tasks/:taskId`.
 *
 * Deliberately omits `prospectId` — the prior `data: any` flow let
 * callers reassign a task to a different prospect (which combined
 * with the absent tenant check moved tasks between tenants). The
 * whitelist enforces it.
 */
export class UpdateProspectTaskDto {
  @ApiPropertyOptional({ example: 'Llamar para agendar visita' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Detalle adicional (max 2000 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Fecha límite (ISO-8601)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Marcar tarea como completada' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
