"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Ticket, 
  BarChart3, 
  Settings,
  ShieldCheck,
  Users,
  Key,
  BookOpen,
  FileText
} from "lucide-react";

import { authService } from "@/services/authService";

export default function Sidebar() {
  const pathname = usePathname();
  
  // Real Role from Authentication Service
  const user = authService.getUser();
  const currentRole = user?.role;

  // Hydration safety
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Permission Logic
  const canSeeSuperAdmin = currentRole === 'SUPERADMIN';
  const canSeeConfig = currentRole === 'ADMIN_TENANT';
  const canSeeCRM = currentRole === 'ADMIN_TENANT' || currentRole === 'AGENT';
  const canSeeTickets = currentRole === 'ADMIN_TENANT' || currentRole === 'TECHNICIAN';
  const canSeeInmuebles = currentRole !== 'SUPERADMIN'; 
  const canSeeDashboard = currentRole !== 'SUPERADMIN';

  if (!mounted || !user) {
    return <aside className="w-64 flex-shrink-0 glass border-r border-[var(--color-glass-border)] hidden md:flex flex-col relative"></aside>;
  }

  return (
    <aside className="w-64 flex-shrink-0 glass border-r border-[var(--color-glass-border)] hidden md:flex flex-col relative">
      <div className="h-16 flex items-center px-6 border-b border-[var(--color-glass-border)]">
        <h1 className="text-xl font-bold tracking-tight">
          Don <span className="text-glow-cyan text-[var(--color-neon-cyan)]">IQ</span>
        </h1>
      </div>

      {/* User Info Block */}
      <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col gap-1">
        <p className="text-white text-sm font-bold truncate">{user.firstName} {user.lastName}</p>
        <p className="text-xs text-[var(--color-neon-cyan)] uppercase font-mono tracking-widest">{user.role?.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {/* Dashboard removed per user request */}
        
        {canSeeCRM && (
          <SidebarLink href="/crm" icon={<BarChart3 size={20} />} label="CRM" active={pathname === '/crm'} />
        )}

        {canSeeInmuebles && (
          <>
            <SidebarLink href="/inmuebles" icon={<Building2 size={20} />} label="Maestro Inmuebles" active={pathname === '/inmuebles'} />
          </>
        )}

        {canSeeTickets && (
          <>
            <SidebarLink href="/tickets" icon={<Ticket size={20} />} label="Gestión Tickets" active={pathname === '/tickets'} />
            <SidebarLink href="/providers" icon={<Users size={20} />} label="Proveedores" active={pathname === '/providers'} />
          </>
        )}

        {canSeeCRM && (
          <SidebarLink href="/analitica" icon={<BarChart3 size={20} />} label="Centro de Mando 360" active={pathname === '/analitica'} />
        )}

        {canSeeSuperAdmin && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="px-4 text-[10px] font-mono uppercase tracking-wider text-purple-400 mb-2 font-bold">God Mode</p>
            <SidebarLink 
              href="/admin" 
              icon={<ShieldCheck size={20} className="text-purple-400" />} 
              label="Gestión Inmobiliarias" 
              active={pathname === '/admin'}
              special 
            />
          </div>
        )}
        
        {canSeeConfig && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="px-4 text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">Administración</p>
            <SidebarLink 
              href="/ia-config" 
              icon={<Settings size={20} className="text-[var(--color-neon-cyan)]" />} 
              label="Cerebro de Marca" 
              active={pathname === '/ia-config'}
              special
            />
            <SidebarLink 
              href="/contabilidad" 
              icon={<BookOpen size={20} />} 
              label="Contabilidad" 
              active={pathname === '/contabilidad'}
            />
            <SidebarLink 
              href="/facturacion" 
              icon={<FileText size={20} className="text-[var(--color-neon-cyan)]" />} 
              label="Facturación Electrónica" 
              active={pathname === '/facturacion'}
            />
            <SidebarLink 
              href="/configuracion" 
              icon={<Settings size={20} />} 
              label="Configuración" 
              active={pathname === '/configuracion'}
            />
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <button 
          onClick={() => authService.logout()}
          className="w-full py-2 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors border border-transparent hover:border-red-500/30"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, special, active }: { href: string, icon: React.ReactNode, label: string, special?: boolean, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        active
          ? "bg-white/10 text-white shadow-sm"
          : special 
            ? "hover:bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] border border-transparent hover:border-[var(--color-neon-cyan)]/30" 
            : "hover:bg-white/5 text-gray-300 hover:text-white"
      }`}
    >
      <span className={`transition-transform duration-200 group-hover:scale-110 ${special ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : ""}`}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
      
      {/* Active Indicator */}
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-neon-blue)] shadow-[0_0_8px_rgba(0,112,243,0.8)]"></div>
      )}
    </Link>
  );
}
