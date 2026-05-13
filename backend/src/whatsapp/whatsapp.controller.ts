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
  InternalServerErrorException,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import type { MetaWebhookBody } from './dto/meta-webhook.dto';
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

    // Fail-closed: server misconfiguration is a 500, never a silent 200.
    if (!verifyToken) {
      throw new InternalServerErrorException(
        'WHATSAPP_VERIFY_TOKEN not configured',
      );
    }
    if (!token) {
      throw new UnauthorizedException('Missing hub.verify_token');
    }
    if (mode !== 'subscribe') {
      throw new BadRequestException('Invalid hub.mode');
    }

    const tokenBuffer = Buffer.from(token);
    const verifyTokenBuffer = Buffer.from(verifyToken);
    if (
      tokenBuffer.length !== verifyTokenBuffer.length ||
      !crypto.timingSafeEqual(tokenBuffer, verifyTokenBuffer)
    ) {
      throw new UnauthorizedException('Invalid hub.verify_token');
    }

    return challenge;
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(
    @Body() body: MetaWebhookBody,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Validate Meta Webhook Signature — fail-closed.
    // Any missing piece (env var, header, raw body) means we cannot verify
    // authenticity, so we refuse to process the message instead of silently
    // accepting it as before.
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      throw new InternalServerErrorException(
        'WHATSAPP_APP_SECRET not configured',
      );
    }
    if (!signature) {
      throw new UnauthorizedException('Missing x-hub-signature-256 header');
    }
    if (!req.rawBody) {
      throw new InternalServerErrorException(
        'Raw body not available — main.ts must set rawBody: true',
      );
    }

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    if (!body?.object) {
      return 'NOT_A_WHATSAPP_EVENT';
    }

    // Defensive optional-chain at every level — the chain previously
    // mixed `body.entry && body.entry[0].changes &&` (raw index) with
    // `?.metadata?.phone_number_id` (chained), so a malformed payload
    // anywhere except the outer `object` would TypeError into a 500.
    const change = body?.entry?.[0]?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!change || !message) {
      return 'EVENT_RECEIVED';
    }

    const phoneNumberId: string | undefined =
      change?.value?.metadata?.phone_number_id;
    const from: string | undefined = message?.from;
    const text: string | undefined = message?.text?.body;
    const type: string | undefined = message?.type;
    let mediaUrl: string | undefined = undefined;

    if (type === 'image' || type === 'video' || type === 'document') {
      const id = message?.[type]?.id;
      // Drop the prior "MEDIA_ID_PLACEHOLDER" sentinel: that literal
      // string used to land in DB attachments downstream, contaminating
      // audit trails. If Meta did not give us an id we just don't
      // forward a mediaUrl — text-only path handles the rest.
      if (typeof id === 'string' && id.length > 0) {
        mediaUrl = id;
      }
    }

    if (typeof from === 'string' && (text || mediaUrl)) {
      await this.whatsappService.processIncomingMessage(
        from,
        text || '',
        mediaUrl,
        phoneNumberId,
      );
    }
    return 'EVENT_RECEIVED';
  }
}
