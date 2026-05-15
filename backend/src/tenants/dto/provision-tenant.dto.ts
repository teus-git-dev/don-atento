import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /tenants/provision`. Runtime-validated replacement
 * for the previous `ProvisionTenantInput` interface (which only
 * existed at TypeScript compile time and let the body pass without
 * runtime checks).
 */
export class ProvisionTenantDto {
  @ApiProperty({ example: 'Inmobiliaria Don Atento S.A.S' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName!: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  nit!: string;

  @ApiProperty({ example: 'admin@inmobiliaria.co' })
  @IsEmail()
  @MaxLength(255)
  adminEmail!: string;

  @ApiProperty({ example: 'Mariana' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  adminFirstName!: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  adminLastName!: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  adminPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  subscriptionPlanId?: string;
}
