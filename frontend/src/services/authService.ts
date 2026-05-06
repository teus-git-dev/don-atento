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

const TOKEN_KEY = 'don_atento_token_v1';
const USER_KEY  = 'don_atento_user_v1';

export const authService = {
  /** Llama a POST /auth/login y guarda el token + usuario en localStorage */
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message ?? 'Credenciales inválidas'
      );
    }

    const data = (await res.json()) as { accessToken: string; user: AuthUser & { mustChangePassword?: boolean } };
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      // Sync to cookie so Next.js middleware can protect routes
      document.cookie = `don_atento_token_v1=${data.accessToken}; path=/; max-age=3600; SameSite=Strict; Secure`;

      // ── Force-reset guard: redirect before returning ──────────────────
      if (data.user.mustChangePassword) {
        window.location.href = '/change-password';
        // Return a promise that never resolves — navigation is happening
        await new Promise(() => {});
      }
    }
    return data.user;
  },

  /** Devuelve el JWT almacenado, o null si no hay sesión */
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

  /** Retorna true si hay un token almacenado */
  isAuthenticated(): boolean {
    return !!authService.getToken();
  },

  /** Cierra sesión: limpia localStorage, cookie y redirige al login */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Clear the auth cookie
      document.cookie = 'don_atento_token_v1=; path=/; max-age=0; SameSite=Strict; Secure';
      window.location.href = '/login';
    }
  },
};
