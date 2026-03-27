import { BrandBrainService } from '../cognitive/brand-brain.service';
export declare class DocumentGeneratorService {
    private readonly brandBrain;
    constructor(brandBrain: BrandBrainService);
    generateWelcomeLetter(tenantId: string, tenantName: string, propertyAddress: string): Promise<{
        fileName: string;
        content: string;
        toneUsed: string;
        alignmentScore: number;
    }>;
}
