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
    <aside className="w-60 flex-shrink-0 hidden md:flex flex-col bg-[#1E3A8A] border-r border-[#1e3a8a]/20">
    </aside>
  );

  if (!mounted || !user) return skeleton;

  return (
    <aside
      className="w-60 flex-shrink-0 hidden md:flex flex-col relative bg-[#1E3A8A] text-white shadow-xl z-20"
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-5 flex-shrink-0 border-b border-white/10"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm"
          >
            <span className="text-[11px] font-black text-[#1E3A8A] tracking-tight">DA</span>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">DonAtento</span>
        </div>
      </div>

      {/* User Block */}
      <div
        className="px-5 py-4 flex-shrink-0 border-b border-white/5 bg-black/10"
      >
        <p className="text-white text-xs font-semibold truncate leading-none mb-1.5">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-white/60">
          {user.role?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {canSeeCRM && (
          <>
            <SidebarLink href="/crm"       icon={<BarChart3 size={16} />} label="CRM"              active={pathname === '/crm'} />
            <SidebarLink href="/contactos" icon={<Users size={16} />}     label="Contactos"         active={pathname === '/contactos'} />
          </>
        )}

        {canSeeInmuebles && (
          <SidebarLink href="/inmuebles" icon={<Building2 size={16} />} label="Maestro Inmuebles" active={pathname === '/inmuebles'} />
        )}

        {canSeeTickets && (
          <>
            <SidebarLink href="/tickets"   icon={<Ticket size={16} />} label="Gestión Tickets"   active={pathname === '/tickets'} />
            <SidebarLink href="/providers" icon={<Users size={16} />}  label="Proveedores"        active={pathname === '/providers'} />
          </>
        )}

        {canSeeCRM && (
          <SidebarLink href="/analitica" icon={<BarChart3 size={16} />} label="Centro de Mando 360" active={pathname === '/analitica'} />
        )}

        {canSeeSuperAdmin && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider mb-2 text-white/50">God Mode</p>
            <SidebarLink 
              href="/admin" 
              icon={<ShieldCheck size={16} />} 
              label="Gestión Inmobiliarias" 
              active={pathname === '/admin'}
              accent
            />
            <SidebarLink 
              href="/admin/finops" 
              icon={<BarChart3 size={16} />} 
              label="Rentabilidad FinOps" 
              active={pathname === '/admin/finops'}
              accent
            />
          </div>
        )}

        {canSeeConfig && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider mb-2 text-white/50">Administración</p>
            <SidebarLink href="/ia-config"     icon={<Settings size={16} />} label="Cerebro de Marca"      active={pathname === '/ia-config'} />
            <SidebarLink href="/importar"      icon={<UploadCloud size={16} />} label="Importar Datos"     active={pathname === '/importar'} />
            <SidebarLink href="/configuracion" icon={<Settings size={16} />} label="Configuración"          active={pathname === '/configuracion'} />
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 flex-shrink-0 border-t border-white/10">
        <button
          onClick={() => authService.logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors group text-red-200 hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={15} />
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
      className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-md transition-all duration-200 group relative ${
        active 
          ? 'bg-white/10 text-white' 
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full transition-all duration-200 ${active ? 'bg-[#10B981]' : 'bg-transparent group-hover:bg-white/20'}`} />
      
      <span className={`flex-shrink-0 transition-transform duration-200 ${active ? 'text-[#10B981]' : 'group-hover:text-white'} ${!active && 'group-hover:translate-x-0.5'}`}>
        {icon}
      </span>
      <span className="truncate tracking-tight">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-70 text-[#10B981]" />}
    </Link>
  );
}
