import { CognitiveService } from './cognitive.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';
export declare class CognitiveController {
    private readonly cognitiveService;
    private readonly maintenancePredictor;
    constructor(cognitiveService: CognitiveService, maintenancePredictor: MaintenancePredictorService);
    getPropertySummary(id: string): Promise<{
        interactions: ({
            user: {
                role: import(".prisma/client").$Enums.UserRole;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            channel: import(".prisma/client").$Enums.InteractionChannel;
            message: string;
            sentimentAnalysis: import(".prisma/client").$Enums.SentimentAnalysis | null;
            sentAt: Date;
            ticketId: string;
            userId: string | null;
        })[];
        summary: {
            totalInteractions: number;
            negativeCount: number;
            positiveCount: number;
            overallHealth: "CRITICAL" | "HEALTHY" | "WARNING";
        };
    }>;
    getPropertyHealthScore(id: string): Promise<{
        score: number;
        status: string;
        recommendations: string[];
    }>;
    validateEvidence(body: {
        fileName: string;
        fileType: string;
        description?: string;
    }): Promise<{
        verdict: string;
        confidence: number;
        isCoherent: boolean;
    }>;
    classifyPriority(body: {
        title: string;
        description: string;
    }): Promise<{
        priority: import(".prisma/client").TicketPriority;
        reason: string;
    }>;
}
