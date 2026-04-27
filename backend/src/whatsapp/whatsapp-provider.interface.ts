/**
 * WhatsApp Provider Interface — Adapter Pattern
 * 
 * Abstracción que permite a cada tenant elegir entre:
 * - Meta Cloud API (oficial, con costo)
 * - Baileys (gratuito, protocolo WA Web)
 * 
 * El WhatsappService consume esta interfaz sin conocer el proveedor concreto.
 */
export interface WhatsappProvider {
  /** Envía un mensaje de texto */
  sendText(to: string, text: string): Promise<void>;

  /** Envía una imagen con caption opcional */
  sendImage(to: string, imageUrl: string, caption?: string): Promise<void>;

  /** Envía un documento/archivo */
  sendDocument(to: string, url: string, filename: string): Promise<void>;

  /** Obtiene el estado de la conexión */
  getStatus(): WhatsappConnectionStatus;

  /** Desconecta el proveedor */
  disconnect(): Promise<void>;
}

export type WhatsappConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'qr_required'
  | 'connecting';

export type WhatsappProviderType = 'meta' | 'baileys';
