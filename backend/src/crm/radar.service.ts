import { Injectable } from '@nestjs/common';
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

@Injectable()
export class RadarService {
  constructor(private aiChat: AiChatService) {}

  async scanPortals(tenantId: string, userId: string): Promise<RadarLead[]> {
    try {
      // 1. Fetch from Finca Raiz (Direct Owners)
      const url = 'https://www.fincaraiz.com.co/venta/apartamentos/bogota/usado?ad-type=1';
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const rawLeads: any[] = [];

      $('.listingCard').each((i, el) => {
        if (i >= 8) return; // Limit raw analysis

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
            phone: 'Ver en portal', // Scraping phone requires deep link/click usually
            portal: 'Finca Raíz',
            price,
            location,
            imageUrl: img || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
            url: link ? `https://www.fincaraiz.com.co${link}` : url
          });
        }
      });

      if (rawLeads.length === 0) return [];

      // 2. Use AI to enrich and score
      const prompt = `
        Analiza estos 5 prospectos inmobiliarios captados de un portal.
        Para cada uno:
        1. Calcula un "captureScore" (0-100) basado en qué tan buena oportunidad parece para una inmobiliaria (precio vs zona, si parece dueño directo urgido).
        2. Genera un "aiScript" corto y persuasivo en español para que un agente contacte al dueño por WhatsApp.
        
        Prospectos:
        ${JSON.stringify(rawLeads.slice(0, 5))}
        
        Responde estrictamente en formato JSON: [{ id, captureScore, aiScript }]
      `;

      const aiResponse = await this.aiChat.processChat(tenantId, userId, prompt);
      
      let enrichments = [];
      try {
        // Find JSON in the reply
        const jsonMatch = aiResponse.reply.match(/\[.*\]/s);
        if (jsonMatch) {
          enrichments = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Failed to parse AI radar enrichment', e);
      }

      // Merge data
      return rawLeads.slice(0, 5).map(lead => {
        const extra = enrichments.find(e => e.id === lead.id);
        return {
          ...lead,
          captureScore: extra?.captureScore || 70,
          aiScript: extra?.aiScript || 'Hola, vi tu propiedad y me interesa ayudarte a venderla rápido.'
        };
      });

    } catch (error) {
      console.error('[RadarService] Error scanning:', error.message);
      return [];
    }
  }
}
