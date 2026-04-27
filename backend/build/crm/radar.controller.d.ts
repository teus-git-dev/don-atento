import { RadarService } from './radar.service';
export declare class RadarController {
    private readonly radarService;
    constructor(radarService: RadarService);
    scan(req: any): Promise<{
        success: boolean;
        timestamp: string;
        count: number;
        leads: import("./radar.service").RadarLead[];
    }>;
}
