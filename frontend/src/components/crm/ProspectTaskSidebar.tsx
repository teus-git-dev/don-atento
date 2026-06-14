"use client";

import { useState } from "react";
import { X, CheckCircle2, Circle, Calendar, Plus, Trash2, Loader2, MessageSquare, Building2, FileText, ArrowRight } from "lucide-react";
import { API_URL } from "@/lib/config";
import ContractFormModal from "./ContractFormModal";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
}

interface ProspectTaskSidebarProps {
  prospect: any;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ProspectTaskSidebar({ prospect, onClose, onRefresh }: ProspectTaskSidebarProps) {
  const [loading, setLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/crm/prospects/${prospect.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          dueDate: newTaskDate ? new Date(newTaskDate).toISOString() : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to add task");
      
      setNewTaskTitle("");
      setNewTaskDate("");
      onRefresh();
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const res = await fetch(`${API_URL}/crm/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      });
      if (res.ok) onRefresh();
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-gray-200 border-l border-gray-200 z-[200] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-[#1F2937] uppercase tracking-tight">Seguimiento Lead</h3>
          <p className="text-xs text-gray-500 font-mono">{prospect.firstName} {prospect.lastName}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-[#1F2937] transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Progress Section */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">Progreso de Conversión</h4>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between items-end mb-2">
               <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Tareas Completadas</span>
               <span className="text-xs font-mono text-[#1F2937]">
                 {prospect.tasks?.filter((t: any) => t.isCompleted).length || 0} / {prospect.tasks?.length || 0}
               </span>
            </div>
            <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-[#1E3A8A] to-[#10B981] transition-all duration-500"
                 style={{ width: `${(prospect.tasks?.length ? (prospect.tasks.filter((t: any) => t.isCompleted).length / prospect.tasks.length) * 100 : 0)}%` }}
               />
            </div>
          </div>
        </div>

        {/* Interested Properties Section */}
        {prospect.interestedProperties && prospect.interestedProperties.length > 0 && (
          <div className="space-y-4 animate-in fade-in duration-500 delay-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00f2ff]">Inmuebles de Interés</h4>
            <div className="grid gap-3">
              {prospect.interestedProperties.map((prop: any) => (
                <div key={prop.id} className="group p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#1F2937] truncate">{prop.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-gray-50 rounded text-[8px] font-mono font-bold text-gray-500 border border-gray-100">
                          {prop.propertyCode || "S/N"}
                        </span>
                        <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest text-[8px]">
                          {prop.propertyType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Próximas Acciones</h4>
          
          <div className="space-y-3">
            {prospect.tasks?.map((task: any) => (
              <div key={task.id} className={`group flex items-start gap-3 p-3 rounded-xl border border-gray-100 transition-all ${task.isCompleted ? 'bg-white/2 opacity-60' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <button 
                  onClick={() => toggleTask(task)}
                  className={`mt-0.5 transition-colors ${task.isCompleted ? 'text-green-400' : 'text-gray-600 hover:text-[#1F2937]'}`}
                >
                  {task.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold leading-tight ${task.isCompleted ? 'text-gray-500 line-through' : 'text-[#1F2937]'}`}>{task.title}</p>
                  {task.dueDate && (
                    <p className="text-[9px] text-gray-500 mt-1 flex items-center gap-1 font-mono uppercase">
                      <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {(!prospect.tasks || prospect.tasks.length === 0) && (
              <div className="py-10 text-center opacity-40">
                <MessageSquare size={24} className="mx-auto mb-2" />
                <p className="text-[10px] uppercase font-mono tracking-widest">No hay tareas pendientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contract Action Button */}
      {prospect.status !== 'CLOSED_WON' && (
        <div className="p-6 border-t border-gray-200 bg-cyan-500/5 group hover:bg-cyan-500/10 transition-all">
          <button 
            onClick={() => setIsContractModalOpen(true)}
            className="w-full flex items-center justify-between gap-3 text-cyan-400 font-bold text-xs uppercase tracking-widest"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <FileText size={18} />
              </div>
              <span>Iniciar Contrato V3</span>
            </div>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* New Task Form */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <form onSubmit={addTask} className="space-y-3">
          <div className="space-y-1">
            <input 
              type="text" 
              placeholder="Nueva tarea (ej: Llamar para visita)"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-[#1F2937] placeholder:text-gray-600 focus:border-[#1E3A8A]/50 focus:outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
             <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 shadow-none" size={14} />
                <input 
                  type="date" 
                  value={newTaskDate}
                  onChange={e => setNewTaskDate(e.target.value)}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onFocus={(e) => (e.target as any).showPicker?.()}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-[10px] text-[#1F2937] focus:outline-none focus:border-gray-300"
                />
             </div>
             <button 
               type="submit"
               disabled={loading || !newTaskTitle}
               className="bg-gray-100 hover:bg-gray-200 text-[#1F2937] p-2.5 rounded-xl transition-all disabled:opacity-50"
             >
               {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
             </button>
          </div>
        </form>
      </div>

      <ContractFormModal 
        isOpen={isContractModalOpen} 
        onClose={() => setIsContractModalOpen(false)}
        prospect={prospect}
        onSuccess={() => {
          setIsContractModalOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
