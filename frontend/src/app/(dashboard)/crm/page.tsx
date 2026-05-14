"use client";

import { useState, useEffect } from "react";
import { Users, Target, MessageSquare, TrendingUp, Filter, Search, Plus, UserPlus, Radar } from "lucide-react";
import FunnelChart from "@/components/crm/FunnelChart";
import { TENANT_ID, API_URL } from "@/lib/config";
import CreateProspectModal from "@/components/crm/CreateProspectModal";
import ProspectTaskSidebar from "@/components/crm/ProspectTaskSidebar";
import RadarIA from "@/components/crm/RadarIA";
import { CheckCircle2, Circle } from "lucide-react";

export default function CrmDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'RADAR'>('GENERAL');

  const [funnelData, setFunnelData] = useState([
    { status: 'NEW', count: 0 },
    { status: 'QUALIFIED', count: 0 },
    { status: 'NEGOTIATION', count: 0 },
    { status: 'CLOSED_WON', count: 0 },
    { status: 'CLOSED_LOST', count: 0 },
  ]);

  const [sentimentData, setSentimentData] = useState([
    { sentiment: 'POSITIVE', count: 0, icon: "😊", color: "text-green-400" },
    { sentiment: 'NEUTRAL', count: 0, icon: "😐", color: "text-blue-400" },
    { sentiment: 'NEGATIVE', count: 0, icon: "😠", color: "text-red-400" },
  ]);

  useEffect(() => {
    fetchCrmData();
  }, [refreshTrigger]);

  const fetchCrmData = async () => {
    setLoading(true);
    try {
      const [pRes, fRes, sRes] = await Promise.all([
        fetch(`${API_URL}/crm/prospects?tenantId=${TENANT_ID}&limit=100`).then(r => r.json()),
        fetch(`${API_URL}/crm/analytics/funnel?tenantId=${TENANT_ID}`).then(r => r.json()),
        fetch(`${API_URL}/crm/analytics/sentiment?tenantId=${TENANT_ID}`).then(r => r.json()),
      ]);

      // Defensive checks — backend may return {message, statusCode} on auth error.
      // CRM Block E: findAll now returns { data, totalRecords, ... } — unwrap
      // .data, fall back to raw array for any legacy caller still hitting an
      // un-deployed pod.
      const prospectsArray = Array.isArray(pRes) ? pRes : pRes?.data;
      setProspects(Array.isArray(prospectsArray) ? prospectsArray : []);
      if (Array.isArray(fRes) && fRes.length > 0) setFunnelData(fRes);
      
      if (Array.isArray(sRes)) {
        const mappedSentiment = sentimentData.map(s => ({
          ...s,
          count: sRes.find((r: any) => r.sentiment === s.sentiment)?.count || 0
        }));
        setSentimentData(mappedSentiment);
      }

    } catch (error) {
      console.error("Error fetching CRM data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentSelected = selectedProspect ? prospects.find(p => p.id === selectedProspect.id) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Target className="text-[var(--color-neon-cyan)]" /> {activeTab === 'RADAR' ? 'RADAR IA' : 'CRM'}
          </h1>
          <p className="text-gray-400 mt-1">
            {activeTab === 'RADAR' ? 'Detección proactiva de oportunidades de captación' : 'Gestión de leads y análisis de conversión omnicanal'}
          </p>
        </div>
        <div className="flex gap-3">
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex gap-1">
                <button 
                  onClick={() => setActiveTab('GENERAL')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-[var(--color-neon-blue)] text-white shadow-[0_0_10px_rgba(45,185,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                >
                  General
                </button>
                <button 
                  id="tab-radar"
                  onClick={() => setActiveTab('RADAR')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'RADAR' ? 'bg-[var(--color-neon-cyan)] text-black shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                >
                  <Radar size={14} className={activeTab === 'RADAR' ? 'animate-pulse' : ''} />
                  Radar IA
                </button>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
            >
                <UserPlus size={16} /> Nuevo Prospecto
            </button>
        </div>
      </div>

      <CreateProspectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setIsModalOpen(false);
        }} 
      />

      {activeTab === 'RADAR' ? (
        <RadarIA onConvert={() => {
          setRefreshTrigger(prev => prev + 1);
          setActiveTab('GENERAL');
        }} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Leads" value={prospects.length.toString()} sub="Omnicanal" icon={<Users className="text-blue-400" />} />
              <StatCard title="Tasa Conversión" value="0%" sub="Sin datos" icon={<TrendingUp className="text-green-400" />} />
              <StatCard title="Interacciones" value="0" sub="Sin actividad" icon={<MessageSquare className="text-purple-400" />} />
              <StatCard title="Tiempo Cierre" value="0d" sub="Sin cierres" icon={<Target className="text-orange-400" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass rounded-[2rem] p-8 border border-white/5 flex flex-col min-h-[400px]">
                  <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-sm opacity-70">Funnel de Ventas</h3>
                  <div className="flex-1 w-full">
                      <FunnelChart data={funnelData} />
                  </div>
              </div>

              <div className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-sm opacity-70">Sentimiento Leads</h3>
                  <div className="space-y-6 flex-1 flex flex-col justify-center">
                      {sentimentData.map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                              <div className="flex items-center gap-4">
                                  <span className="text-2xl">{s.icon}</span>
                                  <div>
                                      <p className={`font-bold ${s.color}`}>{s.sentiment}</p>
                                      <p className="text-xs text-gray-500">{s.count} prospectos</p>
                                  </div>
                              </div>
                              <div className="text-xl font-mono font-bold">
                                  {prospects.length > 0 ? Math.round((s.count / prospects.length) * 100) : 0}%
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="glass rounded-[2rem] p-8 border border-white/5 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm opacity-70">Prospectos Recientes</h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar lead..." 
                        className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all w-64"
                    />
                </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="border-b border-white/10 text-xs font-mono text-gray-500 uppercase">
                          <th className="pb-4 font-medium pl-4">Lead</th>
                          <th className="pb-4 font-medium">Estado</th>
                          <th className="pb-4 font-medium">Agente</th>
                          <th className="pb-4 font-medium">Seguimiento</th>
                          <th className="pb-4 font-medium">Origen</th>
                          <th className="pb-4 font-medium text-right pr-4">Creado</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                      {prospects.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-20 text-center text-gray-500 font-mono text-xs uppercase tracking-widest opacity-50">
                            No se encontraron prospectos activos
                          </td>
                        </tr>
                      ) : prospects.map((lead, i) => {
                          const completedTasks = lead.tasks?.filter((t: any) => t.isCompleted).length || 0;
                          const totalTasks = lead.tasks?.length || 0;

                          return (
                          <tr 
                            key={i} 
                            onClick={() => setSelectedProspect(lead)}
                            className={`group hover:bg-white/5 transition-all text-sm cursor-pointer ${selectedProspect?.id === lead.id ? 'bg-white/5' : ''}`}
                          >
                              <td className="py-4 pl-4 font-medium flex flex-col">
                                  <span>{lead.firstName} {lead.lastName}</span>
                                  <span className="text-[10px] text-gray-500 font-mono">{lead.email || lead.phone}</span>
                              </td>
                              <td className="py-4">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    lead.status === 'CLOSED_WON' ? 'bg-green-500/10 text-green-400' :
                                    lead.status === 'CLOSED_LOST' ? 'bg-red-500/10 text-red-400' :
                                    'bg-blue-500/10 text-blue-400'
                                  }`}>
                                      {lead.status}
                                  </span>
                              </td>
                              <td className="py-4">
                                  <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-[var(--color-neon-blue)]/20 flex items-center justify-center text-[10px] text-[var(--color-neon-blue)] font-bold">
                                          {lead.assignedAgent?.firstName?.charAt(0) || "A"}
                                      </div>
                                      <span className="text-xs text-gray-300">{lead.assignedAgent?.firstName || "Sin asignar"}</span>
                                  </div>
                              </td>
                              <td className="py-4">
                                  <div className="flex items-center gap-2">
                                      <div className="flex -space-x-1">
                                          {lead.tasks?.slice(0, 3).map((t: any, idx: number) => (
                                              <div key={idx} className={`w-3 h-3 rounded-full border border-black ${t.isCompleted ? 'bg-green-500' : 'bg-gray-600'}`} />
                                          ))}
                                      </div>
                                      <span className="text-[10px] text-gray-500 font-mono">
                                          {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : "Sin tareas"}
                                      </span>
                                  </div>
                              </td>
                              <td className="py-4 text-gray-400 text-xs font-mono lowercase">{lead.source}</td>
                              <td className="py-4 text-right pr-4 text-gray-500 text-xs font-mono">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </td>
                          </tr>
                          );
                      })}
                  </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedProspect && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[190] animate-in fade-in duration-300"
            onClick={() => setSelectedProspect(null)}
          />
          <ProspectTaskSidebar 
            prospect={currentSelected || selectedProspect} 
            onClose={() => setSelectedProspect(null)}
            onRefresh={fetchCrmData}
          />
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, sub, icon }: any) {
    return (
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--color-neon-cyan)]/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
                <TrendingUp size={16} className="text-gray-600" />
            </div>
            <p className="text-xs text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{sub}</p>
        </div>
    );
}
