"use client";

import { useState, useEffect } from "react";
import { Radar, Zap, ExternalLink, UserPlus, MessageSquare, ShieldCheck, TrendingUp, Search, Info } from "lucide-react";
import { API_URL, TENANT_ID } from "@/lib/config";

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

  const simulateScan = () => {
    setScanning(true);
    setLeads([]);
    
    setTimeout(() => {
      setLeads([
        {
          id: "1",
          propertyTitle: "Apartamento Duplex Rosales",
          ownerName: "Mauricio Restrepo (Dueño Directo)",
          phone: "+57 310 445 2211",
          portal: "Finca Raíz",
          price: "$4.500.000",
          location: "Bogotá, Rosales",
          captureScore: 94,
          aiScript: "Hola Mauricio, vi tu publicación en Finca Raíz. En Don Atento tenemos 3 clientes calificados buscando exactamente en Rosales con presupuesto inmediato. ¿Te interesaría cerrar el negocio esta semana sin trámites notariales?",
          imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop"
        },
        {
          id: "2",
          propertyTitle: "Casa de Campo El Retiro",
          ownerName: "Claudia Ximena",
          phone: "+57 300 123 9988",
          portal: "Metrocuadrado",
          price: "$1.200.000.000",
          location: "Antioquia, El Retiro",
          captureScore: 88,
          aiScript: "Claudia, un gusto. Soy [Agente] de Don Atento. Tu propiedad califica para nuestro programa de 'Cierre Express'. Garantizamos el pago del primer mes en 48 horas tras la firma digital. ¿Hablamos?",
          imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop"
        },
        {
          id: "3",
          propertyTitle: "Oficina Prime Street 100",
          ownerName: "Inversiones Beta",
          phone: "+57 321 000 1122",
          portal: "Olx",
          price: "$8.000.000",
          location: "Bogotá, Calle 100",
          captureScore: 75,
          aiScript: "Buenas tardes. Notamos que su oficina lleva 45 días publicada. Nuestra IA detectó que el precio promedio de la zona subió 12%. Podemos ayudarles a ajustar el valor y cerrar con contrato digital hoy mismo.",
          imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop"
        }
      ]);
      setScanning(false);
    }, 2500);
  };

  useEffect(() => {
    simulateScan();
  }, []);

  const handleCapture = async (lead: RadarLead) => {
    try {
      const response = await fetch(`${API_URL}/crm/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: lead.ownerName.split(' ')[0],
          lastName: lead.ownerName.split(' ').slice(1).join(' '),
          phone: lead.phone,
          source: 'RADAR_IA',
          tenantId: TENANT_ID,
          notes: `Captado de ${lead.portal}. Propiedad: ${lead.propertyTitle}. Price: ${lead.price}`
        })
      });
      
      if (response.ok) {
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
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Radar de Captación IA</h2>
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
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1.5">
                    <ExternalLink size={10} className="text-[var(--color-neon-cyan)]" />
                    {lead.portal}
                  </div>
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
