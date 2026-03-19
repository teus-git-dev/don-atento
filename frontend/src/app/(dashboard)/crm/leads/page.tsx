"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Filter, MoreHorizontal, MessageCircle, Star, ShieldCheck, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function LeadsPage() {
  const [leads, setLeads] = useState([
    { id: "1", firstName: "Juan", lastName: "Perez", email: "juan@example.com", phone: "+57 300 123 4567", status: "NEGOTIATION", source: "WHATSAPP", sentiment: "POSITIVE", urgencyScore: 85, qualityLabel: "HOT LEAD", lastInteraction: "Hoy, 10:45 AM" },
    { id: "2", firstName: "Maria", lastName: "Garcia", email: "maria@example.com", phone: "+57 311 987 6543", status: "NEW", source: "INSTAGRAM", sentiment: "NEUTRAL", urgencyScore: 45, qualityLabel: "WARM", lastInteraction: "Ayer, 3:20 PM" },
    { id: "3", firstName: "Carlos", lastName: "Ruiz", email: "carlos@example.com", phone: "+57 320 456 7890", status: "QUALIFIED", source: "WEB", sentiment: "POSITIVE", urgencyScore: 60, qualityLabel: "WARM", lastInteraction: "14 Mar, 11:00 AM" },
    { id: "4", firstName: "Elena", lastName: "Torres", email: "elena@example.com", phone: "+57 315 555 4433", status: "NEGOTIATION", source: "FACEBOOK", sentiment: "NEGATIVE", urgencyScore: 95, qualityLabel: "CRITICAL", lastInteraction: "13 Mar, 9:15 AM" },
  ]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Prospectos</h1>
          <p className="text-gray-400 text-sm mt-1">Total: {leads.length} leads activos</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)]">
            <UserPlus size={16} /> Agregar Manual
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por nombre, email o teléfono..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all"
            />
        </div>
        <button className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
            <Filter size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {leads.map((lead) => (
              <div key={lead.id} className="glass p-5 rounded-2xl border border-white/5 hover:border-[var(--color-neon-cyan)]/20 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-tr ${
                          lead.sentiment === 'POSITIVE' ? 'from-green-500/20 to-emerald-500/20 text-green-400' :
                          lead.sentiment === 'NEGATIVE' ? 'from-red-500/20 to-orange-500/20 text-red-400' : 'from-blue-500/20 to-cyan-500/20 text-blue-400'
                      } border border-white/10 shadow-lg`}>
                          {lead.firstName[0]}{lead.lastName[0]}
                      </div>
                      <div>
                          <h3 className="font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors">
                              {lead.firstName} {lead.lastName}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-[10px] text-gray-500"><Mail size={10} /> {lead.email}</span>
                              <span className="flex items-center gap-1 text-[10px] text-gray-500"><Phone size={10} /> {lead.phone}</span>
                          </div>
                      </div>
                  </div>

                  <div className="hidden lg:flex items-center gap-8">
                      <div className="w-32">
                          <div className="flex justify-between items-center mb-1">
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Urgencia IA</p>
                              <span className={`text-[10px] font-bold ${lead.urgencyScore > 80 ? 'text-red-400' : 'text-blue-400'}`}>{lead.urgencyScore}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${lead.urgencyScore > 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[var(--color-neon-cyan)]'}`} 
                                style={{ width: `${lead.urgencyScore}%` }} 
                              />
                          </div>
                      </div>
                      <div className="text-center min-w-[80px]">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Calidad</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-tighter shadow-sm border ${
                              lead.qualityLabel === 'HOT LEAD' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              lead.qualityLabel === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                              {lead.qualityLabel}
                          </span>
                      </div>
                      <div className="text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Estado</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              lead.status === 'NEW' ? 'bg-blue-500/10 text-blue-400' :
                              lead.status === 'NEGOTIATION' ? 'bg-purple-500/10 text-purple-400' : 'bg-green-500/10 text-green-400'
                          }`}>
                              {lead.status}
                          </span>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Última Vez</p>
                          <p className="text-xs text-gray-400">{lead.lastInteraction}</p>
                      </div>
                  </div>

                  <div className="flex items-center gap-2">
                       <button className="p-2 bg-white/5 hover:bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] rounded-lg transition-colors border border-transparent hover:border-[var(--color-neon-cyan)]/30 tooltip" title="Convertir a Cliente">
                          <ShieldCheck size={18} />
                      </button>
                      <button className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors border border-transparent hover:border-white/20">
                          <MessageCircle size={18} />
                      </button>
                      <button className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors border border-transparent hover:border-white/20">
                          <MoreHorizontal size={18} />
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}
