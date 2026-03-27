"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const tickets_module_1 = require("./tickets/tickets.module");
const whatsapp_module_1 = require("./whatsapp/whatsapp.module");
const prisma_module_1 = require("./prisma/prisma.module");
const properties_module_1 = require("./properties/properties.module");
const workflows_module_1 = require("./workflows/workflows.module");
const users_module_1 = require("./users/users.module");
const inventory_templates_module_1 = require("./inventory-templates/inventory-templates.module");
const cognitive_module_1 = require("./cognitive/cognitive.module");
const crm_module_1 = require("./crm/crm.module");
const providers_module_1 = require("./providers/providers.module");
const inventory_master_module_1 = require("./inventory-master/inventory-master.module");
const integrations_module_1 = require("./integrations/integrations.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            tickets_module_1.TicketsModule,
            whatsapp_module_1.WhatsappModule,
            properties_module_1.PropertiesModule,
            workflows_module_1.WorkflowsModule,
            users_module_1.UsersModule,
            inventory_templates_module_1.InventoryTemplatesModule,
            cognitive_module_1.CognitiveModule,
            crm_module_1.CrmModule,
            providers_module_1.ProvidersModule,
            inventory_master_module_1.InventoryMasterModule,
            integrations_module_1.IntegrationsModule
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map