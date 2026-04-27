"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AntiBanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiBanService = void 0;
const common_1 = require("@nestjs/common");
let AntiBanService = AntiBanService_1 = class AntiBanService {
    logger = new common_1.Logger(AntiBanService_1.name);
    counters = new Map();
    LIMITS = {
        MAX_MESSAGES_PER_HOUR: 25,
        MAX_MESSAGES_PER_DAY: 250,
        MAX_NEW_CONTACTS_PER_DAY: 15,
        ACTIVE_HOUR_START: 7,
        ACTIVE_HOUR_END: 22,
        COOLDOWN_MULTIPLIER: 2,
    };
    gaussianDelay(meanMs = 4000, stdDevMs = 1500) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(1500, Math.round(meanMs + z * stdDevMs));
    }
    async applyDelay(tenantId) {
        const hour = new Date().getHours();
        let baseMean = 4000;
        if (hour < this.LIMITS.ACTIVE_HOUR_START || hour >= this.LIMITS.ACTIVE_HOUR_END) {
            baseMean = 8000;
        }
        const counter = this.getCounter(tenantId);
        const hourUsage = counter.messagesLastHour / this.LIMITS.MAX_MESSAGES_PER_HOUR;
        if (hourUsage > 0.7) {
            baseMean *= this.LIMITS.COOLDOWN_MULTIPLIER;
            this.logger.warn(`[${tenantId}] Approaching hourly limit (${Math.round(hourUsage * 100)}%). Slowing down.`);
        }
        const delay = this.gaussianDelay(baseMean, baseMean * 0.4);
        this.logger.debug(`[${tenantId}] Applying human delay: ${delay}ms`);
        await this.sleep(delay);
    }
    canSend(tenantId, contactId) {
        const counter = this.getCounter(tenantId);
        this.refreshCounters(counter);
        const hour = new Date().getHours();
        if (hour < this.LIMITS.ACTIVE_HOUR_START || hour >= this.LIMITS.ACTIVE_HOUR_END) {
            this.logger.debug(`[${tenantId}] Outside active hours (${hour}h). Outbound paused.`);
        }
        if (counter.messagesLastHour >= this.LIMITS.MAX_MESSAGES_PER_HOUR) {
            return { allowed: false, reason: `Hourly limit reached (${this.LIMITS.MAX_MESSAGES_PER_HOUR}/h)` };
        }
        if (counter.messagesLast24h >= this.LIMITS.MAX_MESSAGES_PER_DAY) {
            return { allowed: false, reason: `Daily limit reached (${this.LIMITS.MAX_MESSAGES_PER_DAY}/day)` };
        }
        if (!counter.uniqueContactsToday.has(contactId) &&
            counter.uniqueContactsToday.size >= this.LIMITS.MAX_NEW_CONTACTS_PER_DAY) {
            return { allowed: false, reason: `New contact limit reached (${this.LIMITS.MAX_NEW_CONTACTS_PER_DAY}/day)` };
        }
        return { allowed: true };
    }
    recordSent(tenantId, contactId) {
        const counter = this.getCounter(tenantId);
        this.refreshCounters(counter);
        counter.messagesLastHour++;
        counter.messagesLast24h++;
        counter.uniqueContactsToday.add(contactId);
    }
    getHealthMetrics(tenantId) {
        const counter = this.getCounter(tenantId);
        this.refreshCounters(counter);
        const hourUsage = counter.messagesLastHour / this.LIMITS.MAX_MESSAGES_PER_HOUR;
        const dayUsage = counter.messagesLast24h / this.LIMITS.MAX_MESSAGES_PER_DAY;
        let warningLevel = 'GREEN';
        if (hourUsage > 0.7 || dayUsage > 0.7)
            warningLevel = 'YELLOW';
        if (hourUsage > 0.9 || dayUsage > 0.9)
            warningLevel = 'RED';
        return {
            messagesLastHour: counter.messagesLastHour,
            messagesLast24h: counter.messagesLast24h,
            uniqueContactsToday: counter.uniqueContactsToday.size,
            hourUsagePercent: Math.round(hourUsage * 100),
            dayUsagePercent: Math.round(dayUsage * 100),
            warningLevel,
            limits: this.LIMITS,
        };
    }
    getCounter(tenantId) {
        if (!this.counters.has(tenantId)) {
            this.counters.set(tenantId, {
                messagesLastHour: 0,
                messagesLast24h: 0,
                uniqueContactsToday: new Set(),
                hourReset: Date.now() + 3600000,
                dayReset: Date.now() + 86400000,
            });
        }
        return this.counters.get(tenantId);
    }
    refreshCounters(counter) {
        const now = Date.now();
        if (now > counter.hourReset) {
            counter.messagesLastHour = 0;
            counter.hourReset = now + 3600000;
        }
        if (now > counter.dayReset) {
            counter.messagesLast24h = 0;
            counter.uniqueContactsToday.clear();
            counter.dayReset = now + 86400000;
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.AntiBanService = AntiBanService;
exports.AntiBanService = AntiBanService = AntiBanService_1 = __decorate([
    (0, common_1.Injectable)()
], AntiBanService);
//# sourceMappingURL=anti-ban.service.js.map