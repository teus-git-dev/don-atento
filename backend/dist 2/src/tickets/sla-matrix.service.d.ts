import { PrismaService } from '../prisma/prisma.service';
export declare class SlaMatrixService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    calculateDueDate(ticketId: string): Promise<Date>;
}
