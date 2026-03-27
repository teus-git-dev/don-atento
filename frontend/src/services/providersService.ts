import axios from 'axios';
import { API_URL, TENANT_ID } from '@/lib/config';

const BASE_URL = `${API_URL}/providers`;

export enum ProviderSpecialty {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  MASONRY = 'MASONRY',
  CARPENTRY = 'CARPENTRY',
  PAINTING = 'PAINTING',
  AC_HEATING = 'AC_HEATING',
  GENERAL = 'GENERAL'
}

export const SpecialtyLabels: Record<ProviderSpecialty, string> = {
  [ProviderSpecialty.PLUMBING]: 'Plomería',
  [ProviderSpecialty.ELECTRICAL]: 'Electricidad',
  [ProviderSpecialty.MASONRY]: 'Albañilería',
  [ProviderSpecialty.CARPENTRY]: 'Carpintería',
  [ProviderSpecialty.PAINTING]: 'Pintura',
  [ProviderSpecialty.AC_HEATING]: 'Aire Acondicionado',
  [ProviderSpecialty.GENERAL]: 'General'
};

export interface ProviderAdditionalContact {
  id?: string;
  firstName: string;
  lastName: string;
  governmentId?: string;
  phone?: string;
  photoUrl?: string;
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
  
  // New Contact Fields
  contactName?: string;
  contactLastName?: string;
  contactId?: string;
  contactPhone?: string;
  photoUrl?: string;
  
  // Legal Compliance
  legalArl?: string;
  legalSst?: boolean;
  legalPolicyNumber?: string;
  
  technicians?: any[];
  additionalContacts?: ProviderAdditionalContact[];
}

export const providersService = {
  async getProviders() {
    const response = await axios.get(`${BASE_URL}?tenantId=${TENANT_ID}`);
    return response.data;
  },

  async getProvider(id: string) {
    const response = await axios.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  async createProvider(data: Omit<Provider, 'id' | 'status'>) {
    const response = await axios.post(`${BASE_URL}?tenantId=${TENANT_ID}`, data);
    return response.data;
  },

  async updateProvider(id: string, data: Partial<Provider>) {
    const response = await axios.patch(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  async deleteProvider(id: string) {
    const response = await axios.delete(`${BASE_URL}/${id}`);
    return response.data;
  },

  async assignTechnician(providerId: string, userId: string) {
    const response = await axios.post(`${BASE_URL}/${providerId}/assign-technician/${userId}`);
    return response.data;
  }
};
