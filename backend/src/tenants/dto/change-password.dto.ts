import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `PATCH /tenants/change-password`. Strength validation
 * (uppercase / lowercase / digit / symbol) lives in
 * `OnboardingService.validatePasswordStrength` and runs server-side
 * AFTER the DTO check. The DTO enforces the minimum-12 length up
 * front so obviously short payloads don't reach the bcrypt hashing
 * stage.
 */
export class ChangePasswordDto {
  @ApiProperty({
    description:
      'Nueva contraseña (mínimo 12 chars, debe incluir mayúscula, minúscula, número y símbolo)',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;

  @ApiProperty({ description: 'Confirmación' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  confirmPassword!: string;
}
