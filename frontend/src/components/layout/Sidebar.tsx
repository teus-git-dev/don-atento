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
  LogOut,
  ChevronRight,
  UploadCloud
} from "lucide-react";
import { authService } from "@/services/authService";

export default function Sidebar() {
  const pathname = usePathname();
  
  const user = authService.getUser();
  const currentRole = user?.role;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const canSeeSuperAdmin = currentRole === 'SUPERADMIN';
  const canSeeConfig     = currentRole === 'ADMIN_TENANT';
  const canSeeCRM        = currentRole === 'ADMIN_TENANT' || currentRole === 'AGENT';
  const canSeeTickets    = currentRole === 'ADMIN_TENANT' || currentRole === 'TECHNICIAN';
  const canSeeInmuebles  = currentRole !== 'SUPERADMIN';

  const skeleton = (
    <aside className="w-60 flex-shrink-0 hidden md:flex flex-col"
      style={{ background: '#0f0f0f', borderRight: '1px solid #1e1e1e' }}>
    </aside>
  );

  if (!mounted || !user) return skeleton;

  return (
    <aside
      className="w-60 flex-shrink-0 hidden md:flex flex-col relative"
      style={{ background: '#0f0f0f', borderRight: '1px solid #1e1e1e' }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-5 flex-shrink-0"
        style={{ borderBottom: '1px solid #1e1e1e' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 flex items-center justify-center"
            style={{ background: '#ffffff', borderRadius: 0 }}
          >
            <span className="text-[10px] font-black text-black tracking-tight">IQ</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Don IQ</span>
        </div>
      </div>

      {/* User Block */}
      <div
        className="px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}
      >
        <p className="text-white text-xs font-semibold truncate leading-none mb-1">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          {user.role?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {canSeeCRM && (
          <>
            <SidebarLink href="/crm"       icon={<BarChart3 size={15} />} label="CRM"              active={pathname === '/crm'} />
            <SidebarLink href="/contactos" icon={<Users size={15} />}     label="Contactos"         active={pathname === '/contactos'} />
          </>
        )}

        {canSeeInmuebles && (
          <SidebarLink href="/inmuebles" icon={<Building2 size={15} />} label="Maestro Inmuebles" active={pathname === '/inmuebles'} />
        )}

        {canSeeTickets && (
          <>
            <SidebarLink href="/tickets"   icon={<Ticket size={15} />} label="Gestión Tickets"   active={pathname === '/tickets'} />
            <SidebarLink href="/providers" icon={<Users size={15} />}  label="Proveedores"        active={pathname === '/providers'} />
          </>
        )}

        {canSeeCRM && (
          <SidebarLink href="/analitica" icon={<BarChart3 size={15} />} label="Centro de Mando 360" active={pathname === '/analitica'} />
        )}

        {canSeeSuperAdmin && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e1e1e' }}>
            <p className="px-3 text-[9px] font-mono uppercase tracking-widest mb-2"
               style={{ color: 'rgba(255,255,255,0.25)' }}>God Mode</p>
            <SidebarLink 
              href="/admin" 
              icon={<ShieldCheck size={15} />} 
              label="Gestión Inmobiliarias" 
              active={pathname === '/admin'}
              accent
            />
            <SidebarLink 
              href="/admin/finops" 
              icon={<BarChart3 size={15} />} 
              label="Rentabilidad FinOps" 
              active={pathname === '/admin/finops'}
              accent
            />
          </div>
        )}

        {canSeeConfig && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #1e1e1e' }}>
            <p className="px-3 text-[9px] font-mono uppercase tracking-widest mb-2"
               style={{ color: 'rgba(255,255,255,0.25)' }}>Administración</p>
            <SidebarLink href="/ia-config"     icon={<Settings size={15} />} label="Cerebro de Marca"      active={pathname === '/ia-config'} />
            <SidebarLink href="/importar"      icon={<UploadCloud size={15} />} label="Importar Datos"     active={pathname === '/importar'} />
            <SidebarLink href="/configuracion" icon={<Settings size={15} />} label="Configuración"          active={pathname === '/configuracion'} />
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #1e1e1e' }}>
        <button
          onClick={() => authService.logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors group"
          style={{ color: 'rgba(239,68,68,0.7)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.7)')}
        >
          <LogOut size={13} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  href, icon, label, accent, active
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-all duration-150 group relative"
      style={{
        background:   active ? '#1c1c1c' : 'transparent',
        color:        active ? '#ffffff' : 'rgba(255,255,255,0.50)',
        borderRadius: 0,
        borderLeft:   active ? '2px solid #ffffff' : '2px solid transparent',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = '#141414';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.80)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.50)';
        }
      }}
    >
      <span className="flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5">
        {icon}
      </span>
      <span className="truncate tracking-tight">{label}</span>
      {active && <ChevronRight size={10} className="ml-auto opacity-50" />}
    </Link>
  );
}
