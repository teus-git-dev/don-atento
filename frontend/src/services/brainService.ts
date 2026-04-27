import { API_URL } from '@/lib/config';
import { apiClient } from '@/lib/apiClient';

export interface BrandBrain {
  tone: string;
  policies?: string;
  faq?: { question: string; answer: string }[];
  responseRules?: string;
}

export const brainService = {
  getBrain: async (tenantId: string): Promise<BrandBrain> => {
    return apiClient.get<BrandBrain>(`/brand-brain/${tenantId}`);
  },

  updateBrain: async (tenantId: string, data: BrandBrain): Promise<BrandBrain> => {
    return apiClient.put<BrandBrain>(`/brand-brain/${tenantId}`, data);
  }
};
