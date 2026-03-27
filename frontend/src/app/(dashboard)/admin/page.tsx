"use client";

import TenantManager from '@/components/admin/TenantManager';
import { ShieldCheck, Users, Zap, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { tenantService, PLAN_PRICES } from '@/services/tenantService';
import { useState, useEffect } from "react";

export default function SuperAdminPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const tenants = mounted ? tenantService.getTenants() : [];
  const tenantCount = tenants.length;
  
  const mrr = tenants.reduce((acc, t) => {
    const price = t.plan === 'pro' ? PLAN_PRICES.pro : (t.plan === 'basic' ? PLAN_PRICES.basic : PLAN_PRICES.enterprise);
    return acc + (t.status === 'active' ? price : 0);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Consola de Control Teus</h1>
          <p className="text-gray-400 mt-1">Gestión global de infraestructura y clientes multitenant</p>
        </div>
        <div className="flex items-center gap-3 glass px-4 py-2 rounded-2xl border border-[var(--color-neon-blue)]/20">
          <ShieldCheck className="text-[var(--color-neon-blue)]" size={20} />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-neon-blue)]">Acceso SuperAdmin Verificado</span>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlobalKpiCard 
          title="Inmobiliarias"
          value={tenantCount.toString()}
          subValue={`${tenants.filter(t => t.status === 'active').length} Activas`}
          icon={<Users size={24} className="text-[var(--color-neon-cyan)]" />}
        />
        <GlobalKpiCard 
          title="MRR Teus"
          value={`$${mrr.toLocaleString()}`}
          subValue="Facturación Proyectada"
          icon={<DollarSign size={24} className="text-green-400" />}
        />
      </div>

      {/* Tenant Management Section */}
      <div className="glass p-8 rounded-[2rem] border border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="text-[var(--color-neon-cyan)]" size={24} />
            <h2 className="text-xl font-bold text-white">Gestión de Tenants</h2>
        </div>
        <TenantManager />
      </div>

      {/* Technical Status Overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Carga de Infraestructura IA</h4>
            <div className="h-48 flex items-end gap-2 px-2">
                {[5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5].map((h, i) => (
                    <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group transition-all hover:bg-[var(--color-neon-blue)]/40" style={{ height: `${h}%` }}>
                        <div className="absolute inset-0 bg-[var(--color-neon-blue)] opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest pl-2 pr-2">
                <span>00:00</span>
                <span>Actual</span>
            </div>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-center gap-6">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Status de API WhatsApp</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-sm font-mono text-white">CONECTADO</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Tubería RAG (Vector DB)</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-sm font-mono text-white">OPTIMIZADO (1.2ms)</span>
                    </div>
                </div>
                <button className="w-full bg-white/5 border border-white/10 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                    Reiniciar Clúster Cognitivo
                </button>
          </div>
      </div>
    </div>
  );
}

function GlobalKpiCard({ title, value, subValue, icon }: any) {
    return (
        <div className="glass p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent relative group">
            <div className="mb-4">{icon}</div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{title}</h3>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-[10px] text-[var(--color-neon-cyan)] font-mono">{subValue}</div>
        </div>
    );
}
