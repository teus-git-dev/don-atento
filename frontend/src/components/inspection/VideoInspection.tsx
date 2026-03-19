"use client";

import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function VideoInspection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Main Player Container */}
      <div className="relative flex-1 glass rounded-3xl border border-white/5 overflow-hidden bg-black group">
        {/* Mock Video Content */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black relative">
                {/* Simulated IA detection markers in video */}
                <div className="absolute top-[30%] left-[40%] animate-pulse">
                    <div className="w-32 h-32 border-2 border-dashed border-[var(--color-neon-cyan)] rounded-lg flex flex-col justify-end p-2">
                        <span className="text-[10px] font-mono text-[var(--color-neon-cyan)] bg-black/60 px-1 self-start">DETERIORO_MURO (89%)</span>
                    </div>
                </div>

                <div className="absolute top-[60%] left-[20%]">
                    <div className="w-24 h-24 border-2 border-dashed border-red-500/50 rounded-lg flex flex-col justify-end p-2">
                        <span className="text-[10px] font-mono text-red-400 bg-black/60 px-1 self-start">FILTRACIÓN (92%)</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="space-y-4">
                {/* Progress Bar */}
                <div className="h-1 w-full bg-white/10 rounded-full relative cursor-pointer overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-[var(--color-neon-blue)]" style={{ width: `${progress}%` }}></div>
                    {/* Event Markers on Timeline */}
                    <div className="absolute left-[30%] top-0 h-full w-0.5 bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                    <div className="absolute left-[65%] top-0 h-full w-0.5 bg-[var(--color-neon-cyan)] shadow-[0_0_5px_rgba(0,255,255,0.8)]"></div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white">
                        <button className="hover:text-[var(--color-neon-blue)] transition-colors"><SkipBack size={20} /></button>
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
                        </button>
                        <button className="hover:text-[var(--color-neon-blue)] transition-colors"><SkipForward size={20} /></button>
                        <span className="text-xs font-mono ml-2">02:45 / 05:12</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            IA Analysis active
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Insight Feed */}
      <div className="h-48 glass rounded-3xl border border-white/5 p-5 flex flex-col">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <ShieldAlert size={14} className="text-red-400" />
            Hallazgos Cognitivos (Timeline)
        </h4>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {[
                { time: "00:42", type: "damage", label: "Deterioro en pintura - Sala principal", icon: <ShieldAlert size={14} className="text-yellow-500" /> },
                { time: "01:28", type: "leak", label: "Filtración detectada - Baño Social", icon: <ShieldAlert size={14} className="text-red-500" /> },
                { time: "02:15", type: "ok", label: "Cocina en estado óptimo", icon: <CheckCircle2 size={14} className="text-green-500" /> },
            ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-500 group-hover:text-[var(--color-neon-cyan)]">{item.time}</span>
                        <div className="flex items-center gap-2">
                            {item.icon}
                            <span className="text-xs text-gray-300 font-medium">{item.label}</span>
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
