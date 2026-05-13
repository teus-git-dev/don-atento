import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Issues and verifies short HMAC tokens used to authorize anonymous
 * access to the post-resolution satisfaction survey endpoints.
 *
 * Why a separate service:
 *  - Replaces the inline `require('crypto')` + `process.env.JWT_SECRET
 *    || 'MISSING'` pattern that previously lived in the controller and
 *    service. The `|| 'MISSING'` fallback made the secret predictable
 *    when the env var was missing — fail-fast at boot is the project
 *    convention (mirrors JwtStrategy).
 *  - Centralises the comparison so `timingSafeEqual` length-mismatch
 *    no longer leaks 500s on malformed tokens.
 */
@Injectable()
export class SurveyTokenService implements OnModuleInit {
  private secret!: string;
  private static readonly TOKEN_LENGTH = 16;

  onModuleInit() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_SECRET is required for SurveyTokenService. Set it in the environment before boot.',
      );
    }
    this.secret = secret;
  }

  /**
   * Generates a 16-char hex HMAC over the ticketId, suitable for
   * embedding in a WhatsApp / email survey link.
   */
  generate(ticketId: string): string {
    return createHmac('sha256', this.secret)
      .update(ticketId)
      .digest('hex')
      .substring(0, SurveyTokenService.TOKEN_LENGTH);
  }

  /**
   * Constant-time comparison of a caller-supplied token against the
   * expected HMAC for the ticket. Returns `false` on any mismatch
   * (including length mismatch — `timingSafeEqual` throws RangeError
   * when buffers differ in length, which we catch and treat as
   * invalid).
   */
  verify(ticketId: string, token: string | undefined): boolean {
    if (!token || token.length !== SurveyTokenService.TOKEN_LENGTH) {
      return false;
    }
    const expected = this.generate(ticketId);
    try {
      return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
