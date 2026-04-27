"use client";

import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { API_URL } from '@/lib/config';

export default function VideoInspection({ videoUrl, visionAnalysis }: { videoUrl?: string; visionAnalysis?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const repairs = visionAnalysis?.repairs || [
    { time: "00:42", area: "Sala principal", issue: "Deterioro en pintura", severity: "LOW" },
    { time: "01:28", area: "Baño Social", issue: "Filtración detectada", severity: "MEDIUM" }
  ];

  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Main Player Container */}
      <div className="relative flex-1 glass rounded-3xl border border-white/5 overflow-hidden bg-black group">
        {/* Real Video Content if available, else Mock */}
        <div className="absolute inset-0 flex items-center justify-center">
            {videoUrl ? (
                <video 
                    ref={videoRef}
                    src={videoUrl?.startsWith('http') ? videoUrl : `${API_URL}${videoUrl}`} 
                    className="w-full h-full object-cover" 
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Esperando alimentación de video...</p>
                </div>
            )}
            
            {/* Simulated IA detection markers (Static for now, but linked to repairs) */}
            {visionAnalysis && (
                <div className="absolute top-[40%] left-[30%] pointer-events-none">
                    <div className="border border-[var(--color-neon-cyan)]/40 p-1 rounded bg-black/40">
                         <span className="text-[8px] font-mono text-[var(--color-neon-cyan)] uppercase">AI_TRACKING_ACTIVE</span>
                    </div>
                </div>
            )}
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="space-y-4">
                {/* Progress Bar */}
                <div className="h-1 w-full bg-white/10 rounded-full relative cursor-pointer overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-[var(--color-neon-blue)]" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white">
                        <button className="hover:text-[var(--color-neon-blue)] transition-colors"><SkipBack size={20} /></button>
                        <button 
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
                        </button>
                        <button className="hover:text-[var(--color-neon-blue)] transition-colors"><SkipForward size={20} /></button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            {visionAnalysis ? 'Análisis IA Vinculado' : 'Simulación Activa'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Insight Feed */}
      <div className="h-48 glass rounded-3xl border border-white/5 p-5 flex flex-col">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-400" />
            Hallazgos Cognitivos (Timeline)
        </h4>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {repairs.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-500 group-hover:text-[var(--color-neon-cyan)]">{item.time || "00:00"}</span>
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={14} className={item.severity === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'} />
                            <div className="flex flex-col">
                                <span className="text-xs text-white font-bold">{item.area}</span>
                                <span className="text-[10px] text-gray-400">{item.issue}</span>
                            </div>
                        </div>
                    </div>
                    <Clock size={12} className="text-gray-600" />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
