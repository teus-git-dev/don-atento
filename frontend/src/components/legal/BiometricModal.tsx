"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Camera, Loader2, CheckCircle2, X } from "lucide-react";

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  signerName: string;
}

export default function BiometricModal({ isOpen, onClose, onSuccess, signerName }: BiometricModalProps) {
  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'VERIFYING' | 'SUCCESS'>('IDLE');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step === 'SCANNING') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep('VERIFYING');
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }

    if (step === 'VERIFYING') {
      setTimeout(() => {
        setStep('SUCCESS');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }, 2000);
    }
  }, [step]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="glass w-full max-w-md rounded-[3rem] border border-[var(--color-neon-cyan)]/30 overflow-hidden relative animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
           <div className="h-full bg-[var(--color-neon-cyan)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="p-10 text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/20 flex items-center justify-center relative overflow-hidden">
                {step === 'IDLE' && <Fingerprint size={48} className="text-[var(--color-neon-cyan)]" />}
                {step === 'SCANNING' && (
                   <>
                     <Camera size={48} className="text-[var(--color-neon-cyan)]" />
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-neon-cyan)]/40 to-transparent h-1/2 w-full animate-[bounce_2s_infinite] top-0" />
                   </>
                )}
                {step === 'VERIFYING' && <Loader2 size={48} className="text-[var(--color-neon-cyan)] animate-spin" />}
                {step === 'SUCCESS' && <CheckCircle2 size={48} className="text-green-500 animate-in zoom-in duration-500" />}
              </div>
              {step === 'SCANNING' && (
                <div className="absolute -inset-4 border-2 border-[var(--color-neon-cyan)]/20 rounded-full animate-ping" />
              )}
            </div>
          </div>

          <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
            {step === 'IDLE' && "Firma Biométrica"}
            {step === 'SCANNING' && "Escaneando Rostro"}
            {step === 'VERIFYING' && "Validando Identidad"}
            {step === 'SUCCESS' && "Identidad Validada"}
          </h3>
          
          <p className="text-gray-500 text-sm mb-8">
            {step === 'IDLE' && `Se requiere validación facial de ${signerName} para estampar la firma digital con validez jurídica.`}
            {step === 'SCANNING' && "Mantenga el rostro dentro del visor. Validando contra base de datos registral..."}
            {step === 'VERIFYING' && "Verificando autenticidad del documento y biometría..."}
            {step === 'SUCCESS' && "Contrato firmado digitalmente con estampa cronológica certificada."}
          </p>

          {step === 'IDLE' && (
            <button 
              onClick={() => setStep('SCANNING')}
              className="w-full py-4 bg-[var(--color-neon-cyan)] text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--color-neon-cyan)]/80 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
            >
              Iniciar Escaneo Facial
            </button>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
            <ShieldCheck size={14} className="text-[var(--color-neon-cyan)]" />
            <span className="text-[8px] font-mono uppercase tracking-widest text-white">Ley 527 de 1999 — Bogotá, Colombia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
