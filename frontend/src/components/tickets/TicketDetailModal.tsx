import { useState, useMemo, useEffect } from "react";
import { 
  X, Clock, MapPin, AlertCircle, CheckCircle2, MessageSquare, Zap, 
  Camera, Loader2, Navigation, ImageIcon, Film, Trash2, Paperclip, 
  FileText, Activity, Calendar, Plus, Send, User, Phone, DollarSign,
  Gauge
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_URL } from "@/lib/config";
import SignatureCanvas from 'react-signature-canvas';
import { useRef } from "react";

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  onRefresh?: () => void;
}

export default function TicketDetailModal({ isOpen, onClose, ticket: initialTicket, onRefresh }: TicketDetailModalProps) {
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailedTicket, setDetailedTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [closureReason, setClosureReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{ date: string, time: string }[]>([]);
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [quoteItems, setQuoteItems] = useState<{ description: string, price: number, quantity: number }[]>([]);
  const [tempDesc, setTempDesc] = useState("");
  const [tempPrice, setTempPrice] = useState("");
  const [tempQty, setTempQty] = useState("1");
  const padRef = useRef<SignatureCanvas>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Autonomous fetch to ensure we have FULL details (workflow, states, logs)
  const fetchDetailedTicket = async () => {
    if (!initialTicket?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/tickets/${initialTicket.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedTicket(data);
      }
    } catch (err) {
      console.error("Error fetching detailed ticket:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialTicket?.id) {
      setDetailedTicket(null); // Reset for new ticket
      fetchDetailedTicket();
    }
  }, [isOpen, initialTicket?.id]);

  // Use the detailed data if available, fallback to initial
  const ticket = detailedTicket || initialTicket;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/tickets/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAttachments(prev => [...prev, data]);
    } catch (err) {
      console.error("Upload error:", err);
      alert("No se pudo subir el archivo. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  // Memoized calculations for progress and ETA
  const { progress, remainingSLA, totalSLA, sortedStates, currentIndex } = useMemo(() => {
    if (!ticket) return { progress: 0, remainingSLA: 0, totalSLA: 0, sortedStates: [], currentIndex: -1 };
    
    const states = [...(ticket.workflow?.states || [])].sort((a, b) => a.order - b.order);
    const currentStateId = ticket.currentStateId || ticket.currentState?.id;
    const idx = states.findIndex(s => s.id === currentStateId);
    const total = states.length || 1;
    
    let prog = 0;
    if (idx !== -1) {
        prog = Math.round(((idx + 1) / total) * 100);
    } else if (ticket.currentState?.order) {
        prog = Math.min(Math.round((ticket.currentState.order / total) * 100), 100);
    }
    
    const remaining = states
      .filter((_, i) => i > idx)
      .reduce((sum: number, s: any) => sum + (s.slaHours || 24), 0);

    const totalTime = states.reduce((sum: number, s: any) => sum + (s.slaHours || 24), 0);

    return { 
      progress: Math.min(prog, 100), 
      remainingSLA: remaining, 
      totalSLA: totalTime,
      sortedStates: states,
      currentIndex: idx
    };
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const isUrgent = ticket.priority === 'URGENT';
  const statusName = ticket.currentState?.name || "Pendiente";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-strong w-full max-w-2xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Header with High-Tech Accent */}
        <div className={`p-6 border-b border-white/5 relative overflow-hidden ${
          isUrgent ? 'bg-red-500/5' : 'bg-blue-500/5'
        }`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
          
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
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Live Monitor</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{ticket.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* STEP 1: WORKFLOW TIMELINE (INNOVATIVE) */}
          <section className="space-y-4">
             <div className="flex justify-between items-end">
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">Línea de Tiempo del Flujo</label>
                <span className="text-[10px] font-mono text-[var(--color-neon-cyan)] font-bold">{progress}% COMPLETADO</span>
             </div>
             <WorkflowTimeline 
                states={sortedStates} 
                currentIndex={currentIndex} 
             />
          </section>

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* STEP 2: GEOREFERENCE RADAR (DISRUPTIVE) */}
              <section>
                <div className="flex justify-between items-center mb-3">
                   <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">Mapa de Operación</label>
                   <span className="text-[9px] text-[var(--color-neon-cyan)] font-mono flex items-center gap-1">
                      <Navigation size={10} /> {ticket.property?.title || "Verdanza"}
                   </span>
                </div>
                <GeoreferenceRadar propertyName={ticket.property?.title} address={ticket.property?.address} />
              </section>

              {/* TICKET OWNER SECTION (NEW) */}
              <section className="animate-in slide-in-from-left-4 duration-500">
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Dueño del Ticket (Cliente)</label>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-3xl border border-white/5 group hover:border-orange-500/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                  {ticket.reportedByUser ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-lg font-bold text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                        <User size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-[13px] font-black text-white uppercase tracking-tighter leading-none">{ticket.reportedByUser.firstName} {ticket.reportedByUser.lastName}</p>
                          <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-widest">
                            {ticket.reportedByUser.role === 'TENANT_USER' ? 'Arrendatario' : 'Propietario'}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1.5 pt-2 border-t border-white/5">
                           <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                              <MessageSquare size={12} className="text-gray-600" />
                              <span className="truncate">{ticket.reportedByUser.email}</span>
                           </div>
                           <div className="flex items-center gap-2 text-[10px] font-black text-green-400">
                              <Phone size={12} className="text-green-600" />
                              <span>{ticket.reportedByUser.phone || "Sin whatsapp"}</span>
                              <div className="w-1 h-1 rounded-full bg-green-500 animate-ping"></div>
                           </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 p-2 text-gray-500 italic">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs uppercase tracking-widest">Cargando datos del cliente...</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Responsable Asignado</label>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-[var(--color-neon-blue)]/50 transition-colors">
                  {ticket.assignedTechnician ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg font-bold text-blue-300 shadow-[0_0_15px_rgba(0,112,243,0.2)]">
                        {ticket.assignedTechnician.firstName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{ticket.assignedTechnician.firstName} {ticket.assignedTechnician.lastName}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] text-green-400 font-mono flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-green-400"></div> EN LÍNEA
                           </span>
                           <span className="text-[10px] text-gray-500 font-mono">ID: TECH-092</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 text-yellow-500 font-bold animate-pulse py-2">
                      <AlertCircle size={20} />
                      <span className="text-xs uppercase tracking-wider">Esperando Asignación de Agente</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {/* STEP 3: DYNAMIC PROGRESS & ETA */}
              <section>
                <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Estado y Previsión de Cierre</label>
                <div className="p-5 bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Gauge size={80} />
                  </div>
                  
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                         <span className="text-xs font-bold text-gray-500 block mb-1">Estado Actual</span>
                         <span className="text-lg font-black text-[var(--color-neon-blue)] uppercase tracking-tight leading-none">{statusName}</span>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-bold text-gray-500 block mb-1">ETA Restante</span>
                         <span className="text-lg font-mono font-black text-[var(--color-neon-cyan)] line-clamp-1">~{remainingSLA} HORAS</span>
                      </div>
                    </div>

                    {/* NEW: Assignment Info in Header */}
                    {(() => {
                      const currentLog = [...(ticket.stateLogs || [])].find(l => !l.completedAt);
                      if (!currentLog) return null;
                      const { name, role } = resolveAssignment(currentLog, ticket);
                      const slaHours = currentLog.state?.slaHours || 0;
                      const startedAt = new Date(currentLog.startedAt);
                      const deadline = slaHours > 0 ? new Date(startedAt.getTime() + slaHours * 3600000) : null;

                      return (
                        <div className="mb-4 p-2 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2 relative z-10">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                              <span className="text-[10px] font-black text-white uppercase tracking-wider">{name}</span>
                              <span className="text-[9px] text-gray-500 uppercase">({role})</span>
                           </div>
                           <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-gray-500">
                              <div className="flex flex-col">
                                 <span className="uppercase text-[7px] text-gray-600">Inicio Proc.</span>
                                 <span className="text-gray-400">{startedAt.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: 'numeric' })}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                 <span className="uppercase text-[7px] text-gray-600">Final Estimado</span>
                                 <span className={new Date() > (deadline || 0) ? "text-red-500" : "text-cyan-600"}>
                                    {deadline?.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: 'numeric' }) || 'N/A'}
                                 </span>
                              </div>
                           </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-2 relative z-10">
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <div 
                            className="h-full bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,112,243,0.6)] rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-500 font-mono uppercase font-black">
                         <span>Avance Global</span>
                         <span>Progreso {progress}%</span>
                      </div>
                    </div>
                </div>
              </section>

              {/* STEP 4: OPS INTELLIGENCE (INNOVATIVE) */}
              <section>
                 <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-3 block">Inteligencia Operativa (IA)</label>
                 <OpsIntelligence />
              </section>
            </div>
          </div>

          {/* Description Section */}
          <section>
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-4 block">Descripción del Incidente</label>
            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 text-gray-300 text-sm leading-relaxed relative">
              <MessageSquare className="absolute top-6 right-6 opacity-10" size={20} />
              {ticket.description || "No se proporcionó descripción detallada."}
            </div>
          </section>

          {/* Activity Log */}
          <section>
            <label className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-6 block">Historial de Transiciones</label>
            <div className="space-y-6 pl-4 border-l border-white/10 ml-2">
              {sortedStates.map((state: any, idx: number) => {
                const log = (ticket.stateLogs || []).find((l: any) => l.state?.id === state.id || l.stateId === state.id);
                const isActive = ticket.currentStateId === state.id;
                const isCompleted = !!log?.completedAt;
                
                // Use the real log if available, otherwise simulate one for assignment resolution
                const displayLog = log || { state };
                const { name, role } = resolveAssignment(displayLog, ticket);
                const assignment = name ? `${name} (${role})` : `Pendiente de: ${role}`;

                const slaHours = state.slaHours || 0;
                const startedAt = log?.startedAt || (idx === currentIndex ? ticket.updatedAt : null);
                const deadlineDate = (startedAt && slaHours > 0) ? new Date(new Date(startedAt).getTime() + slaHours * 3600000) : null;
                const isOverdue = isActive && deadlineDate && new Date() > deadlineDate;
                const deadlineStr = deadlineDate ? deadlineDate.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true }) : (slaHours > 0 ? `${slaHours}h SLA` : null);

                return (
                  <ActivityItem 
                    key={state.id}
                    icon={isCompleted ? <CheckCircle2 size={14} /> : (isActive ? <Clock size={14} className="animate-pulse" /> : <Activity size={14} className="opacity-30" />)} 
                    title={state.name || "Estado"} 
                    time={log?.startedAt ? new Date(log.startedAt).toLocaleString('es-CO', { hour: 'numeric', minute: 'numeric', hour12: true }) : (isActive ? "Iniciado" : "Programado")} 
                    desc={log?.comment || (isActive ? "Actualmente en revisión..." : (isCompleted ? "Completado" : "Próxima etapa en el flujo operativo..."))}
                    active={isActive}
                    assignment={assignment}
                    deadline={deadlineStr}
                    isOverdue={isOverdue}
                    attachments={log?.attachments}
                  />
                );
              })}
              {(!ticket.stateLogs || ticket.stateLogs.length === 0) && (
                <ActivityItem 
                  icon={<AlertCircle size={14} />} 
                  title="Apertura de Ticket" 
                  time="-" 
                  desc="Generación automática de flujo basada en diagnóstico visual..."
                  active
                />
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className={`transition-all duration-300 ${isCompletingTask ? 'p-6' : 'p-8'} bg-black/40 border-t border-white/5 flex-shrink-0`}>
          {isCompletingTask ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                {ticket.currentState?.name?.toLowerCase().includes('agendamiento') ? (
                  <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-[var(--color-neon-blue)]/20 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-[var(--color-neon-blue)]" />
                        <span className="text-[12px] font-black uppercase tracking-widest text-white">Proponer Disponibilidad</span>
                      </div>
                      <div className="flex items-center gap-1 bg-[var(--color-neon-blue)]/10 px-2 py-0.5 rounded border border-[var(--color-neon-blue)]/20 text-[8px] font-black text-[var(--color-neon-blue)]">
                         <Clock size={10} /> AGENDACIÓN INTELIGENTE
                      </div>
                    </div>
                    
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <label className="text-[9px] text-gray-500 uppercase font-bold mb-2 block">Nueva Opción de Fecha y Hora</label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="relative">
                            <input 
                              type="date" 
                              value={tempDate}
                              onChange={(e) => setTempDate(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[var(--color-neon-blue)]/50 transition-all appearance-none pr-10"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="time" 
                              value={tempTime}
                              onChange={(e) => setTempTime(e.target.value)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-[var(--color-neon-blue)]/50 transition-all appearance-none"
                              style={{ colorScheme: 'dark' }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (tempDate && tempTime) {
                                  setSelectedSlots([...selectedSlots, { date: tempDate, time: tempTime }]);
                                  setTempDate("");
                                  setTempTime("");
                                }
                              }}
                              className="bg-[var(--color-neon-blue)] px-3 rounded-xl text-white hover:bg-blue-600 transition-all shadow-[0_4px_12px_rgba(0,112,243,0.3)]"
                              title="Agregar Opción"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                    </div>

                    {selectedSlots.length > 0 ? (
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                        <label className="text-[9px] text-gray-400 uppercase font-black">Opciones Seleccionadas</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedSlots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[var(--color-neon-blue)]/10 px-3 py-1.5 rounded-full border border-[var(--color-neon-blue)]/30 group animate-in zoom-in duration-200">
                              <span className="text-[10px] font-bold text-white">{slot.date}</span>
                              <div className="w-1 h-1 bg-[var(--color-neon-blue)] rounded-full opacity-40"></div>
                              <span className="text-[10px] font-black text-[var(--color-neon-blue)]">{slot.time}</span>
                              <button onClick={() => setSelectedSlots(selectedSlots.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-50">
                         <Calendar className="text-gray-700" size={24} />
                         <span className="text-[10px] text-gray-600 font-medium">No has agregado opciones de agenda</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                       <Zap size={14} className="text-blue-400 mt-0.5" />
                       <p className="text-[9px] text-blue-300 leading-relaxed font-medium">
                          Selecciona una o varias opciones. Al enviar, el cliente recibirá una notificación por **WhatsApp** para confirmar su preferida.
                       </p>
                    </div>
                  </div>
                ) : ticket.currentState?.name?.toLowerCase().includes('cotización') ? (
                 <div className="space-y-4 bg-black/40 p-6 rounded-3xl border border-orange-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-orange-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Generador de Cotización Ejecutiva</span>
                      </div>
                      <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 text-[8px] font-bold text-orange-400 animate-pulse">
                        <Zap size={10} /> AI POWERED
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 border-dashed flex items-center gap-3">
                       <ImageIcon size={14} className="text-gray-600" />
                       <p className="text-[9px] text-gray-500 font-medium">
                          Si ya posees un documento físico o digital, **adjúntalo abajo** y nuestro motor **Atento-Vision** lo profesionalizará automáticamente.
                       </p>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] text-gray-500 uppercase font-black">Agregar Items al Presupuesto (Manual)</label>
                       <input 
                        type="text" 
                        placeholder="Descripción del item o servicio..."
                        value={tempDesc}
                        onChange={(e) => setTempDesc(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-orange-500/40"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input 
                          type="number" 
                          placeholder="Precio"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-orange-500/40"
                        />
                        <input 
                          type="number" 
                          placeholder="Cant"
                          value={tempQty}
                          onChange={(e) => setTempQty(e.target.value)}
                          className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-orange-500/40"
                        />
                        <button 
                           onClick={() => {
                             if (tempDesc && tempPrice) {
                               setQuoteItems([...quoteItems, { description: tempDesc, price: parseFloat(tempPrice), quantity: parseInt(tempQty) }]);
                               setTempDesc("");
                               setTempPrice("");
                               setTempQty("1");
                             }
                           }}
                           className="bg-orange-600 py-2 rounded-xl text-[10px] font-black uppercase text-white hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> AGREGAR
                        </button>
                      </div>
                    </div>

                    {quoteItems.length > 0 && (
                      <div className="max-h-[120px] overflow-y-auto pr-2 space-y-2">
                        {quoteItems.map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded-lg border border-white/5 group hover:border-orange-500/20">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-white">{item.description}</span>
                              <span className="text-[9px] text-gray-500">{item.quantity} x ${item.price.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-black text-orange-400">${(item.price * item.quantity).toLocaleString()}</span>
                              <button onClick={() => setQuoteItems(quoteItems.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               ) : (
                  <textarea
                     value={comment}
                     onChange={(e) => setComment(e.target.value)}
                     placeholder="Detalla los avances técnicos o hallazgos..."
                     className="w-full bg-black/50 border border-[var(--color-neon-blue)]/30 rounded-2xl p-4 text-sm text-gray-300 focus:outline-none focus:border-[var(--color-neon-blue)]/60 min-h-[100px] resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                  />
               )}

               {/* Compact Multimedia Upload Area */}
               <div className="bg-white/5 p-4 rounded-2xl border border-white/5 mt-4">
                  <div className="flex justify-between items-center mb-3">
                     <div className="flex items-center gap-2">
                        <Paperclip size={14} className="text-gray-500" />
                        <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Documentos y Multimedia</label>
                     </div>
                     <div className="relative">
                        <input 
                           type="file" 
                           id="ticket-media" 
                           className="hidden" 
                           onChange={handleFileUpload}
                           accept="image/*,video/*,.pdf"
                           multiple
                        />
                        <label 
                           htmlFor="ticket-media"
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/30 rounded-full text-[9px] font-black text-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/40 cursor-pointer transition-all uppercase tracking-tighter"
                        >
                           {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                           {isUploading ? "Cargando..." : (ticket.currentState?.name?.toLowerCase().includes('cotización') ? "Elegir Archivo" : "Adjuntar")}
                        </label>
                     </div>
                  </div>

                  {attachments.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                        {attachments.map((att: any, i: number) => (
                           <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group">
                              {att.type === 'video' ? (
                                 <div className="w-full h-full bg-gray-800 flex items-center justify-center"><Film size={16} className="text-gray-500" /></div>
                               ) : att.url.toLowerCase().endsWith('.pdf') ? (
                                  <div className="w-full h-full bg-red-900/20 flex items-center justify-center">
                                     <FileText size={16} className="text-red-400" />
                                  </div>
                               ) : att.url.toLowerCase().endsWith('.docx') || att.url.toLowerCase().endsWith('.doc') ? (
                                  <div className="w-full h-full bg-blue-900/20 flex items-center justify-center">
                                     <FileText size={16} className="text-blue-400" />
                                  </div>
                               ) : (
                                  <img 
                                    src={att.url.startsWith('/') ? `${API_URL}${att.url}` : att.url} 
                                    className="w-full h-full object-cover" 
                                    alt="preview" 
                                  />
                               )}
                              <button 
                                 onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                                 className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                 <Trash2 size={12} className="text-red-400" />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               <div className="flex gap-3">
                  <button onClick={() => {
                    setIsCompletingTask(false);
                    setSelectedSlots([]);
                    setQuoteItems([]);
                  }} className="flex-1 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (loading) return;
                      console.log("🚀 Starting handleSubmitProposal...");
                      setLoading(true);
                      
                      try {
                        const isAgendamiento = ticket.currentState?.name?.toLowerCase().includes('agendamiento');
                        const isCotizacion = ticket.currentState?.name?.toLowerCase().includes('cotización');
                        
                        let finalComment = comment;
                        let finalSlots = [...selectedSlots];
                        
                        // Auto-add current selection if list is empty but inputs are filled
                        if (isAgendamiento && finalSlots.length === 0 && tempDate && tempTime) {
                           console.log("Auto-adding slot from inputs:", { tempDate, tempTime });
                           finalSlots = [{ date: tempDate, time: tempTime }];
                        }

                        if (isAgendamiento && finalSlots.length > 0) {
                          finalComment = "Opciones de agendamiento propuestas:\n" + 
                            finalSlots.map((s, idx) => `${idx + 1}. ${s.date} a las ${s.time}`).join('\n');
                        } else if (isCotizacion) {
                          finalComment = quoteItems.length > 0 ? JSON.stringify(quoteItems) : comment;
                        }

                        console.log("Prepared payload:", { id: ticket.id, comment: finalComment, slots: finalSlots.length });

                        const res = await fetch(`${API_URL}/tickets/${ticket.id}/complete-task`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            userId: 'agent-demo-id', 
                            comment: finalComment,
                            attachments: attachments.map(a => ({ name: a.url.split('/').pop(), url: a.url, type: a.type }))
                          })
                        });

                        if (res.ok) {
                          alert("✔ Éxito: La propuesta ha sido enviada al cliente.");
                          setComment("");
                          setAttachments([]);
                          setSelectedSlots([]);
                          setQuoteItems([]);
                          setIsCompletingTask(false);
                          setTimeout(() => {
                             onRefresh?.();
                          }, 200);
                        } else {
                          const errorData = await res.json().catch(() => ({ message: "Error desconocido" }));
                          alert("❌ Error del Servidor: " + (errorData.message || "No se pudo procesar la solicitud"));
                        }
                      } catch (err) {
                        console.error("Critical Submit Error:", err);
                        alert("❌ Error de Conexión: No se pudo contactar con el servidor. Revisa tu internet.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={(ticket.currentState?.name?.toLowerCase().includes('agendamiento') ? (selectedSlots.length === 0 && (!tempDate || !tempTime)) : 
                                ticket.currentState?.name?.toLowerCase().includes('cotización') ? (quoteItems.length === 0 && attachments.length === 0) :
                                !comment) || loading}
                    className={`flex-[2] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg disabled:opacity-50 ${
                      ticket.currentState?.name?.toLowerCase().includes('cotización') 
                      ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20' 
                      : 'bg-[var(--color-neon-blue)] hover:bg-blue-600 shadow-[var(--color-neon-blue)]/40'
                    }`}
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : (
                      <div className="flex items-center justify-center gap-2">
                        {ticket.currentState?.name?.toLowerCase().includes('agendamiento') ? <Send size={14} /> : 
                         ticket.currentState?.name?.toLowerCase().includes('cotización') ? <Paperclip size={14} /> : null}
                        {ticket.currentState?.name?.toLowerCase().includes('agendamiento') ? "Enviar Opciones al Cliente" : 
                         ticket.currentState?.name?.toLowerCase().includes('cotización') ? "Generar Cotización Formal" :
                         "Finalizar Etapa y Notificar"}
                      </div>
                    )}
                  </button>
               </div>
            </div>
          ) : isClosing ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <span className="text-[12px] font-black uppercase tracking-widest text-white">Certificar Recibido</span>
                  </div>
                  
                  <textarea 
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    placeholder="Resumen del cierre (Se enviará al propietario/cliente)..."
                    className="w-full bg-black/50 border border-green-500/30 rounded-2xl p-4 text-sm text-gray-300 focus:outline-none focus:border-green-500/60 min-h-[80px] resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                  />

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Firma Digital del Cliente</label>
                    <div className="bg-white rounded-2xl p-2 border-2 border-dashed border-gray-700/30 group hover:border-[var(--color-neon-cyan)]/50 transition-all overflow-hidden h-40 relative">
                      <SignatureCanvas 
                        ref={padRef}
                        penColor='black'
                        canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                        onEnd={() => setSignature(padRef.current?.toDataURL() || null)}
                      />
                      {signature && (
                        <button 
                          onClick={() => { padRef.current?.clear(); setSignature(null); }}
                          className="absolute bottom-3 right-3 p-1.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-500 italic">Por favor, solicite al cliente firmar sobre el recuadro blanco para certificar la recepción.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setIsClosing(false); setSignature(null); }} className="flex-1 py-3 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancelar</button>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const res = await fetch(`${API_URL}/tickets/${ticket.id}/resolve`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            closureReason,
                            signature: padRef.current?.isEmpty() ? null : padRef.current?.toDataURL()
                          })
                        });
                        if (res.ok) { 
                          onRefresh?.(); 
                          onClose(); 
                        } else {
                          const errorData = await res.json().catch(() => ({}));
                          alert(`Error al resolver ticket: ${errorData.message || 'Error desconocido'}`);
                        }
                      } catch (err) {
                        console.error("Resolution error:", err);
                        alert("Error de red al intentar resolver el ticket.");
                      } finally { setLoading(false); }
                    }}
                    disabled={!closureReason || loading || !signature}
                    className="flex-[2] bg-green-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-600 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Certificar Resolución Exitosamente"}
                  </button>
                </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setIsCompletingTask(true)} className="bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/50 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/20 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,112,243,0.1)]">
                  <Zap size={16} className="fill-[var(--color-neon-blue)]" /> Próximo Estado
               </button>
               <button onClick={() => setIsClosing(true)} className="bg-green-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(22,163,74,0.3)]">
                  <CheckCircle2 size={16} /> Cerrar Caso
               </button>
               <button className="bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Camera size={16} /> Multimedia
               </button>
               <button className="bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2">
                  <MessageSquare size={16} /> Contactar
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// INNOVATIVE: Flow Timeline Component
function WorkflowTimeline({ states, currentIndex }: { states: any[], currentIndex: number }) {
   return (
      <div className="flex items-center w-full px-2 overflow-x-auto custom-scrollbar pb-8 pt-2">
         {states.map((state: any, idx: number) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            
            return (
               <div key={state.id} className="flex-1 min-w-[120px] flex items-center relative">
                  {/* Connective Line */}
                  {idx > 0 && (
                     <div className={`h-1 flex-1 -ml-1 ${isCompleted || isActive ? 'bg-[var(--color-neon-blue)] shadow-[0_0_10px_rgba(0,112,243,0.3)]' : 'bg-white/5'}`}></div>
                  )}
                  
                  {/* Node */}
                  <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 shrink-0 ${
                     isCompleted ? 'bg-green-500/20 border-green-500 text-green-500' :
                     isActive ? 'bg-[var(--color-neon-blue)] border-white/40 text-white shadow-[0_0_15px_rgba(0,112,243,0.8)]' :
                     'bg-black/40 border-white/10 text-gray-600'
                  }`}>
                     {isCompleted ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                     
                     {/* Label (Floating) */}
                     <div className={`absolute -bottom-6 whitespace-nowrap text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-[var(--color-neon-cyan)]' : 'text-gray-600'}`}>
                        {state.name}
                     </div>

                     {/* Glow for Active */}
                     {isActive && <div className="absolute inset-0 rounded-full animate-ping bg-[var(--color-neon-blue)] opacity-20"></div>}
                  </div>
               </div>
            );
         })}
      </div>
   );
}

// DISRUPTIVE: Georeference Radar Component
function GeoreferenceRadar({ propertyName, address }: any) {
   return (
      <div className="h-40 bg-black/60 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center">
         {/* Grid lines animation */}
         <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
         
         {/* Circular Radar Scan */}
         <div className="absolute inset-x-0 top-1/2 -mt-[1px] h-[2px] bg-[var(--color-neon-cyan)] opacity-20 shadow-[0_0_20px_var(--color-neon-cyan)]"></div>
         
         {/* Property Pin */}
         <div className="relative z-10 flex flex-col items-center">
            <div className="relative">
               <MapPin className="text-[var(--color-neon-cyan)] animate-bounce" size={24} />
               <div className="absolute -bottom-1 left-1/2 -ml-3 w-6 h-1 bg-black/40 blur-sm rounded-full"></div>
            </div>
            <div className="mt-2 text-center">
               <span className="text-[10px] font-black text-white px-2 py-0.5 bg-black/80 rounded-lg border border-white/10 uppercase">{propertyName || "Conjunto Verdanza"}</span>
            </div>
         </div>

         {/* Tech Overlay */}
         <div className="absolute bottom-2 left-2 text-[8px] font-mono text-gray-600">
            LAT: 4.7110° N / LONG: 74.0721° W
         </div>
         <div className="absolute top-2 right-2 flex gap-1 items-center px-1.5 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/30">
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-[8px] font-black text-cyan-400 uppercase">Signal: High</span>
         </div>
      </div>
   );
}

// INNOVATIVE: Ops Intelligence Section
function OpsIntelligence() {
   return (
      <div className="grid grid-cols-2 gap-3">
         <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[9px] font-black text-gray-500 uppercase">
               <span>Carga del Técnico</span>
               <span className="text-yellow-500">82%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-yellow-500 opacity-60 w-[82%]"></div>
            </div>
         </div>
         <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[9px] font-black text-gray-500 uppercase">
               <span>Impacto Tráfico</span>
               <span className="text-green-500">Bajo</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-green-500 opacity-60 w-[15%]"></div>
            </div>
         </div>
      </div>
   );
}

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    'ADMIN_TENANT': 'Administrador',
    'AGENT': 'Gestor',
    'TECHNICIAN': 'Técnico',
    'OWNER': 'Propietario',
    'TENANT_USER': 'Inquilino',
    'SUPERADMIN': 'Soporte Teus'
  };
  return roles[role] || role;
};

const resolveAssignment = (log: any, ticket: any) => {
   // Precedence 1: User who COMPLETED the task
   if (log.completedByUser) {
      return { 
         name: `${log.completedByUser.firstName} ${log.completedByUser.lastName || ''}`.trim(), 
         role: formatRole(log.completedByUser.role || log.state?.assignedRole || 'Gestor')
      };
   }

   // Precedence 2: Specific assigned Responsible for that state
   if (log.state?.responsible) {
      return { 
         name: `${log.state.responsible.firstName} ${log.state.responsible.lastName || ''}`.trim(), 
         role: formatRole(log.state.assignedRole)
      };
   }

   // Precedence 3: Role-based lookup from ticket context
   const role = log.state?.assignedRole;
   let resUser = null;

   if (role === 'TECHNICIAN') resUser = ticket.assignedTechnician;
   if (role === 'TENANT_USER') resUser = ticket.reportedByUser;
   if (role === 'OWNER') {
      const ownerRel = ticket.property?.relations?.find((r: any) => r.relationType === 'OWNER');
      resUser = ownerRel?.user;
   }
   if (role === 'AGENT') {
      resUser = ticket.property?.assignments?.[0]?.agent;
   }

   if (resUser) {
      return { 
         name: `${resUser.firstName} ${resUser.lastName || ''}`.trim(), 
         role: formatRole(role)
      };
   }

   return { name: null, role: formatRole(role) };
};

function ActivityItem({ icon, title, time, desc, active, assignment, deadline, isOverdue, attachments }: any) {
  return (
    <div className="relative pb-6">
      <div className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border flex items-center justify-center z-10 transition-all ${
        active ? 'bg-[var(--color-neon-blue)] border-white/40 shadow-[0_0_15px_rgba(0,112,243,0.5)]' : 'bg-[#1a1c24] border-white/10 text-gray-500'
      }`}>
        <div className={active ? 'text-white' : ''}>{icon}</div>
      </div>
      <div className="animate-in slide-in-from-left-2 duration-500">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className={`text-xs font-black uppercase tracking-tight ${active ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
          <span className="text-[9px] font-mono text-gray-600 bg-white/5 px-1 rounded">{time}</span>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-1.5">
          {assignment && (
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-cyan-400 animate-pulse' : 'bg-gray-700'}`}></div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-cyan-400' : 'text-gray-600'}`}>
                {assignment}
              </span>
            </div>
          )}
          
          {deadline && (
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-white/5 bg-white/5">
              <span className={`text-[8px] font-black uppercase tracking-tighter ${isOverdue ? 'text-red-500' : (active ? 'text-cyan-400' : 'text-gray-600')}`}>
                {isOverdue ? "⚠️ Vencido:" : "Vence:"} {deadline}
              </span>
            </div>
          )}
        </div>

        <div className={`text-[11px] leading-relaxed markdown-container ${active ? 'text-gray-300 font-medium' : 'text-gray-500'} mb-2 text-wrap break-words`}>
           <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({node, ...props}) => <table className="w-full my-2 border-collapse border border-white/10 rounded-lg overflow-hidden" {...props} />,
                thead: ({node, ...props}) => <thead className="bg-white/5" {...props} />,
                th: ({node, ...props}) => <th className="p-1 border border-white/10 text-left font-black uppercase text-[8px]" {...props} />,
                td: ({node, ...props}) => <td className="p-1 border border-white/10 text-[9px]" {...props} />,
                p: ({node, ...props}) => <p className="mb-1" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-[10px] font-black uppercase text-[var(--color-neon-blue)] mt-2 mb-1" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[var(--color-neon-blue)] pl-2 italic my-1 opacity-70" {...props} />,
                a: ({node, ...props}) => {
                  const fullHref = props.href?.startsWith('/') ? `${API_URL}${props.href}` : props.href;
                  return <a className="text-[var(--color-neon-blue)] font-bold underline hover:text-[var(--color-neon-cyan)] transition-colors" {...props} href={fullHref} target="_blank" rel="noopener noreferrer" />;
                }
              }}
           >
              {desc}
           </ReactMarkdown>
        </div>

        {attachments && attachments.length > 0 && (
           <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((att: any, i: number) => {
                 const fullUrl = att.url.startsWith('/') ? `${API_URL}${att.url}` : att.url;
                 return (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/20 group cursor-pointer hover:border-[var(--color-neon-blue)]/50 transition-all">
                       {att.type === 'video' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                             <Film size={20} className="text-[var(--color-neon-blue)]" />
                             <span className="text-[7px] text-gray-500 font-bold uppercase">Video</span>
                          </div>
                       ) : att.url.toLowerCase().endsWith('.pdf') ? (
                          <div className="w-full h-full bg-red-900/20 flex flex-col items-center justify-center gap-1">
                             <FileText size={20} className="text-red-400" />
                             <span className="text-[7px] text-red-500 font-bold uppercase">PDF</span>
                          </div>
                        ) : att.url.toLowerCase().endsWith('.docx') || att.url.toLowerCase().endsWith('.doc') ? (
                          <div className="w-full h-full bg-blue-900/20 flex flex-col items-center justify-center gap-1">
                             <FileText size={20} className="text-blue-400" />
                             <span className="text-[7px] text-blue-500 font-bold uppercase">Word</span>
                          </div>
                       ) : (
                          <img src={fullUrl} className="w-full h-full object-cover" alt="evidence" />
                       )}
                       <a 
                          href={fullUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center"
                       >
                          <Paperclip size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                       </a>
                    </div>
                 );
              })}
           </div>
        )}
      </div>
    </div>
  );
}
