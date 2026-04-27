import React, { useState, useEffect } from 'react';
import { CheckCircle2, MapPin, Wrench, Camera, Clock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { API_URL } from '@/lib/config';

export default function TechnicianView() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real ID for técnico (incasa@incasa.com)
  const technicianId = 'b1700499-cb05-4407-b4b2-6f44150f47f1'; 

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('don_atento_token_v1');
      const userRaw = localStorage.getItem('don_atento_user_v1');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const realId = user?.id || technicianId;

      const response = await fetch(`${API_URL}/tickets/technician/${realId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Could not fetch jobs");
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Error de conexión con el centro de mando");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishJob = async (id: string, workflowStates: any[]) => {
    const resolvedState = jobs.find(j => j.id === id)?.currentState?.workflow?.states?.find((s: any) => s.name === "Resuelto");
    
    if (!resolvedState) {
        alert("Workflow error: No se encontró el estado 'Resuelto'");
        return;
    }

    try {
        const token = localStorage.getItem('don_atento_token_v1');
        const userRaw = localStorage.getItem('don_atento_user_v1');
        const user = userRaw ? JSON.parse(userRaw) : null;

        const response = await fetch(`${API_URL}/tickets/${id}/status`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: user?.id || technicianId, newStateId: resolvedState.id })
        });
        if (response.ok) {
            setJobs(prev => prev.filter(j => j.id !== id));
        } else {
            const err = await response.json().catch(() => ({}));
            alert("Error: " + (err.message || "No autorizado"));
        }
    } catch (err) {
        console.error("Error finishing job:", err);
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center p-20 opacity-50">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--color-neon-blue)] mb-4" />
            <p className="text-gray-400 font-mono animate-pulse text-[10px] uppercase">Sincronizando tareas...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wrench size={20} className="text-[var(--color-neon-cyan)]" />
            Mis Tareas de Hoy
        </h2>
        <div className="px-3 py-1 bg-green-500/10 rounded-full text-[10px] font-bold text-green-400 border border-green-500/20">
            EN LÍNEA
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
            <AlertCircle size={14} /> {error}
        </div>
      )}

      {jobs.length === 0 && !loading && (
        <div className="glass p-8 rounded-2xl border border-white/5 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-500 opacity-20" />
            <p className="text-gray-400 text-sm font-medium">No hay tareas pendientes en el radar</p>
        </div>
      )}

      {jobs.map((job) => (
        <div key={job.id} className="glass p-5 rounded-2xl border border-white/10 active:scale-95 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-[10px] font-mono text-[var(--color-neon-cyan)]">{job.id.split('-')[0]}</span>
                    <h3 className="text-base font-bold text-white">{job.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin size={12} /> {job.property?.title}
                    </div>
                </div>
                <div className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest ${
                    job.priority === 'URGENT' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                }`}>
                    {job.priority}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                <button className="flex items-center justify-center gap-2 bg-white/5 py-3 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/10 transition-all border border-white/10">
                    <Camera size={16} /> Evidencia
                </button>
                <button 
                  onClick={() => handleFinishJob(job.id, job.currentState?.workflow?.states || [])}
                  className="flex items-center justify-center gap-2 bg-[var(--color-neon-blue)] py-3 rounded-xl text-xs font-bold text-white hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)]"
                >
                    Finalizar <CheckCircle2 size={16} />
                </button>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-[10px] text-gray-500 font-mono italic">
                <span><Clock size={10} className="inline mr-1" /> Iniciado: {new Date(job.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="text-[var(--color-neon-cyan)] cursor-pointer hover:underline">Ver plano 3D <ChevronRight size={10} className="inline" /></span>
            </div>
        </div>
      ))}

      {/* Summary Card */}
      <div className="mt-4 glass p-4 rounded-2xl border border-white/5 bg-black/40">
        <div className="flex gap-4">
            <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">0</div>
                <div className="text-[8px] uppercase text-gray-500 font-bold">Resueltos</div>
            </div>
            <div className="w-px bg-white/5"></div>
            <div className="flex-1 text-center">
                <div className="text-xl font-bold text-[var(--color-neon-cyan)]">{jobs.length}</div>
                <div className="text-[8px] uppercase text-gray-500 font-bold">Pendientes</div>
            </div>
            <div className="w-px bg-white/5"></div>
            <div className="flex-1 text-center">
                <div className="text-xl font-bold text-green-500">0%</div>
                <div className="text-[8px] uppercase text-gray-500 font-bold">Efectividad</div>
            </div>
        </div>
      </div>
    </div>
  );
}
