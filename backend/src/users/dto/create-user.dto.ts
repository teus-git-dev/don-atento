import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /users`.
 *
 * `tenantId` is intentionally NOT in the DTO — the controller injects
 * it from `req['tenantId']` and `whitelist + forbidNonWhitelisted`
 * strips any body-supplied value.
 *
 * `password` is intentionally NOT in the DTO either — Block B retires
 * the body-supplied password path entirely. The service generates a
 * CSPRNG temp password + bcrypt(12) + mustChangePassword=true (same
 * pattern as OnboardingService.provisionNewTenant), and returns the
 * plaintext ONCE in the response for the admin to share via secure
 * channel.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'agente@inmobiliaria.co' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({
    description: 'Optional custom-role ID (Role.id) for fine-grained perms',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  roleId?: string;
}
