"use client";

import { useState } from "react";
import { Gavel, Search, Filter, History, FileCheck } from "lucide-react";
import ContractManagement from "@/components/legal/ContractManagement";

export default function LegalPage() {
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);

  const pendingDeals: any[] = [];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Gavel className="text-[var(--color-neon-cyan)]" /> Centro de Cierres Digitales
          </h1>
          <p className="text-gray-400 mt-1">Gestión legal de contratos con firma biométrica certificada</p>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-400 font-bold transition-all">
                <History size={16} /> Historial de Firmas
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: Pending Deals List */}
        <div className="space-y-4">
           <div className="flex justify-between items-center mb-4 px-2">
             <h3 className="text-xs font-mono uppercase text-gray-500 tracking-[0.2em]">Pendientes por Cerrar</h3>
             <div className="flex gap-2">
                <Search size={14} className="text-gray-600" />
                <Filter size={14} className="text-gray-600" />
             </div>
           </div>

           {pendingDeals.length === 0 ? (
             <div className="py-20 text-center text-gray-500 font-mono text-xs uppercase tracking-widest opacity-50">
               No hay trámites pendientes
             </div>
           ) : pendingDeals.map((deal) => (
             <div 
               key={deal.id}
               onClick={() => setSelectedDeal(deal)}
               className={`glass p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                 selectedDeal?.id === deal.id ? 'border-[var(--color-neon-cyan)] bg-[var(--color-neon-cyan)]/5' : 'border-white/5 hover:border-white/20'
               }`}
             >
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors">{deal.property.address}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-1">{deal.parties.owner} ↔ {deal.parties.tenant}</p>
                   </div>
                   <div className="p-2 bg-white/5 rounded-lg">
                      <FileCheck size={18} className={selectedDeal?.id === deal.id ? 'text-[var(--color-neon-cyan)]' : 'text-gray-600'} />
                   </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-gray-600 uppercase">
                   <span>Canon: ${deal.property.price.toLocaleString()}</span>
                   <span className={deal.status === 'PENDING_SIGNATURE' ? 'text-blue-400' : 'text-orange-400'}>{deal.status.replace('_', ' ')}</span>
                </div>
             </div>
           ))}
        </div>

        {/* Right: Active Closing Workflow */}
        <div className="min-h-[500px]">
           {selectedDeal ? (
             <ContractManagement 
               property={selectedDeal.property} 
               parties={selectedDeal.parties} 
             />
           ) : (
             <div className="glass h-full rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                   <Gavel size={32} className="text-gray-700" />
                </div>
                <h4 className="text-white font-bold text-lg">Módulo de Cierre Legal</h4>
                <p className="text-gray-500 text-sm max-w-xs mt-2">Seleccione un trámite de la columna izquierda para iniciar el proceso de generación de contrato y firma biométrica.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
