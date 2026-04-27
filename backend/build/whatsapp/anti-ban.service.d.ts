export declare class AntiBanService {
    private readonly logger;
    private counters;
    private readonly LIMITS;
    gaussianDelay(meanMs?: number, stdDevMs?: number): number;
    applyDelay(tenantId: string): Promise<void>;
    canSend(tenantId: string, contactId: string): {
        allowed: boolean;
        reason?: string;
    };
    recordSent(tenantId: string, contactId: string): void;
    getHealthMetrics(tenantId: string): {
        messagesLastHour: number;
        messagesLast24h: number;
        uniqueContactsToday: number;
        hourUsagePercent: number;
        dayUsagePercent: number;
        warningLevel: "GREEN" | "RED" | "YELLOW";
        limits: {
            MAX_MESSAGES_PER_HOUR: number;
            MAX_MESSAGES_PER_DAY: number;
            MAX_NEW_CONTACTS_PER_DAY: number;
            ACTIVE_HOUR_START: number;
            ACTIVE_HOUR_END: number;
            COOLDOWN_MULTIPLIER: number;
        };
    };
    private getCounter;
    private refreshCounters;
    private sleep;
}
