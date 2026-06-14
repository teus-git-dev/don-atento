"use client";

import { useState, useRef } from "react";
import { Camera, Layers, AlertTriangle, CheckCircle2, RefreshCw, Box, ShieldAlert } from "lucide-react";

export default function VisualInspectionAR() {
  const [isGhosting, setIsGhosting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [findings, setFindings] = useState<any[]>([]);

  const initialPhoto = "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80"; // MUESTRARIO: Initial state
  const currentPhoto = "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80&sepia=1"; // MOCK: Current damaged state

  const handleAnalyze = () => {
    setAnalyzing(true);
    setFindings([]);
    
    setTimeout(() => {
      setFindings([
        { id: 1, type: 'DAMAGE', label: 'Grieta en Pared (Nueva)', confidence: 0.98, x: 45, y: 30, cost: '$250.000' },
        { id: 2, type: 'WEAR', label: 'Desgaste Piso (Normal)', confidence: 0.85, x: 20, y: 80, cost: '$0' }
      ]);
      setAnalyzing(false);
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937] flex items-center gap-3">
            <Box className="text-[#10B981]" /> Inspección IA con Visión AR
          </h2>
          <p className="text-gray-500 text-sm">Comparación inteligente de inventario y detección de daños</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setIsGhosting(!isGhosting)}
             className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
               isGhosting ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40 shadow-[0_0_15px_rgba(0,255,255,0.2)]' : 'bg-gray-50 text-gray-500 border-gray-200'
             }`}
           >
             <Layers size={16} /> GHOSTING {isGhosting ? 'ON' : 'OFF'}
           </button>
           <button 
             onClick={handleAnalyze}
             disabled={analyzing}
             className="px-6 py-2 bg-[#10B981] text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[0_5px_15px_rgba(0,255,255,0.3)] hover:scale-105 transition-all flex items-center gap-2"
           >
             {analyzing ? <RefreshCw className="animate-spin" size={14} /> : <AlertTriangle size={14} />}
             {analyzing ? 'ESCANEANDO...' : 'DETECTAR DAÑOS'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Viewport */}
        <div className="lg:col-span-3 bg-white shadow-sm border border-gray-200 rounded-[3rem] border border-gray-100 overflow-hidden relative group min-h-[600px]">
           {/* Current Live View Mock */}
           <img src={currentPhoto} alt="Live View" className="w-full h-full object-cover" />
           
           {/* Ghosting Overlay */}
           {isGhosting && (
             <img 
               src={initialPhoto} 
               alt="Initial View" 
               className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen pointer-events-none animate-in fade-in duration-500" 
             />
           )}

           {/* AI Detection Markers */}
           {!analyzing && findings.map(f => (
             <div 
               key={f.id}
               className="absolute animate-in zoom-in duration-300 group/marker"
               style={{ left: `${f.x}%`, top: `${f.y}%` }}
             >
                <div className={`w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                  f.type === 'DAMAGE' ? 'border-red-500 bg-red-500/20 animate-pulse' : 'border-blue-500 bg-blue-500/20'
                }`}>
                   {f.type === 'DAMAGE' ? <ShieldAlert size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-blue-500" />}
                </div>
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900/60 backdrop-blur-xl border border-gray-200 p-3 rounded-2xl w-48 opacity-0 group-hover/marker:opacity-100 transition-opacity z-50">
                    <p className="text-[10px] font-bold text-[#1F2937] uppercase mb-1">{f.label}</p>
                    <div className="flex justify-between items-center">
                       <span className="text-[8px] text-gray-500">Confianza: {(f.confidence * 100).toFixed(0)}%</span>
                       <span className="text-[10px] text-[#10B981] font-mono">{f.cost}</span>
                    </div>
                </div>
             </div>
           ))}

           {/* Scanline Effect */}
           {analyzing && (
             <div className="absolute inset-0 bg-[#10B981]/5">
                <div className="w-full h-1 bg-[#10B981] shadow-[0_0_20px_rgba(0,255,255,0.8)] absolute top-0 animate-[bounce_3s_infinite]" />
             </div>
           )}

           {/* HUD overlay */}
           <div className="absolute inset-0 pointer-events-none border-[30px] border-black/20">
              <div className="w-8 h-8 border-t-2 border-l-2 border-[#10B981] absolute top-4 left-4" />
              <div className="w-8 h-8 border-t-2 border-r-2 border-[#10B981] absolute top-4 right-4" />
              <div className="w-8 h-8 border-b-2 border-l-2 border-[#10B981] absolute bottom-4 left-4" />
              <div className="w-8 h-8 border-b-2 border-r-2 border-[#10B981] absolute bottom-4 right-4" />
           </div>
        </div>

        {/* Sidebar Findings */}
        <div className="space-y-6">
           <div className="bg-white shadow-sm border border-gray-200 p-6 rounded-[2.5rem] border border-gray-100 h-full">
              <h4 className="text-xs font-mono uppercase text-gray-500 tracking-[0.2em] mb-6">Resultados de IA</h4>
              
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                   <Loader2 size={32} className="animate-spin text-[#10B981]" />
                   <p className="text-[10px] text-gray-500 uppercase font-mono animate-pulse">Analizando Red Neuronal...</p>
                </div>
              ) : findings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-20">
                    <Box size={48} className="text-gray-500 mb-4" />
                    <p className="text-xs">Inicie escaneo visual</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {findings.map(f => (
                     <div key={f.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2x hover:bg-gray-100 transition-all cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.type === 'DAMAGE' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                             {f.type}
                           </span>
                           <span className="text-[10px] font-mono text-gray-600">{f.cost}</span>
                        </div>
                        <p className="text-sm text-[#1F2937] font-medium">{f.label}</p>
                     </div>
                   ))}
                   
                   <div className="pt-6 mt-6 border-t border-gray-100">
                      <p className="text-[10px] font-mono text-gray-500 uppercase mb-4">Liquidación Estimada</p>
                      <p className="text-3xl font-black text-[#1F2937]">$250.000</p>
                      <button className="w-full mt-6 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-[#1F2937] transition-all">
                        CREAR ORDEN DE REPARACIÓN
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function Loader2(props: any) {
    return <RefreshCw {...props} />
}
