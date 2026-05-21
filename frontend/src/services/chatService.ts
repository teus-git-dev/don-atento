import { API_URL, TENANT_ID } from '@/lib/config';
import { apiClient } from '@/lib/apiClient';

export interface ChatMessage {
  id: string;
  role: 'usuario' | 'ia';
  content: string;
  timestamp: Date;
}

export const chatService = {
  sendMessage: async (message: string, history: ChatMessage[]): Promise<{ reply: string, contextUsed: unknown }> => {
    // Convert local history to format that backend expects
    const simplifiedHistory = history.map(h => ({
      role: h.role,
      content: h.content
    }));

    const data = await apiClient.post<{ reply: string, contextUsed: unknown }>('/ai-chat', {
      tenantId: TENANT_ID,
      userId: 'user-001', // Ideally would be dynamic
      message,
      history: simplifiedHistory
    });

    return data;
  }
};
