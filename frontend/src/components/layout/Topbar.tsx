"use client";

import { useState, useEffect } from "react";
import { Search, Plus, LogOut, ChevronDown } from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import { authService, type AuthUser } from "@/services/authService";

interface TopbarProps {
  onCreateTicket?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN:   'Super Admin',
  ADMIN_TENANT: 'Administrador',
  AGENT:        'Asesor',
  TECHNICIAN:   'Técnico',
  OWNER:        'Propietario',
};

export default function Topbar({ onCreateTicket }: TopbarProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : 'Don IQ Control';
  const displayInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : 'DI';
  const displayRole = user ? (ROLE_LABELS[user.role] ?? user.role) : 'Operations Admin';

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

          {/* User menu */}
          <div className="relative">
            <button
              id="topbar-user-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] flex items-center justify-center text-white font-bold text-xs">
                {displayInitials}
              </div>
              <div className="flex flex-col items-start leading-none hidden sm:flex">
                <span className="text-sm font-medium text-white">{displayName}</span>
                <span className="text-xs text-gray-400 font-mono">{displayRole}</span>
              </div>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-[49]"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 glass border border-white/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-bold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    id="topbar-logout"
                    onClick={() => authService.logout()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
