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

  const displayName     = user ? `${user.firstName} ${user.lastName}` : 'DonAtento Admin';
  const displayInitials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : 'DA';
  const displayRole     = user ? (ROLE_LABELS[user.role] ?? user.role) : 'Operations Admin';

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between z-20 px-5 bg-white border-b border-gray-200">
      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 w-56 transition-colors group bg-gray-50 border border-gray-200 rounded-md focus-within:border-[#1E3A8A] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#1E3A8A]">
        <Search size={14} className="text-gray-400 flex-shrink-0 group-focus-within:text-[#1E3A8A]" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent border-none outline-none text-xs w-full text-[#1F2937] placeholder-gray-400"
          style={{ letterSpacing: '-0.01em' }}
        />
        <kbd className="flex items-center gap-0.5 text-[10px] font-mono flex-shrink-0 text-gray-400">
          <Command size={10} /> K
        </kbd>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Create Ticket CTA */}
        {onCreateTicket && (
          <button
            onClick={onCreateTicket}
            className="hidden md:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest transition-all bg-[#10B981] hover:bg-[#059669] text-white py-[7px] px-4 rounded-md shadow-sm shadow-[#10B981]/20"
            style={{ letterSpacing: '0.07em' }}
          >
            <Plus size={14} />
            Nuevo Ticket
          </button>
        )}

        {/* Notifications */}
        <div className="border-l border-gray-200 pl-3">
          <NotificationCenter />
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            id="topbar-user-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 transition-colors group px-2 py-1 rounded-md hover:bg-gray-50"
          >
            {/* Avatar */}
            <div className="w-8 h-8 flex items-center justify-center text-[11px] font-black flex-shrink-0 bg-[#1E3A8A] text-white rounded shadow-sm">
              {displayInitials}
            </div>
            {/* Name */}
            <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
              <span className="text-xs font-bold text-[#1F2937] tracking-tight">{displayName}</span>
              <span className="text-[10px] font-semibold text-gray-500">
                {displayRole}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`transition-transform duration-150 text-gray-400 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[49]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 z-50 overflow-hidden animate-fade-up bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-[13px] font-bold text-[#1F2937] truncate tracking-tight">{displayName}</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  id="topbar-logout"
                  onClick={() => authService.logout()}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors text-red-600 hover:bg-red-50"
                >
                  <LogOut size={14} />
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
