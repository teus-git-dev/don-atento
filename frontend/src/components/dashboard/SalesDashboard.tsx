"use client";

import { Target, Users, MessagesSquare, Flame } from "lucide-react";

export default function SalesDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F2937] mb-1.5">CRM Comercial</h1>
        <p className="text-sm font-medium text-gray-500">Captación de prospectos y embudos de arrendamiento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard title="Leads Nuevos Hoy" value="0" icon={<Users className="text-[#1E3A8A]" size={28} />} glow="blue" />
        <KpiCard title="Cierres Mes" value="0" icon={<Target className="text-[#10B981]" size={28} />} glow="green" />
        <KpiCard title="Tasa Conversión IA" value="0%" icon={<Flame className="text-orange-500" size={28} />} glow="orange" />
        <KpiCard title="Chats Activos" value="0" icon={<MessagesSquare className="text-blue-500" size={28} />} glow="lightBlue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        <KanbanLane title="NUEVOS LEAD" count={0} color="border-[#1E3A8A]" headerBg="bg-[#1E3A8A]/5" />
        <KanbanLane title="CALIFICADOS (IA)" count={0} color="border-blue-400" headerBg="bg-blue-50" />
        <KanbanLane title="EN NEGOCIACIÓN" count={0} color="border-orange-400" headerBg="bg-orange-50" />
        <KanbanLane title="CERRADOS (WIN)" count={0} color="border-[#10B981]" headerBg="bg-[#10B981]/5" />
      </div>
    </div>
  );
}

function KanbanLane({ title, count, color, headerBg }: any) {
  return (
    <div className={`bg-white rounded-xl p-4 border-t-4 shadow-sm border border-gray-200 ${color} flex flex-col h-full`}>
      <div className={`flex justify-between items-center mb-5 p-2 rounded-md ${headerBg}`}>
        <h3 className="text-[11px] font-bold text-[#1F2937] tracking-widest uppercase">{title}</h3>
        <span className="bg-white border border-gray-200 text-[#1F2937] text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{count}</span>
      </div>
      <div className="space-y-3 flex-1">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-4 hover:border-[#1E3A8A]/30 hover:shadow-md transition-all cursor-pointer group">
            <h4 className="text-[13px] font-bold text-[#1F2937] mb-1">Inmueble {100 + i} - Arriendo</h4>
            <p className="text-[11px] font-medium text-gray-500 mb-3">Cliente: Juan Pérez</p>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">Hace 2 horas</span>
              <span className="text-[11px] font-bold text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity">Ver lead →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, glow }: any) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-[#1E3A8A]/30 relative overflow-hidden group transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
          <div className="text-3xl font-black text-[#1F2937]">{value}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      </div>
    </div>
  );
}
