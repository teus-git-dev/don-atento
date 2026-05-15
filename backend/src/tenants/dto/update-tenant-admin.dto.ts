import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTenantAdminDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  adminFirstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  adminLastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  adminPhone?: string;

  @ApiProperty({ description: 'Si cambia, dispara nuevo welcome email' })
  @IsEmail()
  @MaxLength(255)
  adminEmail!: string;
}
