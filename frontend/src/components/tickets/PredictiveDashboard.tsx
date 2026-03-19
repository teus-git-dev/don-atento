"use client";

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ShieldCheck, AlertTriangle, TrendingDown, Zap } from 'lucide-react';

const data = [
  { name: 'Cimentación', score: 98 },
  { name: 'Eléctrico', score: 75 },
  { name: 'Hidráulico', score: 62 },
  { name: 'Cubierta', score: 88 },
  { name: 'Fachada', score: 92 },
];

const COLORS = ['#00ffff', '#0070f3', '#ff0055', '#facc15', '#a855f7'];

export default function PredictiveDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Health & Brand Alignment Overview */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center flex-1">
          <div className="relative w-40 h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: 78 }, { value: 22 }]}
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                >
                  <Cell fill="var(--color-neon-blue)" />
                  <Cell fill="rgba(255,255,255,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">78/100</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Health Score</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-yellow-500 mb-2 font-mono text-[10px] uppercase font-bold tracking-widest">
              <AlertTriangle size={12} />
              <span>Atención Requerida</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed px-4">
              Hidráulico: fatiga detectada en 2 puntos.
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center flex-1 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="relative w-40 h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: 95 }, { value: 5 }]}
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                >
                  <Cell fill="#a855f7" />
                  <Cell fill="rgba(255,255,255,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">95%</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Brand Clone</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-purple-400 mb-2 font-mono text-[10px] uppercase font-bold tracking-widest">
              <ShieldCheck size={12} />
              <span>Tono Corporativo OK</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed px-4">
              95% de coincidencia con manuales cargados.
          </p>
        </div>
      </div>

      {/* Probability Chart */}
      <div className="lg:col-span-8 glass p-6 rounded-3xl border border-white/5 flex flex-col">
        <h3 className="text-xs uppercase font-bold tracking-widest text-gray-500 mb-6 flex items-center gap-2">
            <Zap size={14} className="text-[var(--color-neon-cyan)]" />
            Probabilidad de Falla por Subsistema (6 Meses)
        </h3>
        <div className="flex-1 w-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#9ca3af" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                width={80}
              />
              <Tooltip 
                cursor={{fill: '#ffffff02'}}
                contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
              />
              <Bar 
                dataKey="score" 
                fill="var(--color-neon-blue)" 
                radius={[0, 4, 4, 0]}
                barSize={12}
              >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Proactive Recommendations */}
      <div className="lg:col-span-12 glass p-6 rounded-3xl border border-white/5 bg-gradient-to-r from-[var(--color-neon-blue)]/5 to-transparent">
        <h4 className="text-xs uppercase font-bold tracking-widest text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--color-neon-cyan)]" />
            Recomendaciones Proactivas de Don Atento
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
                { label: "Plomería", action: "Revisar válvula 402B", impact: "Evita filtración", score: "89%" },
                { label: "Mampostería", action: "Resane en muro sala", impact: "Estética / Humedad", score: "94%" },
                { label: "Eléctrico", action: "Cambio de breaker #3", impact: "Prevención incendio", score: "100%" },
            ].map((rec, i) => (
                <div key={i} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-[var(--color-neon-cyan)]/30 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-gray-500">{rec.label}</span>
                        <span className="text-[10px] font-bold text-[var(--color-neon-cyan)]">{rec.score} Conf.</span>
                    </div>
                    <p className="text-sm text-white font-medium mb-1">{rec.action}</p>
                    <p className="text-[10px] text-gray-500 italic">{rec.impact}</p>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
}
