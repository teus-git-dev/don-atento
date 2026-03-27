"use client";

import { useState, useEffect } from "react";
import { DollarSign, Percent, TrendingUp, ShieldCheck } from "lucide-react";
import { calculateROIMetrics, ROIMetrics } from "@/services/roiCalculations";

export default function ROISimulator() {
  const [investment, setInvestment] = useState(500000000);
  const [rent, setRent] = useState(3500000);
  const [maintenance, setMaintenance] = useState(500000);
  const [metrics, setMetrics] = useState<ROIMetrics | null>(null);

  useEffect(() => {
    const calculated = calculateROIMetrics(investment, rent, maintenance);
    setMetrics(calculated);
  }, [investment, rent, maintenance]);

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Inputs Column */}
      <div className="lg:col-span-1 glass p-6 rounded-2xl border border-white/5 space-y-6">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <TrendingUp className="text-[var(--color-neon-cyan)]" size={20} />
          Parámetros de Simulación
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Inversión Inicial (COP)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="number" 
                value={investment}
                onChange={(e) => setInvestment(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Canon de Arrendamiento</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="number" 
                value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Mantenimiento Mensual</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="number" 
                value={maintenance}
                onChange={(e) => setMaintenance(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/20 rounded-xl text-center">
          <p className="text-[10px] text-[var(--color-neon-blue)] uppercase font-bold tracking-widest mb-1">Impacto Don Atento AI</p>
          <div className="flex items-center justify-center gap-2 text-[var(--color-neon-cyan)]">
            <ShieldCheck size={16} />
            <span className="font-bold">Optimización Proactiva</span>
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        {[
          { label: "Retorno (ROI) Anual", value: `${metrics.roi.toFixed(2)}%`, icon: <Percent size={24} />, color: "text-[var(--color-neon-cyan)]" },
          { label: "EBITDA Proyectado", value: `$${(metrics.ebitda / 1000000).toFixed(1)}M`, icon: <DollarSign size={24} />, color: "text-white" },
          { label: "Ahorro Estimado (AI)", value: `$${(metrics.annualSavings / 1000000).toFixed(2)}M`, icon: <ShieldCheck size={24} />, color: "text-[var(--color-neon-blue)]" },
          { label: "Punto de Equilibrio", value: `${metrics.breakevenYears.toFixed(1)} Años`, icon: <TrendingUp size={24} />, color: "text-yellow-500" },
        ].map((card, i) => (
          <div key={i} className="glass p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:bg-white/5 transition-colors group">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-400 uppercase tracking-widest">{card.label}</span>
              <div className={`${card.color} opacity-40 group-hover:opacity-100 transition-opacity`}>
                {card.icon}
              </div>
            </div>
            <div className={`text-2xl font-bold mt-4 ${card.color}`}>
              {card.value}
            </div>
          </div>
        ))}
        
        <div className="col-span-2 glass p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-black/40 to-black/20">
          <p className="text-sm text-gray-400 leading-relaxed italic">
            "Don Atento optimiza el flujo de caja mediante la reducción del 15% en costos operativos y la minimización del tiempo de vacancia mediante RAG (Retrieval-Augmented Generation) aplicado a contratos y perfiles de inquilinos."
          </p>
        </div>
      </div>
    </div>
  );
}
