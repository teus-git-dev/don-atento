"use client";

import React from 'react';
import { 
  Users, 
  Home, 
  TicketCheck, 
  HeartPulse, 
  TrendingUp, 
  ArrowUpRight, 
  AlertTriangle,
  Star,
  MessageSquare
} from "lucide-react";
import OperationalChart from "./OperationalChart";
import FunnelChart from "../crm/FunnelChart";

export default function CentroMando() {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Prospectos Activos" 
          value="0" 
          trend="Sin datos" 
          icon={<Users className="text-[var(--color-neon-blue)]" />}
        />
        <StatCard 
          label="Salud del Inventario" 
          value="0%" 
          trend="N/A" 
          icon={<Home className="text-[var(--color-neon-cyan)]" />}
        />
        <StatCard 
          label="Tickets Resueltos Hoy" 
          value="0" 
          trend="0" 
          icon={<TicketCheck className="text-[var(--color-neon-purple)]" />}
        />
        <StatCard 
          label="Sentiment Score" 
          value="0.0" 
          trend="Sin feedback" 
          icon={<HeartPulse className="text-green-400" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar 1: CRM & Growth */}
        <section className="glass p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Users size={16} className="text-[var(--color-neon-blue)]" />
              Embudo de Captación (CRM)
            </h3>
            <button className="text-xs text-[var(--color-neon-blue)] hover:underline flex items-center gap-1">
              Ver Leads <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="h-[250px] w-full">
            <FunnelChart />
          </div>
        </section>

        {/* Pillar 2: Operational Efficiency */}
        <section className="glass p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <TicketCheck size={16} className="text-[var(--color-neon-purple)]" />
              Eficiencia de Servicio
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">
              IA ENGINE V4
            </span>
          </div>
          <div className="h-[250px] w-full">
            <OperationalChart />
          </div>
        </section>

        {/* Pillar 3: Inventory Health */}
        <section className="glass p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <Home size={16} className="text-[var(--color-neon-cyan)]" />
              Integridad de Inventarios
            </h3>
          </div>
          <div className="space-y-4">
            <p className="text-gray-500 text-xs text-center py-10 font-mono uppercase tracking-widest opacity-50">
              No hay alertas de integridad activas
            </p>
          </div>
        </section>

        {/* Pillar 4: Customer Satisfaction */}
        <section className="glass p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <HeartPulse size={16} className="text-green-400" />
              Pulso del Cliente (Feedback)
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
              <Star size={10} fill="currentColor" /> 0.0 AVG
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Satisfaction Gauge-like display */}
            <div className="flex flex-col items-center justify-center p-4 relative h-[180px]">
              <div className="text-center relative z-10">
                <div className="text-4xl font-bold text-white mb-1">0%</div>
                <div className="text-[10px] text-gray-500 font-mono">SATISFACCIÓN</div>
              </div>
              {/* Dynamic Pulse based on score */}
              <div className="absolute inset-0 flex items-center justify-center -z-10">
                <div className="w-24 h-24 bg-green-500/10 rounded-full animate-ping duration-[3000ms]"></div>
                <div className="absolute w-32 h-32 bg-green-500/5 blur-[40px] rounded-full"></div>
              </div>
            </div>

            {/* Recent Comments */}
            <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-[10px] uppercase tracking-widest opacity-50">
              Sin comentarios recientes
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CommentItem({ user, comment, stars }: any) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-gray-300">{user}</span>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={8} fill={i < stars ? "#4ade80" : "none"} stroke={i < stars ? "#4ade80" : "#444"} />
          ))}
        </div>
      </div>
      <p className="text-[10px] text-gray-400 italic line-clamp-2">"{comment}"</p>
    </div>
  );
}

function StatCard({ label, value, trend, icon }: any) {
  return (
    <div className="glass p-5 rounded-2xl border border-white/5 relative group overflow-hidden">
      <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-100 transition-opacity">
        {icon}
      </div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-tighter mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-green-400 mt-2 font-mono flex items-center gap-1">
        <TrendingUp size={10} /> {trend}
      </p>
    </div>
  );
}

function InventoryAlert({ property, issue, severity }: any) {
  const getColors = () => {
    if (severity === 'high') return 'text-red-400 border-red-500/20 bg-red-500/5';
    if (severity === 'medium') return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
    return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
  };

  return (
    <div className={`p-3 rounded-xl border flex items-start gap-3 ${getColors()}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-bold uppercase">{property}</p>
        <p className="text-[10px] opacity-80">{issue}</p>
      </div>
    </div>
  );
}
