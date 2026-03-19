import CentroMando from "@/components/dashboard/CentroMando";
import { LayoutDashboard } from "lucide-react";

export default function AnaliticaPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Centro de Mando 360
            <span className="text-[10px] bg-[var(--color-neon-cyan)]/20 text-[var(--color-neon-cyan)] px-2 py-0.5 rounded-full border border-[var(--color-neon-cyan)]/30 font-mono">
              UNIFIED OPS V1.0
            </span>
          </h1>
          <p className="text-gray-400 mt-1">Visión integral de CRM, Inventarios, Tickets y Clientes</p>
        </div>
      </div>

      {/* Unified Dashboard Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-gray-300">
          <LayoutDashboard size={18} className="text-[var(--color-neon-blue)]" />
          <h2 className="text-sm font-semibold uppercase tracking-widest">Panel de Control Operativo</h2>
        </div>
        <CentroMando />
      </section>
      
      {/* Footer Info */}
      <div className="glass p-4 rounded-xl border border-white/5 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)] animate-pulse"></div>
          Sincronización Multi-Módulo: Activa
        </div>
        <div className="w-px h-4 bg-white/10"></div>
        <div>Última actualización: En vivo</div>
      </div>
    </div>
  );
}

