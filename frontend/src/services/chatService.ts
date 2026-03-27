import axios from 'axios';
import { API_URL, TENANT_ID } from '@/lib/config';

export interface ChatMessage {
  id: string;
  role: 'usuario' | 'ia';
  content: string;
  timestamp: Date;
}

export const chatService = {
  sendMessage: async (message: string, history: ChatMessage[]): Promise<{ reply: string, contextUsed: any }> => {
    // Convert local history to format that backend expects
    const simplifiedHistory = history.map(h => ({
      role: h.role,
      content: h.content
    }));

    const response = await axios.post(`${API_URL}/ai-chat`, {
      tenantId: TENANT_ID,
      userId: 'user-001', // Ideally would be dynamic
      message,
      history: simplifiedHistory
    });

    return response.data;
  }
};
