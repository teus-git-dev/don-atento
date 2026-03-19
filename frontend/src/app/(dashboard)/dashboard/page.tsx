"use client";

import { Ticket, Building2, TrendingUp, AlertCircle, RefreshCcw } from "lucide-react";
import OperationalChart from "@/components/dashboard/OperationalChart";
import { tenantService } from "@/services/tenantService";

export default function DashboardOverview() {
  const currentTenant = tenantService.getCurrentTenant();

  return (
    <div className="space-y-6 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard General</h1>
            <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-gray-500 uppercase flex items-center gap-1">
                <RefreshCcw size={10} /> {currentTenant.name}
            </div>
          </div>
          <p className="text-gray-400 mt-1">Resumen operativo y cognitivo de la cartera</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[var(--color-neon-cyan)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-neon-cyan)]"></span>
          </span>
          <span className="text-sm font-mono text-[var(--color-neon-cyan)] tracking-wider uppercase">IA Activa</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KpiCard 
          title="Inmuebles Activos"
          value="1,248"
          trend="+12% este mes"
          icon={<Building2 className="text-[var(--color-neon-blue)]" size={24} />}
          trendUp={true}
        />
        <KpiCard 
          title="Tickets Abiertos"
          value="84"
          trend="-5% vs ayer"
          icon={<Ticket className="text-[var(--color-neon-purple)]" size={24} />}
          trendUp={false}
          warning={true}
        />
        <KpiCard 
          title="Valor del Portafolio"
          value="$45M"
          trend="+3.2% YTD"
          icon={<TrendingUp className="text-[var(--color-neon-cyan)]" size={24} />}
          trendUp={true}
        />
        <KpiCard 
          title="Alertas IA"
          value="3"
          trend="Atención requerida"
          icon={<AlertCircle className="text-red-400" size={24} />}
          trendUp={false}
          danger={true}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="lg:col-span-2 glass rounded-[2rem] p-8 border border-white/5 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white">Rendimiento Operativo (IA vs Humano)</h3>
            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-neon-blue)]"></div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Resueltos IA</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-dashed border-[var(--color-neon-cyan)]"></div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tickets Totales</span>
                </div>
            </div>
          </div>
          <div className="flex-1 w-full">
            <OperationalChart />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass rounded-2xl p-6 border border-white/5 h-[400px] flex flex-col">
          <h3 className="text-lg font-medium mb-4">Actividad Cognitiva</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            
            <ActivityItem 
              time="Hace 5 min"
              title="Ticket Autoresuelto"
              desc="La IA negoció un descuento del 15% con el plomero para el Inmueble 104."
              type="success"
            />
            <ActivityItem 
              time="Hace 32 min"
              title="Alerta de Inquilino"
              desc="Sentimiento negativo detectado en WhatsApp de arrendatario Edificio A."
              type="warning"
            />
            <ActivityItem 
              time="Hace 1 hr"
              title="Nuevo Contrato Drafteado"
              desc="Primer borrador de contrato generado automáticamente para Local 2."
              type="info"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, trendUp, warning, danger }: any) {
  return (
    <div className="glass p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-300 group-hover:opacity-40">
        {icon}
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-2 relative z-10">{title}</h3>
      <div className="text-3xl font-bold mb-2 relative z-10">{value}</div>
      <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block relative z-10 ${
        danger ? "bg-red-500/10 text-red-400" :
        warning ? "bg-yellow-500/10 text-yellow-500" :
        trendUp ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
      }`}>
        {trend}
      </div>
    </div>
  );
}

function ActivityItem({ time, title, desc, type }: any) {
  const getDotColor = () => {
    switch(type) {
      case 'success': return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]';
      case 'warning': return 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      case 'info': return 'bg-[var(--color-neon-blue)] shadow-[0_0_8px_rgba(0,112,243,0.5)]';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex gap-4">
      <div className="mt-1.5 flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full ${getDotColor()}`}></div>
        <div className="w-px h-full bg-white/10 mt-2"></div>
      </div>
      <div className="pb-4">
        <p className="text-xs text-gray-500 font-mono mb-1">{time}</p>
        <p className="text-sm font-medium text-gray-200">{title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
