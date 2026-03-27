"use client";

import { useState } from "react";
import { X, Clock, MapPin, User, AlertCircle, CheckCircle2, MessageSquare, Zap, Camera, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  onRefresh?: () => void;
}

export default function TicketDetailModal({ isOpen, onClose, ticket, onRefresh }: TicketDetailModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [comment, setComment] = useState("");
  const [closureReason, setClosureReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !ticket) return null;

  const isUrgent = ticket.priority === 'URGENT';
  const statusName = ticket.currentState?.name || "Pendiente";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass w-full max-w-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Header with Background Accent */}
        <div className={`p-8 border-b border-white/5 relative overflow-hidden ${
          isUrgent ? 'bg-red-500/5' : 'bg-blue-500/5'
        }`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${
            isUrgent ? 'bg-red-500' : 'bg-[var(--color-neon-blue)]'
          }`}></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-mono text-[var(--color-neon-cyan)] uppercase bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                  TKT-{ticket.id.toString().split('-')[0].toUpperCase()}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                  isUrgent ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                }`}>
                  {ticket.priority}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{ticket.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <section>
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Ubicación</label>
                <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-white/5 rounded-xl text-gray-400"><MapPin size={20} /></div>
                  <div>
                    <p className="text-sm font-bold text-white">{ticket.property?.title || "Sin asignar"}</p>
                    <p className="text-xs text-gray-500 mt-1">{ticket.property?.address || "Bogotá, Colombia"}</p>
                  </div>
                </div>
              </section>

              <section>
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Técnico Asignado</label>
                <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                  {ticket.assignedTechnician ? (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-300 shadow-[0_0_15px_rgba(0,112,243,0.2)]">
                        {ticket.assignedTechnician.firstName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{ticket.assignedTechnician.firstName} {ticket.assignedTechnician.lastName}</p>
                        <p className="text-xs text-[var(--color-neon-cyan)] mt-0.5 font-mono">EN CAMPO - ACTIVO</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 text-yellow-500 font-bold animate-pulse">
                      <AlertCircle size={20} />
                      <span className="text-xs uppercase tracking-wider">Pendiente de Asignación</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Estado Actual</label>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-black text-[var(--color-neon-blue)] uppercase tracking-tight">{statusName}</span>
                    <div className="px-2 py-1 bg-green-500/10 rounded flex items-center gap-1 text-[10px] font-bold text-green-400">
                      <Clock size={10} /> {ticket.currentState?.slaHours || 24}H ANS
                    </div>
                  </div>
                  {/* Progress simulation based on order of state */}
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-cyan)] shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-1000"
                        style={{ width: `${((ticket.currentState?.order / (ticket.workflow?.states?.length || 5)) * 100).toFixed(0)}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-2 font-mono text-center uppercase tracking-tighter">
                    Estado {ticket.currentState?.order} de {ticket.workflow?.states?.length || "?"}: {ticket.currentState?.name}
                  </p>
                </div>
              </section>

              <section>
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Análisis Cognitivo</label>
                <div className="p-4 bg-[var(--color-neon-cyan)]/5 rounded-2xl border border-[var(--color-neon-cyan)]/20">
                  <div className="flex items-center gap-2 text-[var(--color-neon-cyan)] mb-2">
                    <Zap size={16} className="fill-[var(--color-neon-cyan)]" />
                    <span className="text-xs font-black uppercase">Diagnóstico IA</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed italic">
                    {ticket.aiDiagnosisSummary || "Analizando patrones históricos y sensores... Basado en el video de inspección, se recomienda revisión de tuberías de cobre de 1/2 pulgada."}
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Description Section */}
          <section>
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-4 block">Descripción del Reporte</label>
            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 text-gray-300 text-sm leading-relaxed">
              {ticket.description || "No se proporcionó descripción detallada."}
            </div>
          </section>

          <section>
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-6 block">Bitácora de Actividad</label>
            <div className="space-y-6 pl-4 border-l border-white/10">
              {(ticket.stateLogs || []).map((log: any, idx: number) => (
                <ActivityItem 
                  key={log.id}
                  icon={log.completedAt ? <CheckCircle2 size={14} /> : <Clock size={14} />} 
                  title={log.state?.name || "Estado Actual"} 
                  time={new Date(log.startedAt).toLocaleString('es-CO', { hour: 'numeric', minute: 'numeric', hour12: true })} 
                  desc={log.comment || (log.completedAt ? `Tarea completada por ${log.completedByUser?.firstName || 'Usuario'}` : "En proceso...")}
                  active={!log.completedAt}
                />
              ))}
              {(!ticket.stateLogs || ticket.stateLogs.length === 0) && (
                <ActivityItem 
                  icon={<AlertCircle size={14} />} 
                  title="Ticket Reportado" 
                  time="-" 
                  desc="Iniciando flujo de atención..."
                  active
                />
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-white/5 border-t border-white/5 flex flex-col gap-4">
          {isCompletingTask ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
               <label className="text-[10px] text-[var(--color-neon-blue)] uppercase tracking-widest font-bold block">Seguimiento de Estado: {statusName}</label>
               <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe el avance o resultado de esta etapa..."
                  className="w-full bg-black/50 border border-[var(--color-neon-blue)]/20 rounded-2xl p-4 text-sm text-gray-300 focus:outline-none focus:border-[var(--color-neon-blue)]/50 min-h-[100px] resize-none"
               />
               <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCompletingTask(false)}
                    className="flex-1 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/tickets/${ticket.id}/complete-task`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ comment, userId: 'agent-demo-id' }) // Placeholder ID
                        });
                        if (res.ok) {
                          onRefresh?.();
                          setComment("");
                          setIsCompletingTask(false);
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={!comment || loading}
                    className="flex-[2] bg-[var(--color-neon-blue)] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.3)] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Completar Tarea / Siguiente Estado"}
                  </button>
               </div>
            </div>
          ) : isClosing ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
               <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cierre formal: Motivo de Resolución</label>
               <textarea 
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="Ej: Se realizó cambio de empaque en grifería de cocina. Funcionando 100%."
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-gray-300 focus:outline-none focus:border-green-500/50 min-h-[100px] resize-none"
               />
               <div className="flex gap-3">
                  <button 
                    onClick={() => setIsClosing(false)}
                    className="flex-1 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/tickets/${ticket.id}/resolve`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ closureReason })
                        });
                        if (res.ok) {
                          onRefresh?.();
                          onClose();
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={!closureReason || loading}
                    className="flex-[2] bg-green-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-600 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Finalizar y Notificar Cliente"}
                  </button>
               </div>
            </div>
          ) : (
            <>
              <div className="flex gap-4">
                <button 
                   onClick={() => setIsCompletingTask(true)}
                   className="flex-1 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/50 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/20 transition-all shadow-[0_0_20px_rgba(0,112,243,0.1)] flex items-center justify-center gap-2"
                >
                  <Zap size={16} /> Gestionar Avance
                </button>
                <button 
                  onClick={() => setIsClosing(true)}
                  className="flex-1 bg-green-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-600 transition-all shadow-[0_0_30px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Cerrar Ticket
                </button>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 glass py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2">
                  <Camera size={16} /> Ver Evidencia
                </button>
                <button className="flex-1 bg-white/5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">
                  <MessageSquare size={16} /> Contactar Técnico
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ icon, title, time, desc, active }: any) {
  return (
    <div className="relative">
      <div className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 ${
        active ? 'bg-[var(--color-neon-blue)] border-white/20 shadow-[0_0_10px_rgba(0,112,243,0.5)]' : 'bg-[#1a1c24] border-white/10 text-gray-500'
      }`}>
        <div className={active ? 'text-white' : ''}>{icon}</div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <h4 className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
          <span className="text-[10px] font-mono text-gray-600">{time}</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
