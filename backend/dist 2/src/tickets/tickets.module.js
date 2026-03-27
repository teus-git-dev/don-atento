"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsModule = void 0;
const common_1 = require("@nestjs/common");
const tickets_service_1 = require("./tickets.service");
const tickets_controller_1 = require("./tickets.controller");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const cognitive_module_1 = require("../cognitive/cognitive.module");
const prisma_module_1 = require("../prisma/prisma.module");
const sla_matrix_service_1 = require("./sla-matrix.service");
let TicketsModule = class TicketsModule {
};
exports.TicketsModule = TicketsModule;
exports.TicketsModule = TicketsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => whatsapp_module_1.WhatsappModule),
            cognitive_module_1.CognitiveModule,
            prisma_module_1.PrismaModule
        ],
        controllers: [tickets_controller_1.TicketsController],
        providers: [tickets_service_1.TicketsService, sla_matrix_service_1.SlaMatrixService],
        exports: [tickets_service_1.TicketsService, sla_matrix_service_1.SlaMatrixService]
    })
], TicketsModule);
//# sourceMappingURL=tickets.module.js.map