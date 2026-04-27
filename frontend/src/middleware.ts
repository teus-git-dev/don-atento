/**
 * middleware.ts — Protección de rutas del dashboard
 * Si no hay token JWT, redirige a /login automáticamente.
 * Corre en el Edge Runtime de Next.js (antes del render).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/login-teus', '/', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verificar token en cookies o localStorage-forwarded header
  // Next.js middleware sólo puede leer cookies, no localStorage.
  // El token se almacena en cookie 'don_atento_token' (sincronizada desde authService).
  const token = request.cookies.get('don_atento_token_v1')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todas las rutas excepto assets estáticos y API routes de Next
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
