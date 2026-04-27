"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmModule = void 0;
const common_1 = require("@nestjs/common");
const crm_service_1 = require("./crm.service");
const crm_controller_1 = require("./crm.controller");
const radar_service_1 = require("./radar.service");
const radar_controller_1 = require("./radar.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const cognitive_module_1 = require("../cognitive/cognitive.module");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const users_module_1 = require("../users/users.module");
let CrmModule = class CrmModule {
};
exports.CrmModule = CrmModule;
exports.CrmModule = CrmModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            cognitive_module_1.CognitiveModule,
            users_module_1.UsersModule,
            (0, common_1.forwardRef)(() => whatsapp_module_1.WhatsappModule),
        ],
        controllers: [crm_controller_1.CrmController, radar_controller_1.RadarController],
        providers: [crm_service_1.CrmService, radar_service_1.RadarService],
        exports: [crm_service_1.CrmService, radar_service_1.RadarService],
    })
], CrmModule);
//# sourceMappingURL=crm.module.js.map