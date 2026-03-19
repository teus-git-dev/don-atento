"use client";

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Legend
} from 'recharts';

const data = [
  { month: 'Ene', real: 4000, proyectado: 4400, mantenimiento: 1200 },
  { month: 'Feb', real: 3000, proyectado: 3200, mantenimiento: 1100 },
  { month: 'Mar', real: 2000, proyectado: 2800, mantenimiento: 1500 },
  { month: 'Abr', real: 2780, proyectado: 3908, mantenimiento: 900 },
  { month: 'May', real: 1890, proyectado: 4800, mantenimiento: 800 },
  { month: 'Jun', real: 2390, proyectado: 3800, mantenimiento: 1000 },
  { month: 'Jul', real: 3490, proyectado: 4300, mantenimiento: 950 },
];

export default function PredictiveCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Revenue Projection Chart */}
      <div className="glass p-6 rounded-2xl border border-white/5 h-[350px] flex flex-col">
        <h3 className="text-sm font-medium text-gray-300 mb-6 uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-neon-blue)]"></div>
          Proyección de Ingresos Netos (AI Optimized)
        </h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorProy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-neon-blue)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-neon-blue)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#9ca3af" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ color: 'var(--color-neon-blue)' }}
              />
              <Area 
                type="monotone" 
                dataKey="proyectado" 
                stroke="var(--color-neon-blue)" 
                fillOpacity={1} 
                fill="url(#colorProy)" 
                strokeWidth={3}
              />
              <Area 
                type="monotone" 
                dataKey="real" 
                stroke="var(--color-neon-cyan)" 
                fill="transparent" 
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Maintenance Efficiency Chart */}
      <div className="glass p-6 rounded-2xl border border-white/5 h-[350px] flex flex-col">
        <h3 className="text-sm font-medium text-gray-300 mb-6 uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)]"></div>
          Eficiencia en Mantenimiento Proactivo
        </h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#9ca3af" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                cursor={{fill: '#ffffff05'}}
                contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid #ffffff10', borderRadius: '12px' }}
              />
              <Bar 
                dataKey="mantenimiento" 
                fill="var(--color-neon-cyan)" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
