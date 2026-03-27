"use client";

import React, { useEffect, useState } from "react";
import { Ticket, Building2, TrendingUp, AlertCircle, RefreshCcw } from "lucide-react";
import OperationalChart from "./OperationalChart";
import { tenantService } from "@/services/tenantService";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const currentTenant = tenantService.getCurrentTenant();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Gerencial</h1>
            <div className="px-2 py-0.5 rounded-md bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/50 text-[10px] text-[var(--color-neon-cyan)] font-mono uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(0,112,243,0.3)]">
                <RefreshCcw size={10} /> {mounted ? (currentTenant?.name || 'Inmobiliaria no seleccionada') : 'Cargando...'}
            </div>
          </div>
          <p className="text-gray-400 mt-1">Visión transversal de Finanzas, Operaciones y Satisfacción</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard title="Ingresos YTD" value="$0" trend="Sin datos" icon={<TrendingUp className="text-[var(--color-neon-blue)]" size={24} />} trendUp={true} />
        <KpiCard title="Tickets Críticos" value="0" trend="Sin reportes" icon={<AlertCircle className="text-red-400" size={24} />} trendUp={false} danger={false} />
        <KpiCard title="Ocupación Inmuebles" value="0%" trend="Sin unidades" icon={<Building2 className="text-[var(--color-neon-purple)]" size={24} />} trendUp={true} />
        <KpiCard title="SLA Proveedores" value="0%" trend="Sin evaluaciones" icon={<Ticket className="text-[var(--color-neon-cyan)]" size={24} />} trendUp={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-[2rem] p-8 border border-white/5 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Salud Operativa (Resolución IA vs Humano)</h3>
          </div>
          <div className="flex-1 w-full"><OperationalChart /></div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/5 flex flex-col">
          <h3 className="text-lg font-medium mb-4">Métricas de Satisfacción IA</h3>
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-48 h-48 rounded-full border-[15px] border-white/5 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-[15px] border-[var(--color-neon-cyan)] border-b-transparent border-l-transparent rotate-45 pointer-events-none drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]"></div>
              <div className="text-center">
                <span className="text-4xl font-black text-white">0.0</span>
                <p className="text-xs text-gray-400 mt-1 uppercase font-mono tracking-widest">Estrellas</p>
              </div>
            </div>
            <p className="text-sm text-center text-gray-400 mt-6 px-4">Análisis de sentimiento general pendiente de interacciones.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, trendUp, danger }: any) {
  return (
    <div className="glass p-6 rounded-2xl border border-white/5 hover:border-white/10 relative overflow-hidden group transition-all duration-300">
      <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">{icon}</div>
      <h3 className="text-gray-400 text-sm font-medium mb-2 relative z-10">{title}</h3>
      <div className="text-3xl font-bold mb-2 relative z-10 text-white">{value}</div>
      <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block relative z-10 ${danger ? "bg-red-500/10 text-red-400" : trendUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
        {trend}
      </div>
    </div>
  );
}
