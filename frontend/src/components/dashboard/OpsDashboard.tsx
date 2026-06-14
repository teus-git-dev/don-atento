"use client";

import { Wrench, ShieldAlert, Clock, Activity } from "lucide-react";

export default function OpsDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2937] mb-1.5">Centro de Operaciones</h1>
        <p className="text-sm font-medium text-gray-500">Mantenimiento, tickets y triage con inteligencia artificial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard title="Tickets Activos" value="0" desc="0 Críticos" icon={<Activity className="text-red-500" size={28} />} danger={false} />
        <KpiCard title="SLA Promedio" value="0 Hrs" desc="Sin datos" icon={<Clock className="text-[#1E3A8A]" size={28} />} />
        <KpiCard title="Proveedores en Terreno" value="0" desc="Sin actividad" icon={<Wrench className="text-orange-500" size={28} />} />
        <KpiCard title="Daños Detectados" value="0" desc="Visión artificial" icon={<ShieldAlert className="text-purple-500" size={28} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-[#1F2937] mb-6">Fila de Prioridad Operativa (Triage IA)</h3>
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-bold text-xs uppercase tracking-widest">
                No hay tickets en la fila de prioridad
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-2 bg-[#1E3A8A]"></div>
          <h3 className="text-lg font-bold text-[#1F2937] mb-4 mt-2">Desempeño Control de Proveedores</h3>
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 font-bold text-xs uppercase tracking-widest">
              Sin métricas de proveedores
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ id, title, urgency, time, iaDiagnosis }: any) {
  const getUrgencyBadge = () => {
    if (urgency === 'CRITICAL') return 'bg-red-50 text-red-600 border border-red-200';
    if (urgency === 'HIGH') return 'bg-orange-50 text-orange-600 border border-orange-200';
    return 'bg-blue-50 text-blue-600 border border-blue-200';
  };

  return (
    <div className="bg-gray-50 hover:bg-white border border-gray-100 hover:border-[#1E3A8A]/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:shadow-md">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getUrgencyBadge()}`}>{urgency}</span>
          <span className="text-[11px] text-gray-500 font-bold uppercase bg-gray-200 px-1.5 py-0.5 rounded">{id}</span>
          <span className="text-[11px] font-semibold text-gray-400">{time}</span>
        </div>
        <h4 className="text-[13px] font-bold text-[#1F2937]">{title}</h4>
        <p className="text-[12px] text-[#1E3A8A] font-medium mt-1 truncate max-w-md">🤖 Triage: {iaDiagnosis}</p>
      </div>
      <button className="px-4 py-2 bg-white hover:bg-gray-50 text-[#1F2937] text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-gray-200 shadow-sm whitespace-nowrap">
        Asignar Proveedor
      </button>
    </div>
  );
}

function ProviderStat({ name, score, jobs, warning }: any) {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1.5">
        <span className="text-[#1F2937] font-bold">{name}</span>
        <span className={warning ? "text-orange-500 font-bold" : "text-[#10B981] font-bold"}>{score}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${warning ? "bg-orange-500" : "bg-[#1E3A8A]"}`} style={{ width: score }}></div>
      </div>
      <span className="text-[11px] font-medium text-gray-500">{jobs} técnicos despachados este mes</span>
    </div>
  );
}

function KpiCard({ title, value, desc, icon, danger }: any) {
  return (
    <div className={`bg-white p-5 rounded-xl border transition-all hover:shadow-md ${danger ? "border-red-200 shadow-sm shadow-red-100" : "border-gray-200 shadow-sm"}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{title}</h3>
        {icon}
      </div>
      <div className="text-3xl font-black text-[#1F2937] mb-1.5">{value}</div>
      <div className="text-[11px] font-semibold text-gray-400 uppercase">{desc}</div>
    </div>
  );
}
