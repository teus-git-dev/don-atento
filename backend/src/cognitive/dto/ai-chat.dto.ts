import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * History item from the frontend chat widget. The role values include both the
 * canonical LLM roles (`'user'`, `'assistant'`) and the legacy Spanish ones
 * (`'usuario'`, `'ia'`) emitted by the current frontend implementation. The
 * service normalizes them to the canonical LLM pair before sending to OpenAI.
 *
 * Anything else (e.g., `'system'`, `'override'`) is rejected at the DTO layer
 * to prevent prompt-injection via fabricated assistant turns.
 */
export class ChatHistoryItemDto {
  @IsString()
  @IsIn(['user', 'assistant', 'usuario', 'ia'])
  role!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class AiChatDto {
  // tenantId and userId may arrive in the body for backwards compatibility
  // with the current frontend (chatService.ts). They are IGNORED by the
  // handler — the real tenantId comes from TenantGuard (req.tenantId) and
  // userId from the JWT (req.user.id). Declared here so the global
  // ValidationPipe (whitelist + forbidNonWhitelisted) doesn't reject the
  // request.
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
