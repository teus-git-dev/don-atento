import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for `PATCH /tickets/:id/complete-task`.
 *
 * `userId` is intentionally NOT part of this DTO — the actor is read
 * server-side from `req.user.id` so the state-log attribution cannot
 * be spoofed by the caller.
 *
 * `attachments` stays loosely typed (`any[]`) by design — heterogeneous
 * payloads from vision pipelines and file-upload responses. The
 * service-layer hardens the URL when needed (Block E whitelist).
 */
export class CompleteTaskDto {
  @ApiProperty({
    description:
      'Free-form completion comment, or a JSON-encoded quote-items array (`[{...}]`) when the current state is "Cotización".',
    example: 'Reparación finalizada. Cliente verificó OK.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  comment!: string;

  @ApiPropertyOptional({
    description: 'Optional attachments (max 20).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  attachments?: any[];
}
