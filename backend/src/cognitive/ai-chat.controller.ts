import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AiChatService } from './ai-chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { AiChatDto } from './dto/ai-chat.dto';

@ApiTags('ai-chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async chat(@Req() req: Request, @Body() dto: AiChatDto) {
    // tenantId comes from the JWT (via TenantGuard), NEVER from the body —
    // closes the cross-tenant quota-drain + brain-read vector flagged in
    // the 2026-05-13 audit (CRÍTICO #1). userId likewise from the JWT.
    const tenantId = req.tenantId!;
    const userId = (req.user as { id: string } | undefined)?.id ?? 'unknown';
    return this.aiChatService.processChat(
      tenantId,
      userId,
      dto.message,
      dto.history ?? [],
    );
  }
}
