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
    <div className="min-h-screen flex bg-[#F3F4F6]">
      {/* Left Panel — Brand (Navy Blue) */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-14 bg-[#1E3A8A] text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm">
            <span className="text-[13px] font-black text-[#1E3A8A] tracking-tight">DA</span>
          </div>
          <span className="text-base font-bold tracking-tight">DonAtento</span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-6 text-white/70">
            Arquitectura Cognitiva Inmobiliaria
          </p>
          <h1 className="leading-tight mb-8" style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Cada reparación,<br />bajo control.<br />
            <span className="text-white/50">En tiempo real.</span>
          </h1>
          <div className="flex items-center gap-6 text-[12px] font-medium text-white/70">
            <span>— Gestión de Tickets</span>
            <span>— IA Cognitiva</span>
            <span>— ANS Automatizado</span>
          </div>
        </div>

        <div className="text-[11px] font-medium text-white/50">
          © 2025 Teus S.A.S · Plataforma DonAtento
        </div>
      </div>

      {/* Right Panel — Form (Light Gray Background) */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden justify-center">
            <div className="w-8 h-8 flex items-center justify-center bg-[#1E3A8A] rounded shadow-sm">
              <span className="text-[13px] font-black text-white tracking-tight">DA</span>
            </div>
            <span className="text-xl font-bold text-[#1F2937]">DonAtento</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2 text-[#6B7280]">
              Acceso al Sistema
            </p>
            <h2 className="text-[#1F2937]" style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Ingresa a tu cuenta
            </h2>
          </div>

          {/* Form Container (White Card) */}
          <div className="bg-white p-8 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100">
            {/* Error */}
            {error && (
              <div className="mb-6 px-4 py-3 text-[13px] font-medium flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg">
                <span className="flex-shrink-0 mt-0.5">✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[12px] font-bold uppercase tracking-wider mb-2 text-[#4B5563]"
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
                  className="w-full outline-none text-sm text-[#1F2937] transition-all bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
                  style={{ padding: '12px 16px' }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[12px] font-bold uppercase tracking-wider mb-2 text-[#4B5563]"
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
                    className="w-full outline-none text-sm text-[#1F2937] transition-all bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
                    style={{ padding: '12px 42px 12px 16px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1E3A8A] transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit (Emerald Green) */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-[13px] font-bold uppercase tracking-wider transition-all mt-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-[#10B981]/20"
                style={{ padding: '14px 20px' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Ingresar al Sistema
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[12px] mt-8 text-[#6B7280]">
            ¿Problemas para acceder? Contacta a tu administrador.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F3F4F6]" />}>
      <LoginForm />
    </Suspense>
  );
}
