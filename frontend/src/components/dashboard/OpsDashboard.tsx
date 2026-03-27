"use client";

import { Wrench, ShieldAlert, Clock, Activity } from "lucide-react";

export default function OpsDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Centro de Operaciones</h1>
        <p className="text-gray-400">Mantenimiento, tickets y triage con inteligencia artificial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard title="Tickets Activos" value="0" desc="0 Críticos" icon={<Activity className="text-red-400" size={24} />} danger={false} />
        <KpiCard title="SLA Promedio" value="0 Hrs" desc="Sin datos" icon={<Clock className="text-blue-400" size={24} />} />
        <KpiCard title="Proveedores en Terreno" value="0" desc="Sin actividad" icon={<Wrench className="text-yellow-400" size={24} />} />
        <KpiCard title="Daños Detectados (Visión)" value="0" desc="Sin reportes" icon={<ShieldAlert className="text-purple-400" size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-[2rem] p-6 border border-white/5">
          <h3 className="text-lg font-bold text-white mb-6">Fila de Prioridad Operativa (Triage IA)</h3>
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 font-mono text-xs uppercase tracking-widest opacity-50">
                No hay tickets en la fila de prioridad
            </div>
          </div>
        </div>

        <div className="glass rounded-[2rem] p-6 border border-white/5 bg-[var(--color-neon-blue)]/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-neon-blue)] rounded-full blur-[60px] opacity-20"></div>
          <h3 className="text-lg font-bold text-white mb-4">Desempeño Control de Proveedores</h3>
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 font-mono text-xs uppercase tracking-widest opacity-50">
              Sin métricas de proveedores
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ id, title, urgency, time, iaDiagnosis }: any) {
  const getUrgencyBadge = () => {
    if (urgency === 'CRITICAL') return 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
    if (urgency === 'HIGH') return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
  };

  return (
    <div className="bg-black/20 hover:bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getUrgencyBadge()}`}>{urgency}</span>
          <span className="text-xs text-gray-500 font-mono">{id}</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-[var(--color-neon-cyan)] mt-1 truncate max-w-md">🤖 Triage: {iaDiagnosis}</p>
      </div>
      <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-lg transition-colors border border-white/10 whitespace-nowrap">
        Asignar Proveedor
      </button>
    </div>
  );
}

function ProviderStat({ name, score, jobs, warning }: any) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 font-medium">{name}</span>
        <span className={warning ? "text-yellow-400 font-bold" : "text-green-400 font-bold"}>{score}</span>
      </div>
      <div className="w-full bg-black/40 rounded-full h-1.5 mb-1 overflow-hidden">
        <div className={`h-1.5 rounded-full ${warning ? "bg-yellow-400" : "bg-[var(--color-neon-blue)]"}`} style={{ width: score }}></div>
      </div>
      <span className="text-[10px] text-gray-500">{jobs} técnicos despachados este mes</span>
    </div>
  );
}

function KpiCard({ title, value, desc, icon, danger }: any) {
  return (
    <div className={`glass p-5 rounded-2xl border transition-colors ${danger ? "border-red-500/30 bg-red-500/5" : "border-white/5"}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</h3>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500">{desc}</div>
    </div>
  );
}
