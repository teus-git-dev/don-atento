import Link from "next/link";
import { 
  LayoutDashboard, 
  Building2, 
  Ticket, 
  BarChart3, 
  BotMessageSquare,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 glass border-r border-[var(--color-glass-border)] hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-[var(--color-glass-border)]">
        <h1 className="text-xl font-bold tracking-tight">
          Don <span className="text-glow-cyan text-[var(--color-neon-cyan)]">Atento</span>
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <SidebarLink href="/crm" icon={<BarChart3 size={20} />} label="CRM Prospectos" />
        <SidebarLink href="/inmuebles" icon={<Building2 size={20} />} label="Maestro Inmuebles" />
        <SidebarLink href="/tickets" icon={<Ticket size={20} />} label="Gestión Tickets" />
        <SidebarLink href="/providers" icon={<Users size={20} />} label="Proveedores" /> {/* Fixed link path */}
        <SidebarLink href="/analitica" icon={<BarChart3 size={20} />} label="Analítica ROI" />
        <SidebarLink 
          href="/admin" 
          icon={<ShieldCheck size={20} className="text-purple-400" />} 
          label="Super Admin" 
          special 
        />
        
        <div className="pt-6 pb-2">
          <p className="px-4 text-xs font-mono uppercase tracking-wider text-gray-500">Inteligencia Artificial</p>
        </div>
        <SidebarLink 
          href="/ia-chat" 
          icon={<BotMessageSquare size={20} className="text-[var(--color-neon-cyan)]" />} 
          label="Simulador IA" 
          special
        />
        <SidebarLink 
          href="/ia-config" 
          icon={<Settings size={20} className="text-[var(--color-neon-cyan)]" />} 
          label="Cerebro de Marca" 
          special
        />
      </nav>

      <div className="p-4 border-t border-[var(--color-glass-border)]">
        <SidebarLink href="/configuracion" icon={<Settings size={20} />} label="Configuración" />
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, special }: { href: string, icon: React.ReactNode, label: string, special?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
        special 
          ? "hover:bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] border border-transparent hover:border-[var(--color-neon-cyan)]/30" 
          : "hover:bg-white/5 text-gray-300 hover:text-white"
      }`}
    >
      <span className={`transition-transform duration-200 group-hover:scale-110 ${special ? "drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]" : ""}`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
