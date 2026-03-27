"use client";

import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { tenantService } from "@/services/tenantService";
import NotificationCenter from "./NotificationCenter";

interface TopbarProps {
  onCreateTicket?: () => void;
}

export default function Topbar({ onCreateTicket }: TopbarProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTenant = tenantService.getCurrentTenant();
  // Safe defaults for SSR
  const tenantName = mounted ? (currentTenant?.name || 'Don IQ Control') : 'Don IQ Control';
  const tenantInitial = mounted ? 
    (currentTenant?.name || 'TEUS').substring(0, 2).toUpperCase() : 
    'DI';

  return (
    <header className="h-16 flex-shrink-0 glass border-b border-[var(--color-glass-border)] px-6 flex items-center justify-between z-20">
      <div className="flex bg-black/20 rounded-full px-4 py-2 border border-white/5 w-64 items-center focus-within:border-[var(--color-neon-blue)]/50 transition-colors">
        <Search size={18} className="text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Buscar inmuebles, tickets..." 
          className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500"
        />
      </div>

      <div className="flex items-center gap-4">
        {onCreateTicket && (
          <button 
            onClick={onCreateTicket}
            className="hidden md:flex items-center gap-2 bg-[var(--color-neon-blue)] hover:bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_0_10px_rgba(0,112,243,0.3)] hover:shadow-[0_0_15px_rgba(0,112,243,0.5)] border border-blue-400/20"
          >
            <Plus size={14} />
            CREAR TICKET
          </button>
        )}
        
        <div className="flex items-center gap-4 border-l border-white/10 pl-4">
          <NotificationCenter />
          
          <button className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] flex items-center justify-center text-white font-bold">
              {tenantInitial}
            </div>
            <div className="flex flex-col items-start leading-none hidden sm:flex">
              <span className="text-sm font-medium text-white">{tenantName}</span>
              <span className="text-xs text-gray-400 font-mono">Operations Admin</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
