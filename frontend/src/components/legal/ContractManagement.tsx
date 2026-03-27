"use client";

import { useState } from "react";
import { FileText, Download, ShieldCheck, UserCheck, Send, CheckCircle2, Loader2, Cloud, Fingerprint } from "lucide-react";
import BiometricModal from "./BiometricModal";

interface ContractProps {
  property: {
    address: string;
    price: number;
    inventoryId: string;
  };
  parties: {
    owner: string;
    tenant: string;
  };
}

export default function ContractManagement({ property, parties }: ContractProps) {
  const [status, setStatus] = useState<'DRAFT' | 'READY' | 'SIGNED' | 'COMPLETED'>('DRAFT');
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setStatus('READY');
    }, 2000);
  };

  const handleSign = () => {
    setIsBiometricOpen(true);
  };

  return (
    <div className="glass p-8 rounded-[3rem] border border-white/5 space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <FileText className="text-[var(--color-neon-cyan)]" /> Gestión de Contrato Legal
          </h3>
          <p className="text-gray-500 text-sm mt-1">Cierre digital con validez de notaría</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
          status === 'DRAFT' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
          status === 'READY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
          'bg-green-500/10 text-green-400 border-green-500/20'
        }`}>
          {status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
          <p className="text-[10px] font-mono text-gray-600 uppercase mb-4">Inmueble</p>
          <p className="text-sm text-white font-bold">{property.address}</p>
          <p className="text-xs text-gray-500 mt-1">Ref: {property.inventoryId}</p>
        </div>
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
          <p className="text-[10px] font-mono text-gray-600 uppercase mb-4">Propietario</p>
          <p className="text-sm text-white font-bold">{parties.owner}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-green-400 font-bold uppercase">
             <ShieldCheck size={12} /> Identidad Verificada
          </div>
        </div>
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
          <p className="text-[10px] font-mono text-gray-600 uppercase mb-4">Arrendatario</p>
          <p className="text-sm text-white font-bold">{parties.tenant}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase">
             <UserCheck size={12} /> Pendiente Firma
          </div>
        </div>
      </div>

      <div className="pt-4 space-y-4">
        {status === 'DRAFT' ? (
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all"
          >
            {generating ? <Loader2 className="animate-spin" /> : <FileText />}
            {generating ? 'ENSAMBLANDO DOCUMENTO LEGAL...' : 'GENERAR MINUTA DE CONTRATO (PDF)'}
          </button>
        ) : status === 'READY' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button className="py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-3 transition-all">
                <Download size={20} /> VER PREVIA 
             </button>
             <button 
                onClick={handleSign}
                className="py-4 bg-[var(--color-neon-cyan)] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--color-neon-cyan)]/90 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)] flex items-center justify-center gap-3"
             >
                <Fingerprint size={20} /> FIRMAR DIGITALMENTE
             </button>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/20 rounded-[2rem] p-8 text-center animate-in zoom-in duration-500">
             <Cloud size={48} className="mx-auto text-green-500 mb-4" />
             <h4 className="text-xl font-bold text-white mb-2">¡Contrato Cerrado y Notariado!</h4>
             <p className="text-gray-400 text-sm mb-6">El documento ha sido estampado con firma digital y se envió una copia a WhatsApp de todas las partes.</p>
             <div className="flex gap-4 justify-center">
                <button className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-2">
                   <Download size={14} /> DESCARGAR ORIGINAL
                </button>
                <button className="px-6 py-2 bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] text-xs font-bold rounded-xl border border-[var(--color-neon-cyan)]/30">
                   VER CERTICÁMARA
                </button>
             </div>
          </div>
        )}
      </div>

      <BiometricModal 
        isOpen={isBiometricOpen} 
        onClose={() => setIsBiometricOpen(false)} 
        signerName={parties.tenant}
        onSuccess={() => {
           setIsBiometricOpen(false);
           setStatus('COMPLETED');
        }}
      />
    </div>
  );
}
