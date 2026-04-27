export interface WhatsappProvider {
    sendText(to: string, text: string): Promise<void>;
    sendImage(to: string, imageUrl: string, caption?: string): Promise<void>;
    sendDocument(to: string, url: string, filename: string): Promise<void>;
    getStatus(): WhatsappConnectionStatus;
    disconnect(): Promise<void>;
}
export type WhatsappConnectionStatus = 'connected' | 'disconnected' | 'qr_required' | 'connecting';
export type WhatsappProviderType = 'meta' | 'baileys';
