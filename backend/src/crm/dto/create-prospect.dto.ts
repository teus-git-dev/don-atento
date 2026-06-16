import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProspectSource } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /crm/prospects`. `tenantId` is injected by the
 * controller from the JWT and is intentionally NOT part of this DTO —
 * `whitelist: true` strips it if a client tries to send one, and the
 * controller spread overwrites with `req.tenantId!`.
 */
export class CreateProspectDto {
  @ApiProperty({ example: 'Camila' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

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

  @ApiPropertyOptional({ description: 'WhatsApp JID for unique mapping' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  whatsappId?: string;

  @ApiPropertyOptional({ enum: ProspectSource, default: ProspectSource.MANUAL })
  @IsOptional()
  @IsEnum(ProspectSource)
  source?: ProspectSource;

  @ApiPropertyOptional({
    description:
      'Optional assigned agent (User.id). If omitted, falls back to the Tenant default coordinator.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedAgentId?: string;

  @ApiPropertyOptional({
    description: 'Optional initial property interest set (max 50 ids)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  propertyIds?: string[];

  @ApiPropertyOptional({
    description:
      'Optional first message from the prospect (drives sentiment scoring)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  initialMessage?: string;
}
