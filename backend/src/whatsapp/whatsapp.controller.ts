import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Request } from 'express';
import { Public } from '../auth/public.decorator';
import * as crypto from 'crypto';

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
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!verifyToken || !token) {
      console.error('WHATSAPP_VERIFY_TOKEN not set or token missing.');
      return 'Configuration Error';
    }

    let isValid = false;
    try {
      const tokenBuffer = Buffer.from(token);
      const verifyTokenBuffer = Buffer.from(verifyToken);
      if (tokenBuffer.length === verifyTokenBuffer.length) {
        isValid = crypto.timingSafeEqual(tokenBuffer, verifyTokenBuffer);
      }
    } catch(e) {
       isValid = false;
    }

    if (mode === 'subscribe' && isValid) {
      console.log('WEBHOOK_VERIFIED');
      return challenge;
    }
    console.warn(`Webhook Verification failed. Mode: ${mode}, Token: ${token}`);
    return 'Verification failed';
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: any, // RawBodyRequest
  ) {
    // Validate Meta Webhook Signature
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret && signature && req.rawBody) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(req.rawBody)
        .digest('hex');
      
      try {
        const expectedBuffer = Buffer.from(expectedSignature);
        const signatureBuffer = Buffer.from(signature);
        if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
          throw new UnauthorizedException('Invalid signature');
        }
      } catch (e) {
        throw new UnauthorizedException('Invalid signature format');
      }
    }

    // Registro de auditoría cognitiva: entrada de Meta (Sanitized to avoid logging full payload in prod if needed, but keeping for now per requirements or we can drop it. Let's remove the console.log of the full body to comply with the audit.)

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const phoneNumberId =
          body.entry[0].changes[0].value.metadata?.phone_number_id;
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
            phoneNumberId,
          );
        }
      }
      return 'EVENT_RECEIVED';
    } else {
      return 'NOT_A_WHATSAPP_EVENT';
    }
  }
}
