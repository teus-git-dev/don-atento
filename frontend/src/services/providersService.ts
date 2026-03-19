import axios from 'axios';
import { tenantService } from './tenantService';

const API_URL = 'http://localhost:3051/providers';

export enum ProviderSpecialty {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  MASONRY = 'MASONRY',
  CARPENTRY = 'CARPENTRY',
  PAINTING = 'PAINTING',
  AC_HEATING = 'AC_HEATING',
  GENERAL = 'GENERAL'
}

export interface Provider {
  id: string;
  name: string;
  nit?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialty: ProviderSpecialty;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  rating?: number;
  technicians?: any[];
}

export const providersService = {
  async getProviders() {
    const tenantId = tenantService.getCurrentTenant().id;
    const response = await axios.get(`${API_URL}?tenantId=${tenantId}`);
    return response.data;
  },

  async getProvider(id: string) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async createProvider(data: Omit<Provider, 'id' | 'status'>) {
    const tenantId = tenantService.getCurrentTenant().id;
    const response = await axios.post(`${API_URL}?tenantId=${tenantId}`, data);
    return response.data;
  },

  async updateProvider(id: string, data: Partial<Provider>) {
    const response = await axios.patch(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteProvider(id: string) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async assignTechnician(providerId: string, userId: string) {
    const response = await axios.post(`${API_URL}/${providerId}/assign-technician/${userId}`);
    return response.data;
  }
};
