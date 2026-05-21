import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for `PATCH /tickets/:id/resolve`.
 *
 * `userId` is intentionally NOT part of this DTO — the actor is read
 * server-side from `req.user.id` (downstream `transitionState` passes
 * `'SYSTEM'` for the resolved-state log).
 */
export class ResolveTicketDto {
  @ApiProperty({
    description: 'Free-form closure reason (max 2000 chars)',
    example: 'Plomería sellada y verificada con prueba de presión.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  closureReason!: string;

  @ApiPropertyOptional({
    description:
      'Optional client signature payload (data URL or signed hash). Max 64KB.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(65_536)
  signature?: string;
}
