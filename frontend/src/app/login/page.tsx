"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { authService, UserRole } from "@/services/authService";

export default function LoginAgency() {
  const [roleSelection, setRoleSelection] = useState<UserRole>("ADMIN_TENANT");
  const [email, setEmail] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Simulate real login
    authService.loginAs(roleSelection);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-neon-blue)] rounded-full blur-[150px] opacity-20 pointer-events-none" />
      
      <div className="glass p-10 rounded-3xl max-w-md w-full relative z-10 border border-white/10 shadow-[0_0_40px_rgba(0,112,243,0.1)] animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[var(--color-neon-blue)]">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Ingreso a la Inmobiliaria</h1>
          <p className="text-xs text-gray-400">Plataforma Operativa Don IQ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
           <div className="p-4 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/20 rounded-xl mb-4">
            <p className="text-xs text-[var(--color-neon-blue)] text-center font-medium">
              Demo Mode: Selecciona qué rol de la inmobiliaria deseas simular para acceder al sistema.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Rol Corporativo</label>
            <select 
              value={roleSelection}
              onChange={(e) => setRoleSelection(e.target.value as UserRole)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 transition-colors appearance-none"
            >
              <option value="ADMIN_TENANT">🏢 Administrador de la Agencia</option>
              <option value="AGENT">💼 Asesor Comercial (CRM)</option>
              <option value="TECHNICIAN">🔧 Técnico / Proveedor (Tickets)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 transition-colors"
              placeholder="admin@miagencia.com"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--color-neon-blue)] text-white rounded-xl py-3 font-bold text-sm tracking-wide hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.3)] mt-4"
          >
            INGRESAR AL SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
}
