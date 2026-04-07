import { useState, useEffect, useCallback } from "react";
import { Search, Filter, AlertCircle, Clock, MoreVertical, Loader2, MapPin, Zap, Users } from "lucide-react";
import { TENANT_ID, API_URL } from "@/lib/config";
import TicketDetailModal from "./TicketDetailModal";

interface ITicket {
  id: string;
  title: string;
  priority: string;
  severity: string;
  createdAt: string;
  dueDate?: string;
  property?: { title: string };
  currentState?: { name: string; slaHours?: number };
  currentStateId?: string;
  interactions: { sentimentAnalysis?: string }[];
  assignedTechnician?: { firstName: string; lastName: string };
  aiDiagnosisSummary?: string;
}

interface IOwner {
  id: string;
  firstName: string;
  lastName: string;
}

export default function TicketBoard({ refreshTrigger: externalRefresh = 0 }: { refreshTrigger?: number }) {
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [owners, setOwners] = useState<IOwner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setIsOffline(false);
    try {
      // Fetch Owners for filter
      const ownerRes = await fetch(`${API_URL}/users/owners?tenantId=${TENANT_ID}`);
      if (ownerRes.ok) {
        const ownerData = await ownerRes.json();
        setOwners(ownerData);
      }

      // Fetch Tickets
      const ownerQuery = selectedOwnerId ? `&ownerId=${selectedOwnerId}` : "";
      const response = await fetch(`${API_URL}/tickets?tenantId=${TENANT_ID}${ownerQuery}`);
      if (!response.ok) throw new Error("Backend unreachable");
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setIsOffline(true);
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [selectedOwnerId]);

  useEffect(() => {
    fetchInitialData();
  }, [internalRefreshTrigger, externalRefresh, fetchInitialData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-50">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--color-neon-blue)] mb-4" />
        <p className="text-gray-400 font-mono animate-pulse uppercase tracking-widest text-xs">Sincronizando con base de datos operativa...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters bar */}
      <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="flex bg-black/20 rounded-xl px-4 py-2 border border-white/10 flex-1 items-center focus-within:border-[var(--color-neon-blue)]/50 transition-colors">
            <Search size={18} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Buscar ticket, inmueble o inquilino..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500"
            />
          </div>

          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
            <Users size={16} className="text-blue-400" />
            <select 
              value={selectedOwnerId} 
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white"
            >
              <option value="">Filtro por Propietario</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex w-full md:w-auto gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar items-center">
          {isOffline && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[10px] font-bold text-yellow-500 uppercase animate-pulse">
                <AlertCircle size={12} />
                <span>Simulación</span>
                <button onClick={fetchInitialData} className="ml-2 bg-yellow-500/20 px-2 py-0.5 rounded-md">Retry</button>
            </div>
          )}
          <FilterBadge active={!selectedOwnerId} label="Todos" count={tickets.length.toString()} />
          <FilterBadge label="Urgentes" count={tickets.filter(t => t.priority === 'URGENT').length.toString()} color="red" />
        </div>
      </div>

      {/* Ticket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map(ticket => (
          <div key={ticket.id} onClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }} className="cursor-pointer">
            <TicketCard ticket={ticket} />
          </div>
        ))}
        {/* Placeholder for "Add" behavior or empty state visual */}
        <div className="glass rounded-2xl border border-white/5 border-dashed p-6 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer h-full min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
             <Filter size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-300">Cargar más tickets históricos</p>
        </div>
      </div>

      <TicketDetailModal 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)} 
        ticket={selectedTicket} 
        onRefresh={() => setInternalRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}

function FilterBadge({ label, count, active, color }: { label: string, count: string, active?: boolean, color?: 'red'|'yellow'|'blue' }) {
  let colorClass = "bg-white/5 text-gray-400 border-transparent hover:bg-white/10";
  let dotClass = "bg-gray-400";

  if (active) {
    colorClass = "bg-white/10 text-white border-white/20";
  }

  if (color === 'red') {
    dotClass = "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]";
    if (active) colorClass = "bg-red-500/10 text-red-300 border-red-500/20";
  } else if (color === 'yellow') {
    dotClass = "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]";
    if (active) colorClass = "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
  } else if (color === 'blue') {
    dotClass = "bg-[var(--color-neon-blue)] shadow-[0_0_8px_rgba(0,112,243,0.5)]";
    if (active) colorClass = "bg-[var(--color-neon-blue)]/10 text-blue-300 border-[var(--color-neon-blue)]/30";
  }

  return (
    <button className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap ${colorClass}`}>
      <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
      {label}
      <span className="bg-black/40 px-2 py-0.5 rounded-md text-xs">{count}</span>
    </button>
  );
}

function SentimentBadge({ interactions }: { interactions: ITicket['interactions'] }) {
  if (!interactions?.length) return null;
  
  const latest = interactions[0].sentimentAnalysis;
  if (!latest) return null;

  const config = {
    POSITIVE: { color: 'text-green-400 bg-green-400/10 border-green-500/20', icon: '😊', label: 'Positivo' },
    NEUTRAL: { color: 'text-blue-400 bg-blue-400/10 border-blue-500/20', icon: '😐', label: 'Neutral' },
    NEGATIVE: { color: 'text-red-400 bg-red-400/10 border-red-500/20', icon: '😡', label: 'Negativo' },
  };

  const { color, icon, label } = config[latest as keyof typeof config] || config.NEUTRAL;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${color}`} title={`Sentimiento: ${label}`}>
       <span>{icon}</span> {label}
    </div>
  );
}

