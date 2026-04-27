"use client";

import SplatViewer from "@/components/inspection/SplatViewer";
import VideoInspection from "@/components/inspection/VideoInspection";
import { ChevronLeft, Info, Share2, Printer, Map, LayoutGrid, MessageSquare, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/config";

export default function InspeccionDetallePage() {
  const { id } = useParams();
  const [property, setProperty] = useState<any>(null);
  const [cognitiveData, setCognitiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch cognitive summary (interactions)
        const summaryRes = await fetch(`${API_URL}/cognitive/property/${id}/summary`);
        const summary = await summaryRes.json();
        setCognitiveData(summary);

        // 2. Fetch real property details (visionAnalysis, splatUrl, etc)
        const propRes = await fetch(`${API_URL}/properties/${id}`);
        const prop = await propRes.json();
        setProperty(prop);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'CRITICAL': return 'text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      case 'WARNING': return 'text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inmuebles" className="p-2 glass rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expediente de Inspección Cognitiva</h1>
            <p className="text-gray-400 text-sm">
              Inmueble: {property?.title || "Cargando..."} • {property?.address || "..."} • ID: {property?.propertyCode || "..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button className="glass px-4 py-2 rounded-xl text-xs font-medium border border-white/10 text-gray-300 flex items-center gap-2 hover:bg-white/5 transition-colors">
                <Share2 size={14} /> Compartir
            </button>
            <button className="bg-[var(--color-neon-blue)] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,112,243,0.3)] flex items-center gap-2">
                <Printer size={14} /> Reporte PDF
            </button>
        </div>
      </div>

      {/* Main Grid: Split Screen 3D vs Video */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Side: 3D Digital Twin (Large) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-neon-cyan)]">
                    <LayoutGrid size={14} /> Reconstrucción Geospacial (Splatting)
                </div>
                <div className="text-[10px] text-gray-500">Nube de puntos: 1.2M Gaussians</div>
            </div>
            <div className="flex-1 min-h-0">
                <SplatViewer splatUrl={property?.splatUrl} />
            </div>
        </div>

        {/* Right Side: Multimedia & Cognitive Insights */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-widest text-[var(--color-neon-blue)]">
                    <Map size={14} /> Análisis de Evidencia de Campo
                </div>
                <div className="h-48">
                    <VideoInspection 
                        videoUrl={property?.visionVideoUrl} 
                        visionAnalysis={property?.visionAnalysis}
                    />
                </div>
            </div>

            {/* Cognitive History Panel */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-neon-cyan)]">
                        <MessageSquare size={14} /> Historial Cognitivo (WhatsApp)
                    </div>
                    {cognitiveData?.summary?.overallHealth && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${getHealthColor(cognitiveData.summary.overallHealth)} uppercase tracking-tighter`}>
                            {cognitiveData.summary.overallHealth === 'HEALTHY' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                            Salud: {cognitiveData.summary.overallHealth}
                        </div>
                    )}
                </div>
                
                <div className="flex-1 glass rounded-2xl border border-white/5 bg-black/40 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs animate-pulse">
                                Cargando redes neuronales...
                            </div>
                        ) : cognitiveData?.interactions?.length > 0 ? (
                            cognitiveData.interactions.map((i: any, idx: number) => (
                                <div key={idx} className={`flex flex-col gap-1 ${i.channel === 'WHATSAPP' ? 'items-start' : 'items-end'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed border ${
                                        i.channel === 'WHATSAPP' 
                                            ? 'bg-white/5 border-white/10 text-gray-300 rounded-bl-none' 
                                            : 'bg-[var(--color-neon-blue)]/20 border-[var(--color-neon-blue)]/30 text-white rounded-br-none'
                                    }`}>
                                        {i.message}
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-500 px-1 uppercase font-mono">
                                        <span>{i.channel === 'WHATSAPP' ? 'Inquilino' : 'Don Atento (IA)'}</span>
                                        {i.sentimentAnalysis && (
                                            <span className={`px-1 rounded border ${
                                                i.sentimentAnalysis === 'POSITIVE' ? 'border-green-500/30 text-green-500' :
                                                i.sentimentAnalysis === 'NEGATIVE' ? 'border-red-500/30 text-red-500' :
                                                'border-gray-500/30 text-gray-500'
                                            }`}>
                                                {i.sentimentAnalysis}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">
                                Sin interacciones cognitivas detectadas.
                            </div>
                        )}
                    </div>
                    
                    {/* Interaction Input */}
                    <div className="p-3 bg-black/40 border-t border-white/5 flex gap-2">
                        <input 
                            placeholder="Intervenir con Don Atento..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] focus:outline-none focus:border-[var(--color-neon-blue)]/50"
                        />
                        <button className="p-2 bg-[var(--color-neon-blue)] text-white rounded-xl hover:bg-blue-600 transition-colors">
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Bottom Context Info */}
      <div className="glass p-4 rounded-2xl border border-white/5 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-mono text-gray-400 uppercase">Integridad del modelo: 98.4%</span>
            </div>
            <div className="flex items-center gap-2">
                <Info size={14} className="text-[var(--color-neon-blue)]" />
                <span className="text-[10px] font-mono text-gray-400 uppercase">Procesado por: Don Atento v4 (CV Engine)</span>
            </div>
        </div>
        <div className="text-[10px] font-mono text-[var(--color-neon-cyan)] italic">
            * Interactúa con el modelo 3D para generar nuevas anotaciones espaciales.
        </div>
      </div>
    </div>
  );
}
