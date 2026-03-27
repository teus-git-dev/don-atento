export declare class EmailService {
    sendEmail(to: string, subject: string, body: string, attachments?: any[]): Promise<{
        success: boolean;
        messageId: string;
    }>;
    sendFormalReport(to: string, propertyTitle: string, reportContent: string): Promise<{
        success: boolean;
        messageId: string;
    }>;
    sendSurveyRequest(to: string, ticketTitle: string, surveyLink: string): Promise<{
        success: boolean;
        messageId: string;
    }>;
}