function SLABadge({ createdAt, slaHours }: { createdAt: string, slaHours?: number }) {
  const hoursConfigured = slaHours || 24; // Default 24h if not set
  const createdDate = new Date(createdAt);
  const now = new Date();
  
  const diffMs = now.getTime() - createdDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const hoursLeft = Math.max(0, hoursConfigured - diffHours);
  
  const isUrgent = hoursLeft < 4;
  const isWarning = hoursLeft < 12;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
      isUrgent ? 'bg-red-500/20 text-red-400 animate-pulse' :
      isWarning ? 'bg-yellow-500/20 text-yellow-400' :
      'bg-green-500/20 text-green-400'
    }`}>
        <Clock size={10} />
        {hoursLeft > 0 ? `${hoursLeft.toFixed(1)}H RESTANTES` : 'SLA VENCIDO'}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: ITicket }) {
  const isUrgent = ticket.priority === 'URGENT';
  const isInProgress = ticket.currentState?.name?.toLowerCase().includes('reparación') || ticket.currentStateId !== null;
  const statusName = ticket.currentState?.name || "Pendiente";
  
  return (
    <div className={`glass rounded-2xl p-6 border transition-all hover:translate-y-[-2px] hover:shadow-xl relative overflow-hidden group flex flex-col ${
      isUrgent ? 'border-red-500/30 shadow-[0_4px_30px_rgba(248,113,113,0.1)]' : 
      isInProgress ? 'border-[var(--color-neon-blue)]/30' : 
      'border-white/5 hover:border-white/10'
    }`}>
      {/* Dynamic Top Gradient Bar */}
      <div className={`absolute top-0 inset-x-0 h-1 ${
        isUrgent ? 'bg-gradient-to-r from-red-600 to-orange-500' :
        isInProgress ? 'bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-cyan)]' :
        'bg-gradient-to-r from-yellow-500 to-gray-500'
      }`}></div>

      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-[var(--color-neon-cyan)] uppercase bg-cyan-500/10 px-1.5 py-0.5 rounded">
                TKT-{ticket.id.split('-')[0].toUpperCase()}
            </span>
            <SentimentBadge interactions={ticket.interactions} />
          </div>
          <h3 className="text-base font-semibold text-white line-clamp-2 leading-tight" title={ticket.title}>
            {ticket.title}
          </h3>
        </div>
        <button className="text-gray-500 hover:text-white transition-colors p-1 flex-shrink-0">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-1 text-sm bg-white/5 p-2 rounded-xl border border-white/5">
          <span className="text-gray-500 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
             <MapPin size={10} /> Inmueble
          </span>
          <span className="text-gray-200 font-medium truncate">{ticket.property?.title || "No asignado"}</span>
        </div>
        
        <div className="flex flex-col gap-1 text-sm bg-white/5 p-2 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Estado & ANS</span>
            <div className="flex gap-2">
              {ticket.severity === 'CRITICAL' && (
                <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black animate-bounce">CRITICAL</span>
              )}
              <SLABadge createdAt={ticket.createdAt} slaHours={ticket.currentState?.slaHours} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className={`text-[11px] font-bold uppercase tracking-tight ${isUrgent ? 'text-red-400' : 'text-blue-400'}`}>
              {statusName}
            </span>
            {ticket.dueDate && (
              <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                Compromiso: {new Date(ticket.dueDate).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-2">
            {ticket.assignedTechnician ? (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-300">
                        {ticket.assignedTechnician.firstName[0]}
                    </div>
                    <span className="text-[10px] text-gray-400 truncate w-24">
                        {ticket.assignedTechnician.firstName} {ticket.assignedTechnician.lastName}
                    </span>
                </div>
            ) : (
                <span className="text-[9px] text-yellow-500 flex items-center gap-1 font-bold animate-pulse">
                    <AlertCircle size={10} /> ASIGNACIÓN PENDIENTE
                </span>
            )}
        </div>
        
        <div className="flex items-center gap-1 text-[var(--color-neon-cyan)] group-hover:scale-110 transition-transform">
           <Zap size={14} className={ticket.aiDiagnosisSummary ? "fill-cyan-400" : ""} />
        </div>
      </div>
    </div>
  );
}
