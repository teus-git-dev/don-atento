import { PrismaService } from '../prisma/prisma.service';
export declare class MaintenancePredictorService {
    private prisma;
    constructor(prisma: PrismaService);
    calculatePropertyHealthScore(propertyId: string): Promise<{
        score: number;
        status: string;
        recommendations: string[];
    }>;
}
