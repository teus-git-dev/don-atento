import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';

@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async chat(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('message') message: string,
    @Body('history') history: any[],
  ) {
    if (!tenantId || !message) {
      return { error: 'tenantId and message are required' };
    }
    return this.aiChatService.processChat(tenantId, userId, message, history);
  }
}
