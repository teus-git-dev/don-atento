/**
 * Type shape (NOT class-validator DTO) for the inbound Meta WhatsApp
 * webhook body. We can't use ValidationPipe here because the route is
 * `@Public()` and Meta's payload format is officially documented but
 * partially open-ended (Meta evolves it).
 *
 * Defensive policy: the controller treats every nested level as
 * optional and uses chained `?.` access. The handler verifies the
 * HMAC signature BEFORE this shape is trusted; once verified, missing
 * fields just short-circuit (return 'EVENT_RECEIVED') rather than 500.
 */
/**
 * Known Meta WhatsApp message types we explicitly handle. Meta evolves
 * its API and may add new types — the wire-level `type` field is widened
 * to `string` at MetaWebhookMessage.type so the controller can safely
 * branch on the known values while not rejecting an unknown one.
 */
export type KnownMetaMessageType = 'text' | 'image' | 'video' | 'document';

export interface MetaWebhookMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string };
  video?: { id?: string };
  document?: { id?: string };
}

export interface MetaWebhookChangeValue {
  metadata?: { phone_number_id?: string };
  messages?: MetaWebhookMessage[];
}

export interface MetaWebhookEntry {
  changes?: Array<{ value?: MetaWebhookChangeValue }>;
}

export interface MetaWebhookBody {
  object?: string;
  entry?: MetaWebhookEntry[];
}
