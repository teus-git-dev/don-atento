"use client";

import { useState, useEffect } from "react";
import { Radar, Zap, ExternalLink, UserPlus, MessageSquare, ShieldCheck, TrendingUp, Search, Info } from "lucide-react";
import { API_URL, TENANT_ID } from "@/lib/config";
import { apiClient } from "@/lib/apiClient";

interface RadarLead {
  id: string;
  propertyTitle: string;
  ownerName: string;
  phone: string;
  portal: string;
  price: string;
  location: string;
  captureScore: number;
  aiScript: string;
  imageUrl: string;
}

export default function RadarTab({ onConvert }: { onConvert: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [leads, setLeads] = useState<RadarLead[]>([]);

  const simulateScan = async () => {
    setScanning(true);
    setFeedback(null);
    try {
      const data = await apiClient.get('/crm/radar/scan');
      if (data.success) {
        setLeads(data.leads);
      } else {
        setFeedback({ type: 'error', msg: 'Error al escanear portales.' });
      }
    } catch (error) {
      console.error("Error scanning radar:", error);
      setFeedback({ type: 'error', msg: 'Error de conexión con el radar.' });
    } finally {
      setScanning(false);
    }
  };

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    simulateScan();
  }, []);

  const handleCapture = async (lead: RadarLead) => {
    try {
      const response = await apiClient.post('/crm/prospects', {
        firstName: lead.ownerName.split(' ')[0],
        lastName: lead.ownerName.split(' ').slice(1).join(' '),
        phone: lead.phone,
        source: 'RADAR_IA',
        notes: `Captado de ${lead.portal}. Propiedad: ${lead.propertyTitle}. Price: ${lead.price}`
      });
      
      if (response) {
        setLeads(prev => prev.filter(l => l.id !== lead.id));
        onConvert();
      }
    } catch (error) {
      console.error("Error capturing lead:", error);
    }
  };

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      {/* Header & Scanner Visual */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <Radar className={`text-[var(--color-neon-cyan)] ${scanning ? 'animate-pulse' : ''}`} size={24} />
              {scanning && <div className="absolute inset-0 bg-[var(--color-neon-cyan)]/20 rounded-full animate-ping" />}
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Radar de Captación IA v1.3.0 - LIVE</h2>
          </div>
          <p className="text-gray-500 text-sm max-w-xl">
            Nuestra IA escanea portales inmobiliarios en tiempo real buscando publicaciones de particulares ("Dueño Directo"). 
            Calculamos un <span className="text-[var(--color-neon-cyan)] font-bold">Capture Score</span> basado en la urgencia y precio de mercado.
          </p>
        </div>
        <button 
          onClick={simulateScan}
          disabled={scanning}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-2 group transition-all"
        >
          <Zap size={18} className={scanning ? 'animate-spin' : 'group-hover:text-yellow-400'} />
          <span className="text-sm font-bold text-white">{scanning ? 'ESCANEANDO REDES...' : 'RE-ESCANEAR PORTALES'}</span>
        </button>
      </div>

      {scanning ? (
        <div className="glass p-20 rounded-[3rem] border border-[var(--color-neon-cyan)]/20 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-neon-cyan)]/5 to-transparent animate-pulse" />
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-[var(--color-neon-cyan)]/30 animate-[spin_10s_linear_infinite] mb-6 flex items-center justify-center">
             <Radar size={48} className="text-[var(--color-neon-cyan)] animate-pulse" />
          </div>
          <p className="text-gray-400 font-mono text-xs uppercase tracking-[0.3em]">Analizando Finca Raíz, Metrocuadrado y OLX...</p>
          <div className="mt-8 flex gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-neon-cyan)] animate-bounce" style={{ animationDelay: '0s' }} />
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-neon-cyan)] animate-bounce" style={{ animationDelay: '0.2s' }} />
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-neon-cyan)] animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="glass p-20 rounded-[3rem] border border-white/5 text-center">
            <Info size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500">No hay nuevas oportunidades en este momento. Intenta escanear de nuevo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {leads.map((lead) => (
            <div key={lead.id} className="glass rounded-[2.5rem] border border-white/10 overflow-hidden hover:border-[var(--color-neon-cyan)]/40 transition-all group flex flex-col">
               <div className="relative h-48 overflow-hidden">
                  <img src={lead.imageUrl} alt={lead.propertyTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <a 
                    href={(lead as any).url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1.5 hover:bg-[var(--color-neon-cyan)] hover:text-black transition-colors"
                  >
                    <ExternalLink size={10} />
                    {lead.portal}
                  </a>
                  <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-xl border border-[var(--color-neon-cyan)]/30 rounded-2xl p-3 flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 font-mono uppercase">Capture Score</span>
                      <span className="text-xl font-black text-[var(--color-neon-cyan)]">{lead.captureScore}%</span>
                  </div>
               </div>
               
               <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[var(--color-neon-cyan)] transition-colors">{lead.propertyTitle}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <TrendingUp size={12} className="text-green-500" />
                      <span>{lead.location}</span>
                      <span className="mx-2 opacity-30">|</span>
                      <span>{lead.price}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-6">
                    <p className="text-[10px] font-mono text-gray-600 uppercase mb-2 flex items-center gap-2">
                       <MessageSquare size={12} /> Guion de Venta Sugerido (IA)
                    </p>
                    <p className="text-xs text-gray-300 italic leading-relaxed">
                      "{lead.aiScript}"
                    </p>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                      <span className="text-gray-500">{lead.ownerName}</span>
                      <span className="text-white font-mono">{lead.phone}</span>
                    </div>
                    <button 
                      onClick={() => handleCapture(lead)}
                      className="w-full py-3 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-black uppercase text-[11px] tracking-widest rounded-xl transition-all shadow-[0_5px_15px_rgba(0,255,255,0.2)] flex items-center justify-center gap-2"
                    >
                      <UserPlus size={14} /> CAPTAR LEAD AHORA
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-8 py-8 border-t border-white/5">
        <div className="flex items-center gap-2 text-gray-600">
           <ShieldCheck size={18} />
           <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Validated Direct Owner Only</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
           <Zap size={18} />
           <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Real-time Scraping Enabled</span>
        </div>
      </div>
    </div>
  );
}
