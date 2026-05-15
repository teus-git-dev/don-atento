import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderSpecialty } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProviderAdditionalContactDto } from './provider-additional-contact.dto';

/**
 * Body for `POST /providers`.
 *
 * `tenantId` is intentionally NOT in the DTO — the controller injects
 * it from `req['tenantId']` and the global pipe strips any
 * body-supplied value. Same defense applies to `id` and `createdAt`
 * / `updatedAt`.
 */
export class CreateProviderDto {
  @ApiProperty({ example: 'Plomería Hernández S.A.S' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nit?: string;

  @ApiPropertyOptional({ example: 'contacto@plomeria.co' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ enum: ProviderSpecialty })
  @IsEnum(ProviderSpecialty)
  specialty!: ProviderSpecialty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'URL HTTPS de foto' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Número ARL' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  legalArl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  legalSst?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  legalPolicyNumber?: string;

  @ApiPropertyOptional({ type: [ProviderAdditionalContactDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProviderAdditionalContactDto)
  additionalContacts?: ProviderAdditionalContactDto[];
}
