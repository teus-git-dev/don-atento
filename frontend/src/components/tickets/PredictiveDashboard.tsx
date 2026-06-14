"use client";

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { ShieldCheck, AlertTriangle, TrendingDown, Zap } from 'lucide-react';

const data: any[] = [];

const COLORS = ['#00ffff', '#0070f3', '#ff0055', '#facc15', '#a855f7'];

export default function PredictiveDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Health & Brand Alignment Overview */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white shadow-sm border border-gray-200 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center flex-1">
          <div className="relative w-40 h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: 0 }, { value: 100 }]}
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                >
                  <Cell fill="#1E3A8A" />
                  <Cell fill="rgba(255,255,255,0.05)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[#1F2937]">0/100</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Health Score</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-yellow-500 mb-2 font-mono text-[10px] uppercase font-bold tracking-widest">
              <AlertTriangle size={12} />
              <span>Atención Requerida</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed px-4">
              Ninguna anomalía detectada.
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center flex-1 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="relative w-40 h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: 0 }, { value: 100 }]}
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
              <span className="text-3xl font-bold text-[#1F2937]">0%</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Brand Clone</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-purple-400 mb-2 font-mono text-[10px] uppercase font-bold tracking-widest">
              <ShieldCheck size={12} />
              <span>Tono Corporativo OK</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed px-4">
              Esperando manuales corporativos.
          </p>
        </div>
      </div>

      {/* Probability Chart */}
      <div className="lg:col-span-8 bg-white shadow-sm border border-gray-200 p-6 rounded-3xl border border-gray-100 flex flex-col">
        <h3 className="text-xs uppercase font-bold tracking-widest text-gray-500 mb-6 flex items-center gap-2">
            <Zap size={14} className="text-[#10B981]" />
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
                fill="#1E3A8A" 
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
      <div className="lg:col-span-12 bg-white shadow-sm border border-gray-200 p-6 rounded-3xl border border-gray-100 bg-gradient-to-r from-[#1E3A8A]/5 to-transparent">
        <h4 className="text-xs uppercase font-bold tracking-widest text-[#1F2937] mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#10B981]" />
            Recomendaciones Proactivas de Don Atento
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[].map((rec, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#10B981]/30 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono text-gray-500">{(rec as any).label}</span>
                        <span className="text-[10px] font-bold text-[#10B981]">{(rec as any).score} Conf.</span>
                    </div>
                    <p className="text-sm text-[#1F2937] font-medium mb-1">{(rec as any).action}</p>
                    <p className="text-[10px] text-gray-500 italic">{(rec as any).impact}</p>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
}
