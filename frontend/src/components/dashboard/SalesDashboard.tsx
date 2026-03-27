"use client";

import { Target, Users, MessagesSquare, Flame } from "lucide-react";

export default function SalesDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">CRM Comercial</h1>
        <p className="text-gray-400">Captación de prospectos y embudos de arrendamiento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard title="Leads Nuevos Hoy" value="0" icon={<Users className="text-purple-400" size={24} />} glow="purple" />
        <KpiCard title="Cierres Mes" value="0" icon={<Target className="text-green-400" size={24} />} glow="green" />
        <KpiCard title="Tasa Conversión IA" value="0%" icon={<Flame className="text-orange-400" size={24} />} glow="orange" />
        <KpiCard title="Chats Activos" value="0" icon={<MessagesSquare className="text-blue-400" size={24} />} glow="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        <KanbanLane title="NUEVOS LEAD" count={0} color="border-purple-500/50" />
        <KanbanLane title="CALIFICADOS (IA)" count={0} color="border-blue-500/50" />
        <KanbanLane title="EN NEGOCIACIÓN" count={0} color="border-orange-500/50" />
        <KanbanLane title="CERRADOS (WIN)" count={0} color="border-green-500/50" />
      </div>
    </div>
  );
}

function KanbanLane({ title, count, color }: any) {
  return (
    <div className={`glass rounded-2xl p-4 border-t-4 border-white/5 ${color} flex flex-col h-full bg-gradient-to-b from-white/5 to-transparent`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-bold text-gray-300 tracking-widest">{title}</h3>
        <span className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-3 flex-1">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer group">
            <h4 className="text-sm font-bold text-white mb-1">Inmueble {100 + i} - Arriendo</h4>
            <p className="text-xs text-gray-400 mb-3">Cliente: Juan Pérez</p>
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md">Hace 2 horas</span>
              <span className="text-xs text-[var(--color-neon-cyan)] opacity-0 group-hover:opacity-100 transition-opacity">Ver lead →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, glow }: any) {
  const getGlowClass = () => {
    switch(glow) {
      case 'purple': return 'shadow-[0_0_15px_rgba(168,85,247,0.15)]';
      case 'green': return 'shadow-[0_0_15px_rgba(74,222,128,0.15)]';
      case 'orange': return 'shadow-[0_0_15px_rgba(249,115,22,0.15)]';
      case 'blue': return 'shadow-[0_0_15px_rgba(59,130,246,0.15)]';
    }
  };

  return (
    <div className={`glass p-6 rounded-2xl border border-white/5 relative overflow-hidden ${getGlowClass()}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
          <div className="text-3xl font-bold text-white">{value}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">{icon}</div>
      </div>
    </div>
  );
}
