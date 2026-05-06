"use client";

import { useState, useEffect } from "react";
import { Search, Plus, LogOut, ChevronDown, Command } from "lucide-react";
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

  useEffect(() => { setUser(authService.getUser()); }, []);

  const displayName     = user ? `${user.firstName} ${user.lastName}` : 'Don IQ Control';
  const displayInitials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : 'DI';
  const displayRole     = user ? (ROLE_LABELS[user.role] ?? user.role) : 'Operations Admin';

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center justify-between z-20 px-5"
      style={{ background: '#0f0f0f', borderBottom: '1px solid #1e1e1e' }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 w-56 transition-colors group"
        style={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 0 }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
        onBlur={e  => (e.currentTarget.style.borderColor = '#262626')}
      >
        <Search size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent border-none outline-none text-xs w-full"
          style={{ color: '#fafafa', letterSpacing: '-0.01em' }}
        />
        <kbd
          className="flex items-center gap-0.5 text-[9px] font-mono flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.20)' }}
        >
          <Command size={9} /> K
        </kbd>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Create Ticket CTA */}
        {onCreateTicket && (
          <button
            onClick={onCreateTicket}
            className="hidden md:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-all"
            style={{
              background: '#ffffff',
              color: '#0a0a0a',
              border: '1px solid #ffffff',
              padding: '6px 14px',
              borderRadius: 0,
              letterSpacing: '0.07em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.85)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = '#ffffff';
            }}
          >
            <Plus size={12} />
            Nuevo Ticket
          </button>
        )}

        {/* Notifications */}
        <div style={{ borderLeft: '1px solid #1e1e1e', paddingLeft: '12px' }}>
          <NotificationCenter />
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            id="topbar-user-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 transition-colors group"
            style={{ padding: '4px 8px' }}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 flex items-center justify-center text-[11px] font-black flex-shrink-0"
              style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: 0, color: '#ffffff' }}
            >
              {displayInitials}
            </div>
            {/* Name */}
            <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
              <span className="text-xs font-semibold text-white tracking-tight">{displayName}</span>
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {displayRole}
              </span>
            </div>
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
              style={{ color: 'rgba(255,255,255,0.30)' }}
            />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[49]" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-48 z-50 overflow-hidden animate-fade-up"
                style={{ background: '#141414', border: '1px solid #262626', borderRadius: 0 }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e1e1e' }}>
                  <p className="text-xs font-semibold text-white truncate tracking-tight">{displayName}</p>
                  <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.email}</p>
                </div>
                <button
                  id="topbar-logout"
                  onClick={() => authService.logout()}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-xs transition-colors"
                  style={{ color: 'rgba(239,68,68,0.7)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)';
                    (e.currentTarget as HTMLElement).style.color = '#ef4444';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)';
                  }}
                >
                  <LogOut size={13} />
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
