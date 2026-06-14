import { API_URL, TENANT_ID } from '@/lib/config';
import { apiClient } from '@/lib/apiClient';

const BASE_URL = `${API_URL}/providers`;

export enum ProviderSpecialty {
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  MASONRY = 'MASONRY',
  CARPENTRY = 'CARPENTRY',
  PAINTING = 'PAINTING',
  AC_HEATING = 'AC_HEATING',
  GENERAL = 'GENERAL',
  LOCKSMITH = 'LOCKSMITH',
  BLINDS_CURTAINS = 'BLINDS_CURTAINS',
  ROOFING = 'ROOFING',
  ELECTRONICS = 'ELECTRONICS',
  GARDENING = 'GARDENING',
  OTHERS = 'OTHERS'
}

export const SpecialtyLabels: Record<ProviderSpecialty, string> = {
  [ProviderSpecialty.PLUMBING]: 'Plomería',
  [ProviderSpecialty.ELECTRICAL]: 'Electricidad',
  [ProviderSpecialty.MASONRY]: 'Albañilería',
  [ProviderSpecialty.CARPENTRY]: 'Carpintería',
  [ProviderSpecialty.PAINTING]: 'Pintura',
  [ProviderSpecialty.AC_HEATING]: 'Aire Acondicionado',
  [ProviderSpecialty.GENERAL]: 'General',
  [ProviderSpecialty.LOCKSMITH]: 'Cerrajería',
  [ProviderSpecialty.BLINDS_CURTAINS]: 'Persianas y Cortinas',
  [ProviderSpecialty.ROOFING]: 'Techos',
  [ProviderSpecialty.ELECTRONICS]: 'Aparatos Electrónicos',
  [ProviderSpecialty.GARDENING]: 'Jardinero',
  [ProviderSpecialty.OTHERS]: 'Otros'
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
  
  technicians?: { id: string; name: string }[];
  additionalContacts?: ProviderAdditionalContact[];
}

export const providersService = {
  async getProviders() {
    // providers Block B: backend now returns
    // { data, totalRecords, totalPages, currentPage }. Unwrap .data
    // with fallback to raw array for rolling-deploy compat.
    const res = await apiClient.get<{ data?: Provider[] } | Provider[]>(
      `/providers?tenantId=${TENANT_ID}&limit=100`,
    );
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.data) ? res.data : [];
  },

  async getProvider(id: string) {
    return apiClient.get<Provider>(`/providers/${id}`);
  },

  async createProvider(data: Omit<Provider, 'id' | 'status'>) {
    return apiClient.post<Provider>(`/providers?tenantId=${TENANT_ID}`, data);
  },

  async updateProvider(id: string, data: Partial<Provider>) {
    return apiClient.patch<Provider>(`/providers/${id}`, data);
  },

  async deleteProvider(id: string) {
    return apiClient.delete<void>(`/providers/${id}`);
  },

  async assignTechnician(providerId: string, userId: string) {
    return apiClient.post<{ providerId: string; userId: string }>(`/providers/${providerId}/assign-technician/${userId}`, {});
  }
};
