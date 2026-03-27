"use client";

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  status: 'active' | 'suspended' | 'onboarding';
  plan: 'basic' | 'pro' | 'enterprise';
  aiTicketLimit: number;
  aiTicketsUsed: number;
  createdAt: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
}

// Plan Pricing Constants
export const PLAN_PRICES = {
  basic: 450000,
  pro: 700000,
  enterprise: 1500000 // Placeholder for enterprise
};

const getInitialTenants = (): Tenant[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('don_atento_tenants');
    if (stored) return JSON.parse(stored);
  }
  return [];
};

const mockTenants: Tenant[] = getInitialTenants();

let currentTenantId = (typeof window !== 'undefined' && localStorage.getItem('don_atento_current_tenant_id')) || '';

const saveTenants = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('don_atento_tenants', JSON.stringify(mockTenants));
  }
};

export const tenantService = {
  getTenants: (): Tenant[] => {
    return mockTenants;
  },

  getCurrentTenant: (): Tenant | null => {
    if (mockTenants.length === 0) return null;
    return mockTenants.find(t => t.id === currentTenantId) || mockTenants[0];
  },

  setCurrentTenant: (id: string) => {
    currentTenantId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('don_atento_current_tenant_id', id);
    }
    console.log(`Context switched to tenant: ${id}`);
  },

  createTenant: (tenant: Omit<Tenant, 'id' | 'createdAt' | 'aiTicketsUsed' | 'subscriptionStart' | 'subscriptionEnd'>): Tenant => {
    const now = new Date();
    const start = now.toISOString().split('T')[0];
    const end = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];
    
    const newTenant: Tenant = {
      ...tenant,
      id: `TNT-00${mockTenants.length + 1}`,
      aiTicketsUsed: 0,
      createdAt: start,
      subscriptionStart: start,
      subscriptionEnd: end
    };
    mockTenants.push(newTenant);
    saveTenants();
    return newTenant;
  },

  updateStatus: (id: string, status: Tenant['status']) => {
    const tenant = mockTenants.find(t => t.id === id);
    if (tenant) {
      tenant.status = status;
      saveTenants();
    }
  }
};
