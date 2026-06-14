import { useState, useEffect, useCallback } from "react";
import { Search, Filter, AlertCircle, Clock, MoreVertical, Loader2, MapPin, Zap, Users } from "lucide-react";
import { TENANT_ID } from "@/lib/config";
import { apiClient } from "@/lib/apiClient";
import TicketDetailModal from "./TicketDetailModal";

interface ITicket {
  id: string;
  shortId?: string;
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
  parentTicketId?: string;
  subTickets?: any[];
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setIsOffline(false);
    try {
      // Fetch Owners for filter
      const ownerData = await apiClient.get<IOwner[]>(`/users/owners?tenantId=${TENANT_ID}`).catch(() => []);
      if (Array.isArray(ownerData)) setOwners(ownerData);

      // Fetch Tickets
      const ownerQuery = selectedOwnerId ? `&ownerId=${selectedOwnerId}` : "";
      const searchQueryParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : "";
      const data = await apiClient.get<ITicket[]>(`/tickets?tenantId=${TENANT_ID}${ownerQuery}${searchQueryParam}`);
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedOwnerId, debouncedSearch]);

  useEffect(() => {
    fetchInitialData();
  }, [internalRefreshTrigger, externalRefresh, fetchInitialData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#1E3A8A] mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">Sincronizando con base de datos operativa...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="flex bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 flex-1 items-center focus-within:border-[#1E3A8A] focus-within:bg-white transition-colors">
            <Search size={18} className="text-gray-400 mr-2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ticket, inmueble, inquilino o técnico..." 
              className="bg-transparent border-none outline-none text-sm w-full text-[#1F2937] placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Users size={16} className="text-[#1E3A8A]" />
            <select 
              value={selectedOwnerId} 
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-[#1F2937]"
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-[10px] font-bold text-yellow-700 uppercase animate-pulse">
                <AlertCircle size={12} />
                <span>Simulación</span>
                <button onClick={fetchInitialData} className="ml-2 bg-yellow-100 px-2 py-0.5 rounded-md">Retry</button>
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
        <div className="bg-gray-50 rounded-xl border-2 border-gray-200 border-dashed p-6 flex flex-col items-center justify-center text-center hover:bg-gray-100 transition-colors cursor-pointer h-full min-h-[200px]">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
             <Filter size={24} className="text-[#1E3A8A]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Cargar más tickets históricos</p>
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
  let colorClass = "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";
  let dotClass = "bg-gray-400";

  if (active) {
    colorClass = "bg-[#1E3A8A] text-white border-[#1E3A8A]";
  }

  if (color === 'red') {
    dotClass = "bg-red-500";
    if (active) colorClass = "bg-red-50 text-red-700 border-red-200";
  } else if (color === 'yellow') {
    dotClass = "bg-orange-500";
    if (active) colorClass = "bg-orange-50 text-orange-700 border-orange-200";
  } else if (color === 'blue') {
    dotClass = "bg-blue-500";
    if (active) colorClass = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${colorClass}`}>
      <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
      {label}
      <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">{count}</span>
    </button>
  );
}

function SentimentBadge({ interactions }: { interactions: ITicket['interactions'] }) {
  if (!interactions?.length) return null;
  
  const latest = interactions[0].sentimentAnalysis;
  if (!latest) return null;

  const config = {
    POSITIVE: { color: 'text-[#10B981] bg-emerald-50 border-emerald-100', icon: '😊', label: 'Positivo' },
    NEUTRAL: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: '😐', label: 'Neutral' },
    NEGATIVE: { color: 'text-red-600 bg-red-50 border-red-100', icon: '😡', label: 'Negativo' },
  };

  const { color, icon, label } = config[latest as keyof typeof config] || config.NEUTRAL;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border text-[9px] font-bold uppercase ${color}`} title={`Sentimiento: ${label}`}>
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
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
      isUrgent ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' :
      isWarning ? 'bg-orange-50 text-orange-600 border border-orange-200' :
      'bg-emerald-50 text-emerald-600 border border-emerald-200'
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
    <div className={`bg-white rounded-xl p-6 border shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md relative overflow-hidden group flex flex-col ${
      isUrgent ? 'border-red-200' : 
      isInProgress ? 'border-[#1E3A8A]/30' : 
      'border-gray-200 hover:border-[#1E3A8A]/30'
    }`}>
      {/* Dynamic Top Gradient Bar */}
      <div className={`absolute top-0 inset-x-0 h-1 ${
        isUrgent ? 'bg-red-500' :
        isInProgress ? 'bg-[#1E3A8A]' :
        'bg-gray-200 group-hover:bg-[#1E3A8A]/50'
      }`}></div>

      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-[#1E3A8A] uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                {ticket.shortId ? ticket.shortId : `TKT-${ticket.id.split('-')[0].toUpperCase()}`}
            </span>
            {ticket.subTickets && ticket.subTickets.length > 0 && (
              <span className="text-[10px] font-bold text-purple-600 uppercase bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1" title={`${ticket.subTickets.length} sub-tickets generados`}>
                🗂️ Múltiple ({ticket.subTickets.length})
              </span>
            )}
            {ticket.parentTicketId && (
              <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="Este es un sub-ticket de un caso mayor">
                🔗 Sub-Ticket
              </span>
            )}
            <SentimentBadge interactions={ticket.interactions} />
          </div>
          <h3 className="text-[15px] font-bold text-[#1F2937] line-clamp-2 leading-tight" title={ticket.title}>
            {ticket.title}
          </h3>
        </div>
        <button className="text-gray-400 hover:text-[#1E3A8A] transition-colors p-1 flex-shrink-0">
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex flex-col gap-1 text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          <span className="text-gray-500 text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
             <MapPin size={10} /> Inmueble
          </span>
          <span className="text-[#1F2937] font-bold text-xs truncate">{ticket.property?.title || "No asignado"}</span>
        </div>
        
        <div className="flex flex-col gap-1.5 text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100 group-hover:border-blue-100 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Estado & ANS</span>
            <div className="flex gap-2">
              {ticket.severity === 'CRITICAL' && (
                <span className="bg-red-100 text-red-600 text-[8px] px-1.5 py-0.5 rounded font-black border border-red-200">CRÍTICO</span>
              )}
              <SLABadge createdAt={ticket.createdAt} slaHours={ticket.currentState?.slaHours} />
            </div>
          </div>
          <div className="flex flex-col mt-0.5">
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isUrgent ? 'text-red-600' : 'text-[#1E3A8A]'}`}>
              {statusName}
            </span>
            {ticket.dueDate && (
              <span className="text-[9px] text-gray-500 font-semibold mt-0.5 uppercase">
                Compromiso: {new Date(ticket.dueDate).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
        <div className="flex items-center gap-2">
            {ticket.assignedTechnician ? (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">
                        {ticket.assignedTechnician.firstName[0]}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 truncate w-24">
                        {ticket.assignedTechnician.firstName} {ticket.assignedTechnician.lastName}
                    </span>
                </div>
            ) : (
                <span className="text-[9px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 flex items-center gap-1 font-bold">
                    <AlertCircle size={10} /> ASIGNACIÓN PENDIENTE
                </span>
            )}
        </div>
        
        <div className="flex items-center gap-1 text-[#10B981] group-hover:scale-110 transition-transform bg-emerald-50 p-1.5 rounded-full border border-emerald-100">
           <Zap size={14} className={ticket.aiDiagnosisSummary ? "fill-[#10B981]" : ""} />
        </div>
      </div>
    </div>
  );
}
