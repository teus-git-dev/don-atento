"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryTemplatesModule = void 0;
const common_1 = require("@nestjs/common");
const inventory_templates_service_1 = require("./inventory-templates.service");
const inventory_templates_controller_1 = require("./inventory-templates.controller");
const prisma_module_1 = require("../prisma/prisma.module");
let InventoryTemplatesModule = class InventoryTemplatesModule {
};
exports.InventoryTemplatesModule = InventoryTemplatesModule;
exports.InventoryTemplatesModule = InventoryTemplatesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [inventory_templates_controller_1.InventoryTemplatesController],
        providers: [inventory_templates_service_1.InventoryTemplatesService],
        exports: [inventory_templates_service_1.InventoryTemplatesService],
    })
], InventoryTemplatesModule);
//# sourceMappingURL=inventory-templates.module.js.map