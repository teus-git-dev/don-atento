import axios from 'axios';
import { API_URL } from '@/lib/config';

export interface BrandBrain {
  tone: string;
  policies?: string;
  faq?: { question: string; answer: string }[];
  responseRules?: string;
}

export const brainService = {
  getBrain: async (tenantId: string): Promise<BrandBrain> => {
    const response = await axios.get(`${API_URL}/brand-brain/${tenantId}`);
    return response.data;
  },

  updateBrain: async (tenantId: string, data: BrandBrain): Promise<BrandBrain> => {
    const response = await axios.put(`${API_URL}/brand-brain/${tenantId}`, data);
    return response.data;
  }
};
