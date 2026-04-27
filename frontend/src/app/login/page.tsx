"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
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

  // Pre-warm the backend to mitigate Render.com free tier cold starts
  useEffect(() => {
    fetch(`${API_URL}/`).catch(() => {
      // Ignore errors, we just want to wake up the server while the user types
    });
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      {/* Background FX */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-neon-blue)] rounded-full blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-[var(--color-neon-cyan)] rounded-full blur-[120px] opacity-15 pointer-events-none" />

      <div className="glass p-10 rounded-3xl max-w-md w-full relative z-10 border border-white/10 shadow-[0_0_40px_rgba(0,112,243,0.1)] animate-in fade-in zoom-in-95 duration-500">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[var(--color-neon-blue)]">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Ingreso a la Inmobiliaria
          </h1>
          <p className="text-xs text-gray-400">Plataforma Operativa Don IQ</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in duration-300">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Correo Electrónico
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 transition-colors placeholder-gray-600"
              placeholder="admin@miagencia.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
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
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 transition-colors placeholder-gray-600"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-neon-blue)] text-white rounded-xl py-3 font-bold text-sm tracking-wide hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.3)] mt-4 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                VERIFICANDO...
              </>
            ) : (
              "INGRESAR AL SISTEMA"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          ¿Problemas para acceder? Contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}

export default function LoginAgency() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
