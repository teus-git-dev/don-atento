"use client";

import React, { useState } from 'react';
import { tenantService, Tenant } from '@/services/tenantService';
import { Building2, Plus, MoreVertical, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';

export default function TenantManager() {
  const [tenants, setTenants] = useState<Tenant[]>(tenantService.getTenants());

  const toggleStatus = (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    tenantService.updateStatus(id, newStatus);
    setTenants([...tenantService.getTenants()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs uppercase font-bold tracking-widest text-gray-500">Cartera de Clientes Inmobiliarios</h3>
        <button className="bg-[var(--color-neon-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-2">
            <Plus size={14} /> Nueva Inmobiliaria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
            {/* Plan Badge */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-bold uppercase tracking-wider ${
                tenant.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                tenant.plan === 'pro' ? 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)]' :
                'bg-gray-500/20 text-gray-400'
            }`}>
                PLAN {tenant.plan}
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                    <Building2 size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors">{tenant.name}</h4>
                    <span className="text-[10px] font-mono text-gray-500">{tenant.id} • Desde {tenant.createdAt}</span>
                </div>
            </div>

            <div className="space-y-4">
                {/* AI Quota Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-gray-500">Tickets IA (Mensual)</span>
                        <span className="text-white">{tenant.aiTicketsUsed} / {tenant.aiTicketLimit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${
                                (tenant.aiTicketsUsed / tenant.aiTicketLimit) > 0.9 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[var(--color-neon-cyan)] shadow-[0_0_8px_rgba(0,255,255,0.5)]'
                            }`}
                            style={{ width: `${(tenant.aiTicketsUsed / tenant.aiTicketLimit) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {tenant.status === 'active' ? (
                            <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold uppercase">
                                <ShieldCheck size={14} /> Activo
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase">
                                <ShieldAlert size={14} /> Suspendido
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => toggleStatus(tenant.id)}
                            className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <Zap size={14} />
                        </button>
                        <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
                            <MoreVertical size={14} />
                        </button>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
