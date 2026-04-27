"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadarService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const ai_chat_service_1 = require("../cognitive/ai-chat.service");
let RadarService = class RadarService {
    aiChat;
    constructor(aiChat) {
        this.aiChat = aiChat;
    }
    async scanPortals(tenantId, userId) {
        try {
            const url = 'https://www.fincaraiz.com.co/venta/apartamentos/bogota/usado?ad-type=1';
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 15000
            });
            const $ = cheerio.load(response.data);
            const rawLeads = [];
            $('.listingCard').each((i, el) => {
                if (i >= 8)
                    return;
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
                        imageUrl: img || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
                        url: link ? `https://www.fincaraiz.com.co${link}` : url
                    });
                }
            });
            if (rawLeads.length === 0)
                return [];
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
                const jsonMatch = aiResponse.reply.match(/\[.*\]/s);
                if (jsonMatch) {
                    enrichments = JSON.parse(jsonMatch[0]);
                }
            }
            catch (e) {
                console.error('Failed to parse AI radar enrichment', e);
            }
            return rawLeads.slice(0, 5).map(lead => {
                const extra = enrichments.find((e) => e.id === lead.id);
                return {
                    ...lead,
                    captureScore: extra?.captureScore || 70,
                    aiScript: extra?.aiScript || 'Hola, vi tu propiedad y me interesa ayudarte a venderla rápido.'
                };
            });
        }
        catch (error) {
            console.error('[RadarService] Error scanning:', error.message);
            return [];
        }
    }
};
exports.RadarService = RadarService;
exports.RadarService = RadarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_chat_service_1.AiChatService])
], RadarService);
//# sourceMappingURL=radar.service.js.map