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

  const currentUser = authService.getUser();
  const userRole = currentUser?.role ?? "ADMIN_TENANT";
  const tenantId = currentUser?.tenantId;

  useEffect(() => {
    // Only fetch if authenticated AND the user has a tenant (SUPERADMIN without a
    // selected tenant cannot fetch tickets — they have no tenantId context).
    if (authService.isAuthenticated() && tenantId) {
      fetchTasks();
    }
  }, [tenantId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Pass tenantId explicitly so the backend TenantGuard can resolve it
      // even for SUPERADMIN accounts whose JWT has tenantId = null.
      const query = tenantId ? `?tenantId=${tenantId}` : "";
      const data = await apiClient.get<typeof tasks>(`/tickets${query}`);
      if (!Array.isArray(data)) { setTasks([]); return; }
      setTasks(data.filter(t => t.currentState?.assignedRole === userRole || !t.resolvedAt).slice(0, 5));
    } catch (error) {
      console.error("[NotificationCenter] Error fetching tasks:", error);
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
        className="relative p-2 text-gray-500 hover:text-[#1E3A8A] transition-colors rounded-full hover:bg-gray-100"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#10B981] border-2 border-white rounded-full"></span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-4 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tareas por Rol</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md border border-blue-100">{unreadCount} Pendientes</span>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
              {tasks.length === 0 ? (
                <div className="p-10 text-center">
                  <CheckSquare size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-xs text-gray-500">Todo al día</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => handleTaskClick(task.id)}
                    className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-bold text-[#1E3A8A] uppercase bg-[#1E3A8A]/10 px-1.5 py-0.5 rounded">TKT-{task.id.split('-')[0]}</span>
                      <span className="text-[9px] text-gray-500 flex items-center gap-1 font-semibold uppercase">
                        <Clock size={10} /> 2H ANS
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1F2937] group-hover:text-[#1E3A8A] transition-colors line-clamp-1">{task.title}</p>
                    <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-wide font-medium">Estado: {task.currentState?.name}</p>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => handleTaskClick()}
              className="w-full py-3 bg-gray-50 border-t border-gray-100 text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A] hover:bg-gray-100 transition-all"
            >
              Ver Todas las Tareas
            </button>
          </div>
        </>
      )}

      {/* Login / Dynamic Reminder Toast */}
      {showLoginReminder && unreadCount > 0 && (
        <div className="fixed bottom-8 right-8 z-[100] bg-white p-6 rounded-xl border border-gray-200 shadow-2xl max-w-sm animate-in slide-in-from-right-10 duration-500">
          <button 
            onClick={() => setShowLoginReminder(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F2937] uppercase tracking-tight">Recordatorio de Tareas</h4>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Bienvenido. Tienes <span className="text-[#1F2937] font-bold">{unreadCount} tickets</span> pendientes que requieren atención de tu rol.
              </p>
              <button 
                onClick={() => { setShowLoginReminder(false); setIsOpen(true); }}
                className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A] hover:text-blue-700 transition-colors"
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
