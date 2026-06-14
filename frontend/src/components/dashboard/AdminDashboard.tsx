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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#1F2937]">Dashboard Gerencial</h1>
            <div className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-[10px] text-[#1E3A8A] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCcw size={12} className="text-[#1E3A8A]" /> {mounted ? (currentTenant?.name || 'Inmobiliaria no seleccionada') : 'Cargando...'}
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Visión transversal de Finanzas, Operaciones y Satisfacción</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard title="Ingresos YTD" value="$0" trend="Sin datos" icon={<TrendingUp className="text-[#10B981]" size={28} />} trendUp={true} />
        <KpiCard title="Tickets Críticos" value="0" trend="Sin reportes" icon={<AlertCircle className="text-red-500" size={28} />} trendUp={false} danger={false} />
        <KpiCard title="Ocupación Inmuebles" value="0%" trend="Sin unidades" icon={<Building2 className="text-[#1E3A8A]" size={28} />} trendUp={true} />
        <KpiCard title="SLA Proveedores" value="0%" trend="Sin evaluaciones" icon={<Ticket className="text-[#1E3A8A]" size={28} />} trendUp={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-[#1F2937]">Salud Operativa (Resolución IA vs Humano)</h3>
          </div>
          <div className="flex-1 w-full"><OperationalChart /></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-[#1F2937] mb-4">Métricas de Satisfacción IA</h3>
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-48 h-48 rounded-full border-[15px] border-gray-100 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-[15px] border-[#10B981] border-b-transparent border-l-transparent rotate-45 pointer-events-none"></div>
              <div className="text-center">
                <span className="text-4xl font-black text-[#1F2937]">0.0</span>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Estrellas</p>
              </div>
            </div>
            <p className="text-sm text-center text-gray-500 mt-6 px-4 font-medium">Análisis de sentimiento general pendiente de interacciones.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, trendUp, danger }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-[#1E3A8A]/30 relative overflow-hidden group transition-all duration-300">
      <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-500">{icon}</div>
      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">{title}</h3>
      <div className="text-3xl font-black mb-3 relative z-10 text-[#1F2937]">{value}</div>
      <div className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-block relative z-10 ${danger ? "bg-red-50 text-red-600 border border-red-100" : trendUp ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
        {trend}
      </div>
    </div>
  );
}
