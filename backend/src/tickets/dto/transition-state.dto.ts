import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for `PATCH /tickets/:id/status`.
 *
 * `userId` is intentionally NOT part of this DTO — the actor is read
 * server-side from `req.user.id` to prevent identity spoofing.
 */
export class TransitionStateDto {
  @ApiProperty({
    description: 'Target workflow state ID (UUID)',
    example: 'state-uuid-123',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  newStateId!: string;
}
