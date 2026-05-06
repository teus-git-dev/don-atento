/**
 * apiClient.ts — Cliente HTTP centralizado con Bearer token automático
 * Inyecta el JWT en todos los requests y maneja la expiración de sesión.
 */
import { API_URL } from '@/lib/config';
import { authService } from '@/services/authService';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = authService.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Si el servidor rechaza el token, cerramos sesión
  if (res.status === 401) {
    authService.logout();
    throw new Error('Sesión expirada. Por favor ingresa nuevamente.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    
    // Attempt to extract the most descriptive error message possible
    let errorMessage = `Error ${res.status}`;
    
    if (err && typeof err === 'object') {
      if (Array.isArray(err.message)) {
        errorMessage = err.message.join(', ');
      } else if (typeof err.message === 'string') {
        errorMessage = err.message;
      } else if (typeof err.error === 'string') {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
    }
    
    throw new Error(errorMessage);
  }

  // Respuesta vacía (DELETE, etc.)
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
