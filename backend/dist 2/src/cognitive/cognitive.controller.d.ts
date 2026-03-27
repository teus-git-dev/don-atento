import { CognitiveService } from './cognitive.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';
import { AssetRecognitionService } from './asset-recognition.service';
export declare class CognitiveController {
    private readonly cognitiveService;
    private readonly maintenancePredictor;
    private readonly assetRecognition;
    constructor(cognitiveService: CognitiveService, maintenancePredictor: MaintenancePredictorService, assetRecognition: AssetRecognitionService);
    getPropertySummary(id: string): Promise<{
        interactions: ({
            user: {
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            userId: string | null;
            ticketId: string;
            channel: import("@prisma/client").$Enums.InteractionChannel;
            message: string;
            sentimentAnalysis: import("@prisma/client").$Enums.SentimentAnalysis | null;
            sentAt: Date;
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
    visionOnboarding(id: string, body: {
        imageUrl: string;
    }): Promise<{
        message: string;
        items: {
            comments: string | null;
            id: string;
            name: string;
            createdAt: Date;
            description: string | null;
            category: import("@prisma/client").$Enums.InventoryCategory;
            material: string | null;
            zoneId: string | null;
            propertyId: string;
            model: string | null;
            condition: import("@prisma/client").$Enums.InventoryCondition;
            brand: string | null;
            serialNumber: string | null;
            quantity: number;
            isFunctional: boolean;
            technicalDetails: import("@prisma/client/runtime/client").JsonValue | null;
            expectedLifespanMonths: number | null;
            lastInspectionDate: Date | null;
        }[];
    }>;
    validateEvidence(body: {
        fileName: string;
        fileType: string;
    }): Promise<{
        verdict: string;
        confidence: number;
        timestamp: string;
    }>;
    extractContract(body: {
        fileName: string;
        fileType: string;
        tenantId: string;
    }): Promise<{
        success: boolean;
        error: string;
        expertIdentity?: undefined;
        data?: undefined;
        validation?: undefined;
    } | {
        success: boolean;
        expertIdentity: string;
        data: {
            tenantName: string;
            tenantLastName: string;
            tenantId: string;
            tenantPhone: string;
            tenantEmail: string;
            rentAmount: number;
            adminAmount: number;
            startDate: string;
            endDate: string;
            propertyAddress: string;
            agencyName: string;
            agencyNit: string;
        };
        validation: {
            legalPersona: string;
            findings: string[];
            warnings: string[];
        };
        error?: undefined;
    }>;
    analyzeVision(body: {
        fileName: string;
        fileType: string;
    }): Promise<{
        success: boolean;
        splatUrl: string;
        analysis: {
            repairs: {
                id: number;
                area: string;
                issue: string;
                severity: string;
            }[];
            overallHealth: number;
            expertIdentity: string;
            recommendation: string;
        };
    }>;
}
