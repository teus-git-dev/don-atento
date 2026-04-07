import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Response } from 'express';
import { Public } from '../auth/public.decorator';

@Public() // WhatsApp webhook is called by Meta — no JWT available
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
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!verifyToken) {
      console.error('WHATSAPP_VERIFY_TOKEN not set in environment.');
      return 'Configuration Error';
    }

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      return challenge;
    }
    console.warn(`Webhook Verification failed. Mode: ${mode}, Token: ${token}`);
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
        const type = message.type;
        let mediaUrl = null;

        if (type === 'image' || type === 'video' || type === 'document') {
          // Nota de implementación: La URL real se obtiene mediante una llamada adicional a Meta con el media_id.
          // Por ahora simulamos la captura del ID para el flujo de Don Atento.
          mediaUrl = message[type]?.id || 'MEDIA_ID_PLACEHOLDER';
        }

        if (text || mediaUrl) {
          await this.whatsappService.processIncomingMessage(
            from,
            text || '',
            mediaUrl,
          );
        }
      }
      return 'EVENT_RECEIVED';
    } else {
      return 'NOT_A_WHATSAPP_EVENT';
    }
  }
}
