"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const whatsapp_service_1 = require("./whatsapp.service");
const whatsapp_controller_1 = require("./whatsapp.controller");
const tickets_module_1 = require("../tickets/tickets.module");
const prisma_module_1 = require("../prisma/prisma.module");
const properties_module_1 = require("../properties/properties.module");
const cognitive_module_1 = require("../cognitive/cognitive.module");
const crm_module_1 = require("../crm/crm.module");
let WhatsappModule = class WhatsappModule {
};
exports.WhatsappModule = WhatsappModule;
exports.WhatsappModule = WhatsappModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, (0, common_1.forwardRef)(() => tickets_module_1.TicketsModule), prisma_module_1.PrismaModule, properties_module_1.PropertiesModule, cognitive_module_1.CognitiveModule, crm_module_1.CrmModule],
        controllers: [whatsapp_controller_1.WhatsappController],
        providers: [whatsapp_service_1.WhatsappService],
        exports: [whatsapp_service_1.WhatsappService]
    })
], WhatsappModule);
//# sourceMappingURL=whatsapp.module.js.map