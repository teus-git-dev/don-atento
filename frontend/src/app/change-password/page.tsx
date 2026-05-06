"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { authService } from "@/services/authService";
import { API_URL } from "@/lib/config";

const REQUIREMENTS = [
  { label: "Mínimo 12 caracteres",             regex: /.{12,}/ },
  { label: "Al menos una mayúscula",            regex: /[A-Z]/ },
  { label: "Al menos una minúscula",            regex: /[a-z]/ },
  { label: "Al menos un número",               regex: /\d/ },
  { label: "Al menos un símbolo (@#$!%*?&)",   regex: /[@#$!%*?&^+\-=]/ },
];

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPass, setConfirmPass]     = useState("");
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [done, setDone]                   = useState(false);

  const meetsRequirement = (req: { regex: RegExp }) => req.regex.test(newPassword);
  const allMet = REQUIREMENTS.every(meetsRequirement) && newPassword === confirmPass && confirmPass.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allMet) return;

    setLoading(true);
    setError(null);

    try {
      const token = authService.getToken();
      const res = await fetch(`${API_URL}/tenants/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword, confirmPassword: confirmPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Error al cambiar la contraseña.");
      }

      setDone(true);

      // Delay for visual confirmation, then redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0a0a" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
            style={{ background: "#ffffff", borderRadius: 0 }}
          >
            <ShieldCheck size={28} color="#0a0a0a" />
          </div>
          <h2
            className="text-white mb-2"
            style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}
          >
            Contraseña actualizada
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
            Redirigiendo al panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#0a0a0a" }}
    >
      {/* Left info panel */}
      <div
        className="hidden lg:flex w-2/5 flex-col justify-between p-14"
        style={{ background: "#0f0f0f", borderRight: "1px solid #1e1e1e" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center"
            style={{ background: "#ffffff", borderRadius: 0 }}>
            <span className="text-[11px] font-black text-black">IQ</span>
          </div>
          <span className="text-sm font-bold text-white">Don IQ</span>
        </div>

        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-4"
            style={{ color: "rgba(255,255,255,0.25)" }}>
            Seguridad de Cuenta
          </p>
          <h1
            className="text-white mb-6"
            style={{ fontSize: "clamp(1.8rem,3vw,2.5rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            Establece tu<br />contraseña<br />
            <span style={{ color: "rgba(255,255,255,0.30)" }}>definitiva.</span>
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)", lineHeight: 1.7 }}>
            Tu cuenta fue creada con una contraseña temporal de un solo uso.
            Define ahora tu contraseña personal para acceder al sistema de forma segura.
          </p>
        </div>

        <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
          © 2025 Teus S.A.S · Seguridad Enterprise
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 flex items-center justify-center" style={{ background: "#fff", borderRadius: 0 }}>
              <span className="text-[11px] font-black text-black">IQ</span>
            </div>
            <span className="text-sm font-bold text-white">Don IQ</span>
          </div>

          <div className="mb-8">
            <p className="text-[10px] font-mono uppercase tracking-widest mb-2"
              style={{ color: "rgba(255,255,255,0.30)" }}>
              Acción Requerida
            </p>
            <h2 className="text-white"
              style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
              Cambio de Contraseña<br />Obligatorio
            </h2>
          </div>

          {error && (
            <div
              className="mb-5 px-4 py-3 text-xs font-medium flex items-start gap-2"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", borderRadius: 0 }}
            >
              <span className="flex-shrink-0 mt-0.5">✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "rgba(255,255,255,0.40)" }}>
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full outline-none text-sm text-white"
                  style={{
                    background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 0,
                    padding: "11px 42px 11px 14px", fontFamily: '"Inter", sans-serif',
                  }}
                  onFocus={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.40)")}
                  onBlur={e   => (e.currentTarget.style.borderColor = "#2a2a2a")}
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.25)" }} tabIndex={-1}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Requirements checklist */}
            {newPassword.length > 0 && (
              <div className="space-y-1.5 py-3 px-4" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
                {REQUIREMENTS.map(req => {
                  const met = meetsRequirement(req);
                  return (
                    <div key={req.label} className="flex items-center gap-2 text-[11px]"
                      style={{ color: met ? "#22c55e" : "rgba(255,255,255,0.30)" }}>
                      <span style={{ fontWeight: 700 }}>{met ? "✓" : "·"}</span>
                      {req.label}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "rgba(255,255,255,0.40)" }}>
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full outline-none text-sm text-white"
                  style={{
                    background: "#0f0f0f",
                    border: `1px solid ${confirmPass.length > 0 ? (confirmPass === newPassword ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)") : "#2a2a2a"}`,
                    borderRadius: 0,
                    padding: "11px 42px 11px 14px",
                    fontFamily: '"Inter", sans-serif',
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.25)" }} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPass.length > 0 && confirmPass !== newPassword && (
                <p className="mt-1.5 text-[11px]" style={{ color: "rgba(239,68,68,0.8)" }}>
                  Las contraseñas no coinciden.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="submit-password-change"
              type="submit"
              disabled={!allMet || loading}
              className="w-full flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest transition-all mt-2"
              style={{
                background: allMet && !loading ? "#ffffff" : "rgba(255,255,255,0.20)",
                color: allMet && !loading ? "#0a0a0a" : "rgba(255,255,255,0.35)",
                border: "1px solid transparent",
                borderRadius: 0,
                padding: "13px 20px",
                letterSpacing: "0.08em",
                cursor: !allMet || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Actualizando...</>
                : <><ShieldCheck size={14} /> Confirmar Contraseña <ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
