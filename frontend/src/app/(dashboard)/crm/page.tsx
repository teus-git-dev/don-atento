"use client";

import { useState, useEffect } from "react";
import { Users, Target, MessageSquare, TrendingUp, Filter, Search, Plus, UserPlus } from "lucide-react";
import FunnelChart from "@/components/crm/FunnelChart";
import { tenantService } from "@/services/tenantService";

export default function CrmDashboard() {
  const currentTenant = tenantService.getCurrentTenant();
  const [funnelData, setFunnelData] = useState([
    { status: 'NEW', count: 45 },
    { status: 'QUALIFIED', count: 32 },
    { status: 'NEGOTIATION', count: 18 },
    { status: 'CLOSED_WON', count: 12 },
    { status: 'CLOSED_LOST', count: 5 },
  ]);

  const [sentimentData, setSentimentData] = useState([
      { sentiment: 'POSITIVE', count: 24, icon: "😊", color: "text-green-400" },
      { sentiment: 'NEUTRAL', count: 15, icon: "😐", color: "text-blue-400" },
      { sentiment: 'NEGATIVE', count: 6, icon: "😠", color: "text-red-400" },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Target className="text-[var(--color-neon-cyan)]" /> CRM Prospectos
          </h1>
          <p className="text-gray-400 mt-1">Gestión de leads y análisis de conversión omnicanal</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all pointer-events-none opacity-50">
                <Filter size={16} /> Filtros
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                <UserPlus size={16} /> Nuevo Prospecto
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Leads" value="112" sub="Omnicanal" icon={<Users className="text-blue-400" />} />
          <StatCard title="Tasa Conversión" value="10.7%" sub="+2.1% este mes" icon={<TrendingUp className="text-green-400" />} />
          <StatCard title="Interacciones" value="458" sub="Última semana" icon={<MessageSquare className="text-purple-400" />} />
          <StatCard title="Tiempo Cierre" value="4.2d" sub="-0.5d avg" icon={<Target className="text-orange-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funnel Card */}
          <div className="lg:col-span-2 glass rounded-[2rem] p-8 border border-white/5 flex flex-col min-h-[400px]">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-sm opacity-70">Funnel de Ventas</h3>
              <div className="flex-1 w-full">
                  <FunnelChart data={funnelData} />
              </div>
          </div>

          {/* Sentiment Card */}
          <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-sm opacity-70">Sentimiento Leads</h3>
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                  {sentimentData.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                              <span className="text-2xl">{s.icon}</span>
                              <div>
                                  <p className={`font-bold ${s.color}`}>{s.sentiment}</p>
                                  <p className="text-xs text-gray-500">{s.count} prospectos</p>
                              </div>
                          </div>
                          <div className="text-xl font-mono font-bold">
                              {Math.round((s.count / 45) * 100)}%
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* Recent Leads Table Placeholder */}
      <div className="glass rounded-[2rem] p-8 border border-white/5 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm opacity-70">Prospectos Recientes</h3>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar lead..." 
                    className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all w-64"
                />
            </div>
        </div>
        
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-white/10 text-xs font-mono text-gray-500 uppercase">
                    <th className="pb-4 font-medium pl-4">Lead</th>
                    <th className="pb-4 font-medium">Estado</th>
                    <th className="pb-4 font-medium">Origen</th>
                    <th className="pb-4 font-medium">Sentimiento</th>
                    <th className="pb-4 font-medium text-right pr-4">Creado</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {[
                    { name: "Juan Perez", status: "NEGOTIATION", source: "WHATSAPP", sentiment: "POSITIVE", date: "Hoy, 10:45 AM" },
                    { name: "Maria Garcia", status: "NEW", source: "INSTAGRAM", sentiment: "NEUTRAL", date: "Ayer, 3:20 PM" },
                    { name: "Carlos Ruiz", status: "QUALIFIED", source: "WEB", sentiment: "POSITIVE", date: "14 Mar, 11:00 AM" },
                ].map((lead, i) => (
                    <tr key={i} className="group hover:bg-white/5 transition-all text-sm">
                        <td className="py-4 pl-4 font-medium">{lead.name}</td>
                        <td className="py-4">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                {lead.status}
                            </span>
                        </td>
                        <td className="py-4 text-gray-400">{lead.source}</td>
                        <td className="py-4">
                            <span className={lead.sentiment === 'POSITIVE' ? 'text-green-400' : 'text-blue-400'}>
                                {lead.sentiment}
                            </span>
                        </td>
                        <td className="py-4 text-right pr-4 text-gray-500 text-xs">{lead.date}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon }: any) {
    return (
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--color-neon-cyan)]/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
                <TrendingUp size={16} className="text-gray-600" />
            </div>
            <p className="text-xs text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{sub}</p>
        </div>
    );
}
