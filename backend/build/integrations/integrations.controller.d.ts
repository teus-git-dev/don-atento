import { IntegrationsService } from './integrations.service';
export declare class IntegrationsController {
    private readonly integrationsService;
    private readonly logger;
    constructor(integrationsService: IntegrationsService);
    handleFincaRaizWebhook(tenantId: string, payload: any): Promise<{
        status: string;
        type: string;
        id: string;
    }>;
}
