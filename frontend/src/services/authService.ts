/**
 * authService.ts — Servicio de autenticación JWT real
 * Reemplaza el modo Demo con login real contra el backend NestJS.
 */
'use client';

import { API_URL } from '@/lib/config';

export type UserRole = 'SUPERADMIN' | 'ADMIN_TENANT' | 'AGENT' | 'TECHNICIAN' | 'OWNER';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null;
  tenant?: { id: string; name: string } | null;
}

const USER_KEY  = 'don_atento_user_v1';
const TOKEN_KEY = 'don_atento_token_local_v1';

export const authService = {
  /** Llama a POST /auth/login y guarda solo el usuario en localStorage. El token se guarda en cookie httpOnly */
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Needed to receive and set the httpOnly cookie
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message ?? 'Credenciales inválidas'
      );
    }

    const data = (await res.json()) as { accessToken?: string; user: AuthUser & { mustChangePassword?: boolean } };
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
      }

      // ── Force-reset guard: redirect before returning ──────────────────
      if (data.user.mustChangePassword) {
        window.location.href = '/change-password';
        // Return a promise that never resolves — navigation is happening
        await new Promise(() => {});
      }
    }
    return data.user;
  },

  /** Returns stored accessToken for Bearer header use */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /** Devuelve el usuario autenticado, o null si no hay sesión */
  getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try { return JSON.parse(stored) as AuthUser; }
    catch { return null; }
  },

  /** Retorna true si hay un usuario almacenado localmente */
  isAuthenticated(): boolean {
    return !!authService.getUser();
  },

  /** Cierra sesión: limpia localStorage y hace logout (la cookie httpOnly debe limpiarse desde el backend) */
  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (e) {
        console.error('Error on logout:', e);
      }
      
      // Intentar limpiar cualquier cookie local (por si acaso quedó algo legacy)
      document.cookie = 'don_atento_token_v1=; path=/; max-age=0; SameSite=Strict; Secure';
      window.location.href = '/login';
    }
  },
};
