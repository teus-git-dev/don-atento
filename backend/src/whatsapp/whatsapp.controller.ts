import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Response } from 'express';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    // Para simplificar, usamos un token fijo o guardado en .env
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'TEUS_COG_ROBOT_2024';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      return challenge;
    }
    return 'Verification failed';
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any) {
    // Registro de auditoría cognitiva: entrada de Meta
    console.log('Incoming WhatsApp Body:', JSON.stringify(body, null, 2));

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // Número del remitente
        const text = message.text?.body; // Contenido del mensaje

        if (text) {
          await this.whatsappService.processIncomingMessage(from, text);
        }
      }
      return 'EVENT_RECEIVED';
    } else {
      return 'NOT_A_WHATSAPP_EVENT';
    }
  }
}
