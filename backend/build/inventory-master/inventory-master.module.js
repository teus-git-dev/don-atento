"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryMasterModule = void 0;
const common_1 = require("@nestjs/common");
const inventory_master_service_1 = require("./inventory-master.service");
const inventory_master_controller_1 = require("./inventory-master.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const inventory_report_service_1 = require("./inventory-report.service");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const tickets_module_1 = require("../tickets/tickets.module");
const inventory_templates_module_1 = require("../inventory-templates/inventory-templates.module");
let InventoryMasterModule = class InventoryMasterModule {
};
exports.InventoryMasterModule = InventoryMasterModule;
exports.InventoryMasterModule = InventoryMasterModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            whatsapp_module_1.WhatsappModule,
            tickets_module_1.TicketsModule,
            inventory_templates_module_1.InventoryTemplatesModule,
        ],
        providers: [inventory_master_service_1.InventoryMasterService, inventory_report_service_1.InventoryReportService],
        controllers: [inventory_master_controller_1.InventoryMasterController],
        exports: [inventory_master_service_1.InventoryMasterService, inventory_report_service_1.InventoryReportService],
    })
], InventoryMasterModule);
//# sourceMappingURL=inventory-master.module.js.map