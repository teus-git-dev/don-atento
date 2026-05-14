import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProspectStatus, SentimentAnalysis } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `PATCH /crm/prospects/:id`.
 *
 * Critically does NOT expose `tenantId` — that field is the tenancy
 * boundary and must never be writable from the body (Block A added an
 * `updateMany({ where: { id, tenantId } })` guard at the service
 * layer; this DTO is the second line of defense — whitelist + forbid
 * non-whitelisted at the pipe rejects any unknown field including
 * `tenantId`).
 *
 * It also does NOT expose `whatsappId` (the column is `@unique` and a
 * client-supplied value could collide with another prospect's
 * mapping). Setting whatsappId is a separate admin-only flow.
 */
export class UpdateProspectDto {
  @ApiPropertyOptional({ example: 'Camila' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rodríguez' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional({ example: 'camila@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ enum: ProspectStatus })
  @IsOptional()
  @IsEnum(ProspectStatus)
  status?: ProspectStatus;

  @ApiPropertyOptional({ enum: SentimentAnalysis })
  @IsOptional()
  @IsEnum(SentimentAnalysis)
  sentiment?: SentimentAnalysis;

  @ApiPropertyOptional({ description: 'Reassign to another agent (User.id)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedAgentId?: string;
}
