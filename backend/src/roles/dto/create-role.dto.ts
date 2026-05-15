import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /roles`.
 *
 * `tenantId` injected by controller (same pattern as the rest of the
 * project). `permissions` stays loosely typed (`Record<string,
 * unknown>`) because the per-tenant permission shape is heterogeneous;
 * a future refactor can define a closed schema per category.
 */
export class CreateRoleDto {
  @ApiProperty({ example: 'Gestor de Mantenimiento' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: 'Descripción libre (max 500 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Estructura JSON de permisos (max 16KB serializado)',
  })
  @IsObject()
  permissions!: Record<string, unknown>;
}
