"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#00E5FF', '#00B0FF', '#0080FF', '#0050FF', '#0020FF'];

const STATUS_MAP: Record<string, string> = {
  'NEW': 'Nuevos',
  'QUALIFIED': 'Calificados',
  'NEGOTIATION': 'Negociación',
  'CLOSED_WON': 'Ganados',
  'CLOSED_LOST': 'Perdidos'
};

export default function FunnelChart({ data = [] }: { data?: any[] }) {
  const mockData = [
    { status: 'NEW', count: 45 },
    { status: 'QUALIFIED', count: 32 },
    { status: 'NEGOTIATION', count: 18 },
    { status: 'CLOSED_WON', count: 12 },
    { status: 'CLOSED_LOST', count: 5 },
  ];
  
  const displayData = data.length > 0 ? data : mockData;

  // Sort data to look like a funnel (descending typically, but here we follow the sales process)
  const funnelOrder = ['NEW', 'QUALIFIED', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  const sortedData = [...displayData]
    .sort((a, b) => funnelOrder.indexOf(a.status) - funnelOrder.indexOf(b.status))
    .map(item => ({
      ...item,
      displayName: STATUS_MAP[item.status] || item.status
    }));

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sortedData}
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="displayName" 
            type="category" 
            stroke="#999" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
