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
}

const mockTenants: Tenant[] = [
  {
    id: 'incasa-tenant-id',
    name: 'Incasa NC Group',
    status: 'active',
    plan: 'enterprise',
    aiTicketLimit: 5000,
    aiTicketsUsed: 0,
    createdAt: '2024-03-17'
  },
  {
    id: 'TNT-001',
    name: 'Inmobiliaria Horizonte',
    status: 'active',
    plan: 'pro',
    aiTicketLimit: 500,
    aiTicketsUsed: 124,
    createdAt: '2024-01-15'
  }
];

let currentTenantId = 'incasa-tenant-id';

export const tenantService = {
  getTenants: (): Tenant[] => {
    return mockTenants;
  },

  getCurrentTenant: (): Tenant => {
    return mockTenants.find(t => t.id === currentTenantId) || mockTenants[0];
  },

  setCurrentTenant: (id: string) => {
    currentTenantId = id;
    console.log(`Context switched to tenant: ${id}`);
    // In a real app, this would trigger a global state update or page reload
  },

  createTenant: (tenant: Omit<Tenant, 'id' | 'createdAt' | 'aiTicketsUsed'>): Tenant => {
    const newTenant: Tenant = {
      ...tenant,
      id: `TNT-00${mockTenants.length + 1}`,
      aiTicketsUsed: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    mockTenants.push(newTenant);
    return newTenant;
  },

  updateStatus: (id: string, status: Tenant['status']) => {
    const tenant = mockTenants.find(t => t.id === id);
    if (tenant) tenant.status = status;
  }
};
