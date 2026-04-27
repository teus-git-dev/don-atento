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
var BaileysManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysManager = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const baileys_adapter_1 = require("./baileys.adapter");
const anti_ban_service_1 = require("./anti-ban.service");
const path = __importStar(require("path"));
let BaileysManager = BaileysManager_1 = class BaileysManager {
    prisma;
    antiBan;
    logger = new common_1.Logger(BaileysManager_1.name);
    adapters = new Map();
    authBaseDir = path.join(process.cwd(), 'storage', 'baileys_sessions');
    onMessageCallback = null;
    constructor(prisma, antiBan) {
        this.prisma = prisma;
        this.antiBan = antiBan;
    }
    async onModuleInit() {
        this.logger.log('Initializing Baileys Manager: Auto-connecting active tenants...');
        try {
            const activeTenants = await this.prisma.tenant.findMany({
                where: { whatsappProvider: 'baileys' },
            });
            for (const tenant of activeTenants) {
                this.logger.log(`Auto-starting Baileys session for tenant: ${tenant.id}`);
                this.connectTenant(tenant.id).catch(err => {
                    this.logger.error(`Failed to auto-connect tenant ${tenant.id}: ${err.message}`);
                });
            }
        }
        catch (error) {
            this.logger.error('Error during Baileys auto-connection:', error.message);
        }
    }
    setMessageHandler(handler) {
        this.onMessageCallback = handler;
    }
    async connectTenant(tenantId) {
        if (this.adapters.has(tenantId)) {
            const adapter = this.adapters.get(tenantId);
            const status = adapter.getStatus();
            if (status === 'connected') {
                return { status };
            }
            if (status === 'qr_required') {
                return { status, qr: adapter.getQrCode() || undefined };
            }
        }
        const adapter = new baileys_adapter_1.BaileysAdapter(tenantId, this.authBaseDir, this.antiBan);
        adapter.on('message', async (data) => {
            if (this.onMessageCallback) {
                try {
                    await this.onMessageCallback(tenantId, data.from, data.text, data.mediaType || undefined);
                }
                catch (err) {
                    this.logger.error(`Error processing incoming message for tenant ${tenantId}:`, err);
                }
            }
        });
        adapter.on('connected', async () => {
            this.logger.log(`✅ Tenant ${tenantId} connected via Baileys`);
            try {
                await this.prisma.tenant.update({
                    where: { id: tenantId },
                    data: { whatsappProvider: 'baileys' },
                });
            }
            catch (e) {
                this.logger.warn(`Could not update tenant provider field: ${e.message}`);
            }
        });
        adapter.on('disconnected', (data) => {
            this.logger.warn(`Tenant ${tenantId} disconnected from Baileys. Reason: ${data.reason}`);
        });
        this.adapters.set(tenantId, adapter);
        await adapter.connect();
        await new Promise(resolve => setTimeout(resolve, 3000));
        const status = adapter.getStatus();
        return {
            status,
            qr: status === 'qr_required' ? adapter.getQrCode() || undefined : undefined,
        };
    }
    getAdapter(tenantId) {
        return this.adapters.get(tenantId) || null;
    }
    async sendMessage(tenantId, to, text) {
        const adapter = this.adapters.get(tenantId);
        if (!adapter || adapter.getStatus() !== 'connected') {
            this.logger.warn(`Cannot send via Baileys for tenant ${tenantId}: not connected`);
            return false;
        }
        await adapter.sendText(to, text);
        return true;
    }
    getConnectionStatus(tenantId) {
        const adapter = this.adapters.get(tenantId);
        if (!adapter) {
            return { status: 'disconnected' };
        }
        return {
            status: adapter.getStatus(),
            qr: adapter.getStatus() === 'qr_required' ? adapter.getQrCode() || undefined : undefined,
            health: this.antiBan.getHealthMetrics(tenantId),
        };
    }
    async disconnectTenant(tenantId) {
        const adapter = this.adapters.get(tenantId);
        if (adapter) {
            await adapter.disconnect();
            this.adapters.delete(tenantId);
            this.logger.log(`Tenant ${tenantId} disconnected from Baileys`);
        }
    }
    async onModuleDestroy() {
        this.logger.log('Shutting down all Baileys connections...');
        for (const [tenantId, adapter] of this.adapters) {
            try {
                await adapter.disconnect();
            }
            catch (e) {
                this.logger.warn(`Error disconnecting tenant ${tenantId}: ${e.message}`);
            }
        }
        this.adapters.clear();
    }
};
exports.BaileysManager = BaileysManager;
exports.BaileysManager = BaileysManager = BaileysManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        anti_ban_service_1.AntiBanService])
], BaileysManager);
//# sourceMappingURL=baileys.manager.js.map