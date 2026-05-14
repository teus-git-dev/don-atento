import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

/**
 * Body for `POST /crm/prospects/:id/contract`.
 *
 * `formData` stays loosely typed because the contract intake form
 * carries heterogeneous fields per template (residential vs
 * commercial, fianza vs codeudor, etc.) and is meant to be displayed
 * back to the agent and the LLM rather than mutated by downstream
 * code. We DO require it to be an object (rejecting strings, arrays
 * and primitives) and `ValidationPipe` whitelist+forbidNonWhitelisted
 * still rejects any sibling fields the client tries to smuggle.
 *
 * Per-template shape validation is a future refactor (Phase E.2-ish
 * for CRM).
 */
export class StartContractDto {
  @ApiPropertyOptional({
    description:
      'Form payload (object only; per-template shape validated downstream)',
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}
