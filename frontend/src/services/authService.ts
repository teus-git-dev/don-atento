"use client";

export type UserRole = 'SUPERADMIN' | 'ADMIN_TENANT' | 'AGENT' | 'TECHNICIAN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId?: string;
}

// In a real application, this would come from a JWT or a backend session.
// Were using localStorage to persist the "real" state across reloads.
export const authService = {
  getCurrentUser: (): User => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('don_atento_user');
      if (stored) return JSON.parse(stored);
    }
    
    // Default fallback user (simulate a logged-in ADMIN_TENANT by default)
    const defaultUser: User = {
      id: "u-123",
      name: "Juan Administrador",
      email: "admin@horizonte.com",
      role: "ADMIN_TENANT",
      tenantId: "teus-tenant-id"
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('don_atento_user', JSON.stringify(defaultUser));
    }

    return defaultUser;
  },

  loginAs: (role: UserRole) => {
    const user: User = {
      id: `u-${Date.now()}`,
      name: `User ${role}`,
      email: `${role.toLowerCase()}@example.com`,
      role: role,
      tenantId: role === 'SUPERADMIN' ? undefined : 'teus-tenant-id'
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('don_atento_user', JSON.stringify(user));
      // Force full navigation to apply changes everywhere as a real app would after login
      window.location.href = role === 'SUPERADMIN' ? '/admin' : '/dashboard';
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('don_atento_user');
      window.location.href = '/';
    }
  }
};
