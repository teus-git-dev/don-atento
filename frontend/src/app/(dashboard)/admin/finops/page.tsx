'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FinOpsEntry {
  tenantId: string;
  name: string;
  planType: string;
  revenue: number;
  totalCostUsd: number;
  totalUsed: number;
  tokenQuota: number;
}

export default function FinOpsDashboard() {
  const [data, setData] = useState<FinOpsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3000/cognitive/finops/analytics', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch FinOps analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalCost = data.reduce((acc, curr) => acc + curr.totalCostUsd, 0);
  const totalMargin = totalRevenue - totalCost;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          SuperAdmin FinOps (OpenAI Metering)
        </h1>
        <p className="text-gray-500 mt-2">
          Monitorización financiera en tiempo real: Costo de LLM vs Ingresos por Suscripción.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Ingreso Mensual Proyectado (MRR)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Costo Operativo LLM (Mes actual)</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 4 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Margen Neto (Mes actual)</p>
          <p className={`text-3xl font-bold mt-2 ${totalMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalMargin.toLocaleString('en-US', { minimumFractionDigits: 4 })}
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-96">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rentabilidad por Agencia</h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => `$${Number(value).toFixed(2)}`} />
            <Legend iconType="circle" />
            <Bar dataKey="revenue" name="Ingreso (USD)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar dataKey="totalCostUsd" name="Costo LLM (USD)" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Consumo de Tokens por Agencia</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agencia
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cuota Utilizada
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens Restantes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => {
                const percentage = (item.totalUsed / item.tokenQuota) * 100;
                const isSoftLimit = percentage >= 80;
                
                return (
                  <tr key={item.tenantId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.planType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-1/3">
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${isSoftLimit ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${isSoftLimit ? 'text-red-600' : 'text-gray-900'}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.totalUsed.toLocaleString()} / {item.tokenQuota.toLocaleString()} tokens
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {Math.max(item.tokenQuota - item.totalUsed, 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
