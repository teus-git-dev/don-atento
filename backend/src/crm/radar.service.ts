import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AiChatService } from '../cognitive/ai-chat.service';

export interface RadarLead {
  id: string;
  propertyTitle: string;
  ownerName: string;
  phone: string;
  portal: string;
  price: string;
  location: string;
  captureScore: number;
  aiScript: string;
  imageUrl: string;
  url: string;
}

/** Source URLs whitelisted for outbound scraping. Block D adds this
 *  so the scan cannot be coerced via a future env var or config change
 *  into scraping arbitrary domains (SSRF defense-in-depth). */
const ALLOWED_PORTAL_URLS = new Set<string>([
  'https://www.fincaraiz.com.co/venta/apartamentos/bogota/usado?ad-type=1',
]);

/** Max chars per scraped field that we forward to the LLM. Bounds
 *  prompt size AND limits the surface for prompt injection — a hostile
 *  listing title beyond this length gets truncated. */
const MAX_FIELD_CHARS = 200;

/** Max raw leads parsed from the portal before any AI step. */
const MAX_RAW_LEADS = 8;

/** Max leads sent to the LLM enrichment step (subset of MAX_RAW_LEADS). */
const MAX_LLM_LEADS = 5;

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);

  constructor(private aiChat: AiChatService) {}

  async scanPortals(tenantId: string, userId: string): Promise<RadarLead[]> {
    const url =
      'https://www.fincaraiz.com.co/venta/apartamentos/bogota/usado?ad-type=1';
    if (!ALLOWED_PORTAL_URLS.has(url)) {
      // Defense-in-depth: a future code change that templated the URL
      // can never reach the network until the URL is explicitly added
      // to the allowlist.
      this.logger.error(`Radar URL not in allowlist: ${url}`);
      return [];
    }

    let response;
    try {
      response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Portal fetch failed: ${msg}`);
      return [];
    }

    const $ = cheerio.load(response.data);
    const rawLeads: Array<Omit<RadarLead, 'captureScore' | 'aiScript'>> = [];

    $('.listingCard').each((i, el) => {
      if (i >= MAX_RAW_LEADS) return; // Limit raw analysis

      const title = $(el).find('.lc-title').text().trim();
      const price = $(el).find('.main-price').text().trim();
      const location = $(el).find('.lc-location').first().text().trim();
      const owner = $(el).find('.lc-owner-name').text().trim() || 'Particular';
      const img = $(el).find('img').first().attr('src');
      const link = $(el).find('a').first().attr('href');

      if (title && price) {
        rawLeads.push({
          id: `fr-${i}-${Date.now()}`,
          propertyTitle: title,
          ownerName: owner,
          phone: 'Ver en portal',
          portal: 'Finca Raíz',
          price,
          location,
          imageUrl:
            img ||
            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
          url: link ? `https://www.fincaraiz.com.co${link}` : url,
        });
      }
    });

    if (rawLeads.length === 0) {
      this.logger.warn(
        'Radar scan returned 0 raw leads (scraper may be stale)',
      );
      return [];
    }

    // ── LLM enrichment with prompt-injection defenses ──
    const leadsForAi = rawLeads.slice(0, MAX_LLM_LEADS).map((l) => ({
      id: l.id,
      // Sanitize every string field before it lands in the prompt:
      // strip newlines (defeats most "ignore previous instructions"
      // payloads embedded in titles/locations from a malicious listing
      // poster), strip [METADATA]/role markers, and truncate.
      propertyTitle: this.sanitizeForPrompt(l.propertyTitle),
      ownerName: this.sanitizeForPrompt(l.ownerName),
      price: this.sanitizeForPrompt(l.price),
      location: this.sanitizeForPrompt(l.location),
    }));

    const prompt = `
      Analiza estos ${leadsForAi.length} prospectos inmobiliarios captados de un portal.
      Para cada uno:
      1. Calcula un "captureScore" (entero 0-100) basado en qué tan buena oportunidad parece para una inmobiliaria.
      2. Genera un "aiScript" corto (max 280 chars) y persuasivo en español para contactar al dueño por WhatsApp. NO incluyas URLs, números de teléfono ni montos específicos.

      Prospectos:
      ${JSON.stringify(leadsForAi)}

      Responde estrictamente en formato JSON: [{ "id": "...", "captureScore": <int>, "aiScript": "..." }]
    `;

    let aiResponse;
    try {
      aiResponse = await this.aiChat.processChat(tenantId, userId, prompt);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`AI enrichment failed: ${msg}`);
      return this.fallbackEnrich(rawLeads.slice(0, MAX_LLM_LEADS));
    }

    const enrichments = this.parseAndValidateEnrichments(
      aiResponse.reply,
      leadsForAi.map((l) => l.id),
    );

    return rawLeads.slice(0, MAX_LLM_LEADS).map((lead) => {
      const extra = enrichments.find((e) => e.id === lead.id);
      return {
        ...lead,
        captureScore: extra?.captureScore ?? 70,
        aiScript:
          extra?.aiScript ??
          'Hola, vi tu propiedad y me interesa ayudarte a venderla rápido.',
      };
    });
  }

  /** Truncates and neutralizes hostile content in scraped strings.
   *  - Newlines collapsed to spaces (defeats many prompt-injection
   *    delimiters).
   *  - Square brackets stripped (defeats `[METADATA]…[/METADATA]` and
   *    role-instruction markers).
   *  - Backticks stripped.
   *  - Truncated to MAX_FIELD_CHARS. */
  private sanitizeForPrompt(raw: string): string {
    return raw
      .replace(/[\r\n]+/g, ' ')
      .replace(/[[\]`]/g, '')
      .substring(0, MAX_FIELD_CHARS)
      .trim();
  }

  /** Parses the LLM reply, extracts the JSON array, validates every
   *  enrichment against a strict schema. Anything that doesn't
   *  match (non-allowlisted id, out-of-range score, script with URLs
   *  or digit-runs that look like phone numbers) is dropped silently;
   *  the caller falls back to defaults for that lead. */
  private parseAndValidateEnrichments(
    reply: string,
    allowedIds: string[],
  ): Array<{ id: string; captureScore: number; aiScript: string }> {
    let parsed: unknown;
    try {
      const jsonMatch = reply.match(/\[.*\]/s);
      if (!jsonMatch) return [];
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      this.logger.warn(
        `Failed to parse AI radar enrichment: ${(e as Error).message}`,
      );
      return [];
    }

    if (!Array.isArray(parsed)) return [];
    const allowedSet = new Set(allowedIds);
    const valid: Array<{
      id: string;
      captureScore: number;
      aiScript: string;
    }> = [];

    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const id = e.id;
      const captureScore = e.captureScore;
      const aiScript = e.aiScript;

      if (typeof id !== 'string' || !allowedSet.has(id)) continue;
      if (
        typeof captureScore !== 'number' ||
        !Number.isInteger(captureScore) ||
        captureScore < 0 ||
        captureScore > 100
      ) {
        continue;
      }
      if (typeof aiScript !== 'string' || aiScript.length > 280) continue;
      // Reject scripts that smuggle URLs or long digit runs (phone
      // numbers) into the agent's outgoing message — a prompt-injection
      // attacker's primary payload.
      if (/https?:\/\//i.test(aiScript) || /\b\d{7,}\b/.test(aiScript))
        continue;

      valid.push({ id, captureScore, aiScript });
    }
    return valid;
  }

  /** Used when the LLM call itself fails. Returns leads with safe
   *  defaults so the dashboard still renders something useful. */
  private fallbackEnrich(
    leads: Array<Omit<RadarLead, 'captureScore' | 'aiScript'>>,
  ): RadarLead[] {
    return leads.map((lead) => ({
      ...lead,
      captureScore: 70,
      aiScript:
        'Hola, vi tu propiedad y me interesa ayudarte a venderla rápido.',
    }));
  }
}
