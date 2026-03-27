"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_service_1 = require("./whatsapp.service");
let WhatsappController = class WhatsappController {
    whatsappService;
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    verifyWebhook(mode, token, challenge) {
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
    async handleIncomingMessage(body) {
        console.log('Incoming WhatsApp Body:', JSON.stringify(body, null, 2));
        if (body.object) {
            if (body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from;
                const text = message.text?.body;
                const type = message.type;
                let mediaUrl = null;
                if (type === 'image' || type === 'video' || type === 'document') {
                    mediaUrl = message[type]?.id || 'MEDIA_ID_PLACEHOLDER';
                }
                if (text || mediaUrl) {
                    await this.whatsappService.processIncomingMessage(from, text || '', mediaUrl);
                }
            }
            return 'EVENT_RECEIVED';
        }
        else {
            return 'NOT_A_WHATSAPP_EVENT';
        }
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "handleIncomingMessage", null);
exports.WhatsappController = WhatsappController = __decorate([
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map