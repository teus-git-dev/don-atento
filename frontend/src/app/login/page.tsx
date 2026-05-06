"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { authService } from "@/services/authService";
import { API_URL } from "@/lib/config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Pre-warm the backend
  useEffect(() => {
    fetch(`${API_URL}/`).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await authService.login(email, password);
      window.location.href = redirect;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#0a0a0a' }}
    >
      {/* Left Panel — Brand */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-14"
        style={{ background: '#0f0f0f', borderRight: '1px solid #1e1e1e' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 flex items-center justify-center"
            style={{ background: '#ffffff', borderRadius: 0 }}
          >
            <span className="text-[11px] font-black text-black tracking-tight">IQ</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Don IQ</span>
        </div>

        <div>
          <p
            className="text-[10px] font-mono uppercase tracking-widest mb-6"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            Arquitectura Cognitiva Inmobiliaria
          </p>
          <h1
            className="text-white leading-none mb-6"
            style={{
              fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
            }}
          >
            Cada reparación,<br />bajo control.<br />
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>En tiempo real.</span>
          </h1>
          <div
            className="flex items-center gap-6 text-[11px] font-mono"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            <span>— Gestion de Tickets</span>
            <span>— IA Cognitiva</span>
            <span>— ANS Automatizado</span>
          </div>
        </div>

        <div
          className="text-[10px] font-mono"
          style={{ color: 'rgba(255,255,255,0.18)' }}
        >
          © 2025 Teus S.A.S · Don IQ Platform
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-12 lg:hidden">
            <div className="w-7 h-7 flex items-center justify-center"
              style={{ background: '#ffffff', borderRadius: 0 }}>
              <span className="text-[11px] font-black text-black">IQ</span>
            </div>
            <span className="text-sm font-bold text-white">Don IQ</span>
          </div>

          <div className="mb-10">
            <p
              className="text-[10px] font-mono uppercase tracking-widest mb-3"
              style={{ color: 'rgba(255,255,255,0.30)' }}
            >
              Acceso al Sistema
            </p>
            <h2
              className="text-white"
              style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}
            >
              Ingresa a tu cuenta
            </h2>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-6 px-4 py-3 text-xs font-medium flex items-start gap-2"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                borderRadius: 0,
              }}
            >
              <span className="flex-shrink-0 mt-0.5">✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,255,255,0.40)' }}
              >
                Correo Electrónico
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                className="w-full outline-none text-sm text-white transition-colors"
                style={{
                  background: '#0f0f0f',
                  border: '1px solid #2a2a2a',
                  borderRadius: 0,
                  padding: '11px 14px',
                  fontFamily: '"Inter", sans-serif',
                  letterSpacing: '-0.01em',
                }}
                onFocus={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.40)')}
                onBlur={e   => (e.currentTarget.style.borderColor = '#2a2a2a')}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,255,255,0.40)' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full outline-none text-sm text-white transition-colors"
                  style={{
                    background: '#0f0f0f',
                    border: '1px solid #2a2a2a',
                    borderRadius: 0,
                    padding: '11px 42px 11px 14px',
                    fontFamily: '"Inter", sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.40)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = '#2a2a2a')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  tabIndex={-1}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.60)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)')}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest transition-all mt-2"
              style={{
                background: loading ? 'rgba(255,255,255,0.70)' : '#ffffff',
                color: '#0a0a0a',
                border: '1px solid #ffffff',
                borderRadius: 0,
                padding: '13px 20px',
                letterSpacing: '0.08em',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <p
            className="text-center text-[11px] mt-8"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            ¿Problemas para acceder? Contacta a tu administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0a0a' }} />}>
      <LoginForm />
    </Suspense>
  );
}
