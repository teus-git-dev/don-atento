"use client";

import { useState, useEffect } from "react";
import { Bell, Clock, AlertCircle, X, CheckSquare } from "lucide-react";
import { TENANT_ID } from "@/lib/config";
import { apiClient } from "@/lib/apiClient";
import { authService } from "@/services/authService";
import { useRouter } from "next/navigation";

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<{id: string; title: string; currentState?: {name: string; assignedRole?: string}; resolvedAt?: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLoginReminder, setShowLoginReminder] = useState(false);

  const userRole = authService.getUser()?.role ?? "ADMIN_TENANT";

  useEffect(() => {
    if (authService.isAuthenticated()) {
      fetchTasks();
    }
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<typeof tasks>(`/tickets?tenantId=${TENANT_ID}`);
      if (!Array.isArray(data)) { setTasks([]); return; }
      setTasks(data.filter(t => t.currentState?.assignedRole === userRole || !t.resolvedAt).slice(0, 5));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId?: string) => {
    setIsOpen(false);
    router.push("/tickets");
    // Optionally we could pass the taskId via query param to focus it
    // router.push(`/tickets?focus=${taskId}`);
  };

  const unreadCount = tasks.length;

  return (
    <div className="relative">
      {/* Bell Icon Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-neon-cyan)] rounded-full shadow-[0_0_8px_rgba(0,255,255,0.8)]"></span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-4 w-80 glass-strong rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-300">Tareas por Rol</h3>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-lg">{unreadCount} Pendientes</span>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
              {tasks.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckSquare size={32} className="mx-auto text-gray-700 mb-3" />
                  <p className="text-xs text-gray-500">Todo al día</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task.id)}
                    className="p-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-[var(--color-neon-cyan)] uppercase">TKT-{task.id.split('-')[0]}</span>
                      <span className="text-[9px] text-gray-600 flex items-center gap-1 font-mono uppercase">
                        <Clock size={8} /> 2H ANS
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white group-hover:text-[var(--color-neon-blue)] transition-colors line-clamp-1">{task.title}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tight font-medium">Estado: {task.currentState?.name}</p>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => handleTaskClick()}
              className="w-full py-3 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
            >
              Ver Todas las Tareas
            </button>
          </div>
        </>
      )}

      {/* Login / Dynamic Reminder Toast */}
      {showLoginReminder && unreadCount > 0 && (
        <div className="fixed bottom-8 right-8 z-[100] glass p-6 rounded-[2rem] border border-[var(--color-neon-blue)]/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-sm animate-in slide-in-from-right-10 duration-500">
          <button 
            onClick={() => setShowLoginReminder(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/40 flex items-center justify-center text-[var(--color-neon-blue)]">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Recordatorio de Tareas</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Bienvenido. Tienes <span className="text-white font-bold">{unreadCount} tickets</span> pendientes que requieren atención de tu rol.
              </p>
              <button 
                onClick={() => { setShowLoginReminder(false); setIsOpen(true); }}
                className="mt-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-neon-cyan)] hover:text-white transition-colors"
              >
                Revisar ahora →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
