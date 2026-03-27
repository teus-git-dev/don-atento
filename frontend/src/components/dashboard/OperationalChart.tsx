"use client";

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const data = [
  { name: 'Lun', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
  { name: 'Mar', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
  { name: 'Mie', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
  { name: 'Jue', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
  { name: 'Vie', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
  { name: 'Sab', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
  { name: 'Dom', tickets: 0, resueltos: 0, whatsapp: 0, email: 0, responseTime: 0 },
];

export default function OperationalChart() {
  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-neon-blue)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-neon-blue)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTick" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-neon-cyan)" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="var(--color-neon-cyan)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            stroke="#6b7280" 
            fontSize={10} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            stroke="#6b7280" 
            fontSize={10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0a0f1e', 
              border: '1px solid #ffffff10', 
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              fontSize: '12px'
            }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="resueltos" 
            stroke="var(--color-neon-blue)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRes)" 
          />
          <Area 
            type="monotone" 
            dataKey="tickets" 
            stroke="var(--color-neon-cyan)" 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorTick)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
