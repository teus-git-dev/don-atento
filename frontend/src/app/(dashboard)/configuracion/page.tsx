"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings2, ShieldCheck, BrainCircuit, Database, Webhook, Zap, UserPlus, Fingerprint, Waypoints, Clock, CheckCircle2, ChevronRight, Plus, Trash2, Layers, MessageSquare, CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Link2Off } from "lucide-react";
import { TENANT_ID, API_URL } from "@/lib/config";
import RolesManager from "@/components/configuracion/RolesManager";
import WhatsAppConfigCard from "@/components/configuracion/WhatsAppConfigCard";
import { authService } from "@/services/authService";
import { apiClient } from "@/lib/apiClient";

export default function ConfiguracionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [templates, setTemplates] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", description: "" });
  const [newItems, setNewItems] = useState([{ name: "", category: "LIVING_ROOM", material: "" }]);
  
  const [newFlow, setNewFlow] = useState({ name: "", description: "" });
  const [flowStates, setFlowStates] = useState([
    { name: "Abierto / Triaje", assignedRole: "AGENT", assignedUserId: "", aiInstructions: "Analizar el caso y asignar prioridad.", slaHours: 4, color: "cyan" }
  ]);
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "inventarios") {
        fetchTemplates();
    }
    if (activeTab === "workflows") {
        fetchWorkflows();
        fetchUsers();
    }
  }, [activeTab]);

  const fetchWorkflows = async () => {
    try {
        const res = await apiClient.get<{ data: unknown[] }>('/workflows?limit=100');
        setWorkflows(res.data);
    } catch (e) {
        console.error("Fetch workflows error", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiClient.get<any[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fetch users error", e);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!newFlow.name) {
      setFlowError("El nombre del flujo es obligatorio.");
      return;
    }

    setIsSavingFlow(true);
    setFlowError(null);
    try {
      let flowId = editingFlowId;

      if (editingFlowId) {
        // Update Workflow
        await apiClient.patch(`/workflows/${editingFlowId}`, {
          name: newFlow.name,
          description: newFlow.description
        });

        // Delete old states to recreate them
        await apiClient.delete(`/workflows/${editingFlowId}/states`);
      } else {
        // Create Workflow — tenantId is injected by the server from JWT
        const flow = await apiClient.post<any>('/workflows', {
          name: newFlow.name,
          description: newFlow.description
        });
        flowId = flow.id;
      }

      if (flowId) {
        // Create States
        for (let i = 0; i < flowStates.length; i++) {
          const s = flowStates[i];
          await apiClient.post('/workflows/states', {
            workflowId: flowId,
            name: s.name,
            order: i + 1,
            assignedRole: s.assignedRole,
            assignedUserId: s.assignedUserId || null,
            aiInstructions: s.aiInstructions || "",
            slaHours: s.slaHours,
            color: s.color
          });
        }

        fetchWorkflows();
        setShowWorkflowModal(false);
        setEditingFlowId(null);
        setNewFlow({ name: "", description: "" });
        setFlowStates([{ name: "Abierto / Triaje", assignedRole: "AGENT", assignedUserId: "", aiInstructions: "", slaHours: 4, color: "cyan" }]);
      }
    } catch (e) {
      console.error("Workflow saving error", e);
      setFlowError(e instanceof Error ? e.message : "Error de conexión con el servidor.");
    } finally {
      setIsSavingFlow(false);
    }
  };

  const handleDeleteFlow = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este flujo y todos sus estados?")) return;
    try {
      await apiClient.delete(`/workflows/${id}`);
      fetchWorkflows();
    } catch (e) {
      console.error("Delete flow error", e);
    }
  };

  const handleEditFlow = (flow: any) => {
    setEditingFlowId(flow.id);
    setNewFlow({ name: flow.name, description: flow.description || "" });
    setFlowStates(flow.states.map((s: any) => ({
      name: s.name,
      assignedRole: s.assignedRole || "AGENT",
      assignedUserId: s.assignedUserId || "",
      aiInstructions: s.aiInstructions || "",
      slaHours: s.slaHours || 24,
      color: s.color || "blue"
    })));
    setShowWorkflowModal(true);
  };

  const fetchTemplates = async () => {
    try {
        const response = await fetch(`${API_URL}/inventory-templates?tenantId=${TENANT_ID}`);
        if (response.ok) {
            const data = await response.json();
            setTemplates(data);
        }
    } catch (e) {
        console.error("Fetch error", e);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          name: newTemplate.name,
          description: newTemplate.description,
          items: newItems.filter(item => item.name.trim() !== "")
        })
      });
      if (response.ok) {
        fetchTemplates();
        setShowCreateModal(false);
        setNewTemplate({ name: "", description: "" });
        setNewItems([{ name: "", category: "LIVING_ROOM", material: "" }]);
      }
    } catch (e) {
      console.error("Save error", e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta plantilla?")) return;
    try {
      const response = await fetch(`${API_URL}/inventory-templates/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Control</h1>
          <p className="text-gray-400 mt-1">Configura los parámetros del ecosistema "Don Atento"</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 glass rounded-2xl border border-white/5 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
          <p className="px-3 text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Preferencias</p>
          <TabButton 
            active={activeTab === "general"} 
            onClick={() => setActiveTab("general")} 
            icon={<Settings2 size={18} />} 
            label="General" 
          />
          <TabButton 
            active={activeTab === "ai"} 
            onClick={() => setActiveTab("ai")} 
            icon={<BrainCircuit size={18} className="text-[var(--color-neon-purple)]" />} 
            label="Parámetros C-IA" 
          />
          
          <p className="px-3 text-xs font-mono uppercase tracking-wider text-gray-500 mt-4 mb-2">Personal & Seguridad</p>
          <TabButton 
            active={activeTab === "roles"} 
            onClick={() => setActiveTab("roles")} 
            icon={<ShieldCheck size={18} className="text-[var(--color-neon-cyan)]" />} 
            label="Roles y Permisos" 
          />
          <TabButton 
            active={activeTab === "audit"} 
            onClick={() => setActiveTab("audit")} 
            icon={<Fingerprint size={18} />} 
            label="Auditoría de Logs" 
          />
          
          <p className="px-3 text-xs font-mono uppercase tracking-wider text-gray-500 mt-4 mb-2">Operaciones</p>
          <TabButton 
            active={activeTab === "workflows"} 
            onClick={() => setActiveTab("workflows")} 
            icon={<Waypoints size={18} className="text-[var(--color-neon-blue)]" />} 
            label="Gestión de Flujos" 
          />
          <TabButton 
            active={activeTab === "integrations"} 
            onClick={() => setActiveTab("integrations")} 
            icon={<Webhook size={18} />} 
            label="Webhooks & API" 
          />
          <TabButton 
            active={activeTab === "inventarios"} 
            onClick={() => setActiveTab("inventarios")} 
            icon={<Database size={18} className="text-[var(--color-neon-blue)]" />} 
            label="Plantillas de Inventario" 
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 glass rounded-2xl border border-white/5 overflow-y-auto p-6 md:p-8">
          
          {/* General Settings */}
          {activeTab === "general" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-medium text-white mb-1">Ajustes Generales del Broker</h2>
                <p className="text-sm text-gray-400">Modifica los detalles organizacionales e interfaz del sistema.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white">Identidad Gráfica</h3>
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400 block">Nombre de la Organización</label>
                    <input type="text" placeholder="Mi Organización" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-[var(--color-neon-blue)] focus:outline-none text-white" />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
                      <span className="text-xs text-gray-500">Logo</span>
                    </div>
                    <div className="flex-1 space-y-2">
                       <label className="text-sm text-gray-400 block">Marca de Agua Inteligente</label>
                       <ToggleSwitch isOn={true} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white">Preferencias Regionales</h3>
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400 block">Zona Horaria Base</label>
                    <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-[var(--color-neon-blue)] focus:outline-none text-white">
                      <option>Bogotá (UTC-5)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400 block">Moneda de Facturación IA</label>
                    <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-[var(--color-neon-blue)] focus:outline-none text-white">
                      <option>COP ($)</option>
                      <option>USD ($)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end">
                <button className="bg-[var(--color-neon-blue)] text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,112,243,0.3)]">
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === "ai" && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="border-b border-warning/10 pb-4">
                <h2 className="text-xl font-medium text-white mb-1 flex items-center gap-2">
                  <BrainCircuit className="text-[var(--color-neon-purple)]" size={24} />
                  Parámetros Cognitivos Centrales
                </h2>
                <p className="text-sm text-gray-400">Restricciones y comportamientos del motor orquestador (LLM + Visión).</p>
              </div>

              <div className="space-y-6">
                <div className="bg-[var(--color-neon-purple)]/5 border border-[var(--color-neon-purple)]/20 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                     <h3 className="text-white font-medium mb-1">Negociación Autónoma (WhatsApp)</h3>
                     <p className="text-sm text-gray-400 max-w-md">Permite a "Don Atento" cerrar descuentos pre-aprobados con proveedores sin intervención humana.</p>
                  </div>
                  <ToggleSwitch isOn={true} color="purple" />
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                     <h3 className="text-white font-medium mb-1">Umbral de Confianza Visión IA</h3>
                     <p className="text-sm text-gray-400 max-w-md">Porcentaje de precisión requerido para autocompletar tickets basándose en imágenes.</p>
                  </div>
                  <div className="flex items-center gap-4 w-48">
                    <input type="range" min="50" max="99" defaultValue="85" className="w-full accent-[var(--color-neon-cyan)]" />
                    <span className="text-[var(--color-neon-cyan)] font-mono text-sm">85%</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between opacity-60">
                  <div>
                     <h3 className="text-white font-medium mb-1 flex items-center gap-2">
                       <Database size={16} /> Modelo Fundacional Activo
                     </h3>
                     <p className="text-sm text-gray-400 max-w-md">Versión del clúster LLM conectado a la tubería RAG de documentos legales.</p>
                  </div>
                  <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-gray-300">
                    GPT-4o (Incasa Custom)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Roles Settings */}
          {activeTab === "roles" && (
            <RolesManager />
          )}

          {/* Placeholder for others */}
          {/* Audit Logs */}
          {activeTab === "audit" && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-medium text-white mb-1">Registro de Auditoría Cognitiva</h2>
                <p className="text-sm text-gray-400">Historial inmutable de acciones ejecutadas por la IA y usuarios de alto nivel.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-500 font-mono text-[10px] uppercase tracking-widest border-b border-white/5">
                      <th className="pb-3 pl-2">Evento / Acción</th>
                      <th className="pb-3">Entidad</th>
                      <th className="pb-3">Confianza IA</th>
                      <th className="pb-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-gray-500 font-mono text-xs uppercase tracking-widest opacity-50">
                        No hay eventos de auditoría registrados
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === "integrations" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-medium text-white mb-1">Integraciones & Canales</h2>
                <p className="text-sm text-gray-400">Conecta tu número de WhatsApp Business para recibir y enviar mensajes con el agente cognitivo Don Atento.</p>
              </div>
              <WhatsAppConfigCard />
            </div>
          )}

          {activeTab === "workflows" && (
            <div className="space-y-8 animate-in fade-in duration-300 h-full flex flex-col">
               <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-medium text-white mb-1">Diseñador de Flujos Cognitivos</h2>
                    <p className="text-sm text-gray-400">Configura los estados, responsables y SLAs de tus procesos operativos.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingFlowId(null);
                    setNewFlow({ name: "", description: "" });
                    setFlowStates([{ name: "Abierto / Triaje", assignedRole: "AGENT", assignedUserId: "", aiInstructions: "", slaHours: 4, color: "cyan" }]);
                    setShowWorkflowModal(true);
                  }}
                  className="bg-[var(--color-neon-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)]"
                >
                    <Plus size={16} /> CREAR FLUJO
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 space-y-8">
                {workflows.length > 0 ? (
                  workflows.map((flow: any) => (
                    <div key={flow.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-white">{flow.name}</h3>
                            <p className="text-xs text-gray-500">{flow.description || "Sin descripción."}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleEditFlow(flow)}
                              className="text-[10px] font-bold text-[var(--color-neon-blue)] uppercase tracking-widest hover:underline"
                            >
                              Editar Flujo
                            </button>
                            <button 
                              onClick={() => handleDeleteFlow(flow.id)}
                              className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                            >
                              Eliminar
                            </button>
                            <span className="text-[10px] font-mono text-gray-600 uppercase">ID: {flow.id.split('-')[0]}</span>
                          </div>
                        </div>
                      <div className="space-y-3">
                        {flow.states.map((state: any, idx: number) => (
                          <WorkflowStep 
                            key={state.id}
                            order={idx + 1}
                            name={state.name}
                            role={state.assignedRole}
                            responsible={state.responsible}
                            aiInstructions={state.aiInstructions}
                            sla={`${state.slaHours} Horas`}
                            color={state.color || "blue"}
                            isFirst={idx === 0}
                            isLast={idx === flow.states.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Waypoints size={48} className="mb-4 opacity-20" />
                    <p>No hay flujos personalizados creados.</p>
                  </div>
                )}
              </div>

              {/* Workflow Modal */}
              {showWorkflowModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWorkflowModal(false)}></div>
                  <div className="relative glass-strong w-full max-w-2xl rounded-3xl border border-white/10 p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <div>
                      <h2 className="text-2xl font-bold">{editingFlowId ? "Editar Flujo Operativo" : "Nuevo Flujo Operativo"}</h2>
                      <p className="text-gray-400 text-sm">{editingFlowId ? "Modifica los estados y responsabilidades del proceso." : "Define la secuencia de estados y responsabilidades."}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Nombre del Flujo</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Mantenimiento Crítico" 
                            value={newFlow.name}
                            onChange={(e) => setNewFlow({...newFlow, name: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[var(--color-neon-blue)] outline-none text-white" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Descripción</label>
                          <input 
                            type="text" 
                            placeholder="Breve descripción..." 
                            value={newFlow.description}
                            onChange={(e) => setNewFlow({...newFlow, description: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[var(--color-neon-blue)] outline-none text-white" 
                          />
                        </div>
                      </div>

                      <div className="space-y-4 border-t border-white/5 pt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Etapas del Proceso</h3>
                          <button 
                            onClick={() => setFlowStates([...flowStates, { name: "", assignedRole: "TECHNICIAN", assignedUserId: "", aiInstructions: "", slaHours: 24, color: "blue" }])}
                            className="text-[var(--color-neon-blue)] text-[10px] font-bold uppercase flex items-center gap-1 hover:underline"
                          >
                            <Plus size={12} /> Agregar Estado
                          </button>
                        </div>

                        <div className="space-y-3">
                          {flowStates.map((state, idx) => (
                            <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                              <div className="flex gap-3 items-end">
                                <div className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-[10px] font-mono shrink-0">
                                  0{idx+1}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold">Estado</label>
                                  <input 
                                    type="text" 
                                    placeholder="Nombre del estado" 
                                    value={state.name}
                                    onChange={(e) => {
                                      const updated = [...flowStates];
                                      updated[idx].name = e.target.value;
                                      setFlowStates(updated);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                                  />
                                </div>
                                <div className="w-48 space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold">Responsable</label>
                                  <select 
                                    value={state.assignedUserId || state.assignedRole}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updated = [...flowStates];
                                      const selectedUser = users.find(u => u.id === val);
                                      if (selectedUser) {
                                        updated[idx].assignedUserId = selectedUser.id;
                                        updated[idx].assignedRole = selectedUser.role;
                                      } else {
                                        updated[idx].assignedUserId = "";
                                        updated[idx].assignedRole = val;
                                      }
                                      setFlowStates(updated);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white"
                                  >
                                    <option value="">Seleccione Responsable...</option>
                                    {users.length > 0 && users.map((u: any) => (
                                      <option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.role})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="w-20 space-y-1">
                                  <label className="text-[9px] text-gray-500 uppercase font-bold">SLA (Hrs)</label>
                                  <input 
                                    type="number" 
                                    value={state.slaHours}
                                    onChange={(e) => {
                                      const updated = [...flowStates];
                                      updated[idx].slaHours = parseInt(e.target.value);
                                      setFlowStates(updated);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                                  />
                                </div>
                                <button 
                                  onClick={() => setFlowStates(flowStates.filter((_, i) => i !== idx))}
                                  className="p-2 mb-0.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="flex gap-3 items-center pl-11">
                                <BrainCircuit size={14} className="text-[var(--color-neon-purple)] shrink-0" />
                                <input 
                                  type="text" 
                                  placeholder="¿Qué debe hacer la IA en este estado? (ej: Notificar técnico, validar fotos...)" 
                                  value={state.aiInstructions}
                                  onChange={(e) => {
                                    const updated = [...flowStates];
                                    updated[idx].aiInstructions = e.target.value;
                                    setFlowStates(updated);
                                  }}
                                  className="flex-1 bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] text-gray-400 focus:text-white outline-none italic"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {flowError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <Plus size={14} className="rotate-45" /> {flowError}
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        disabled={isSavingFlow}
                        onClick={() => setShowWorkflowModal(false)}
                        className="flex-1 px-6 py-3 rounded-2xl border border-white/10 text-sm font-medium text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={isSavingFlow}
                        onClick={handleSaveWorkflow}
                        className="flex-1 px-6 py-3 rounded-2xl bg-[var(--color-neon-blue)] text-white text-sm font-medium hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.4)] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSavingFlow ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          editingFlowId ? "Guardar Cambios" : "Crear Flujo Completo"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inventory Templates */}
          {activeTab === "inventarios" && (
            <div className="space-y-8 animate-in fade-in duration-300 h-full flex flex-col">
               <div className="border-b border-white/10 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-medium text-white mb-1">Maestro de Plantillas de Inventario</h2>
                    <p className="text-sm text-gray-400">Define la estructura base para la Ficha Técnica de tus inmuebles.</p>
                </div>
                <button 
                    onClick={() => router.push("/inventory-master?mode=template")}
                    className="bg-[var(--color-neon-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)]"
                >
                    <Plus size={16} /> CREAR PLANTILLA
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-4 pb-4">
                {templates.length > 0 ? (
                  templates.map((t: any) => (
                    <InventoryTemplateCard 
                      key={t.id}
                      name={t.name}
                      desc={t.description || "Sin descripción proporcionada."}
                      items={t.zones?.reduce((acc: number, z: any) => acc + (z.templateItems?.length || 0), 0) || t.items?.length || 0}
                      lastUsed="Reciente"
                      color={(t.zones?.reduce((acc: number, z: any) => acc + (z.templateItems?.length || 0), 0) || t.items?.length || 0) > 8 ? "purple" : "blue"}
                      onDelete={() => handleDeleteTemplate(t.id)}
                      onEdit={() => router.push(`/inventory-master?mode=template&id=${t.id}`)}
                    />
                  ))
                ) : (
                  <>
                  <div className="col-span-full py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-white/10 flex flex-col items-center gap-4 text-gray-500">
                    <Layers className="w-12 h-12 opacity-20" />
                    <p className="text-sm uppercase tracking-widest font-mono">No hay plantillas base creadas</p>
                  </div>
                  </>
                )}
              </div>

              <div className="glass p-6 rounded-2xl border border-white/5 bg-black/40 mt-auto">
                 {/* ... existing integrity panel ... */}
              </div>

              </div>
            )}
          </div>
        </div>
      </div>
    );
}

// Subcomponents

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
        active 
          ? "bg-white/10 text-white shadow-sm border border-white/10" 
          : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleSwitch({ isOn, color = "blue" }: { isOn: boolean, color?: string }) {
  const [active, setActive] = useState(isOn);
  const bgClass = active ? (color === "purple" ? "bg-[var(--color-neon-purple)] shadow-[0_0_10px_rgba(138,43,226,0.5)]" : "bg-[var(--color-neon-blue)] shadow-[0_0_10px_rgba(0,112,243,0.5)]") : "bg-gray-700";
  const translateClass = active ? "translate-x-5" : "translate-x-1";

  return (
    <button 
      onClick={() => setActive(!active)}
      className={`w-11 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${bgClass}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-300 ${translateClass}`} />
    </button>
  );
}

function RoleCard({ title, desc, users, active, highlight }: any) {
  return (
    <div className={`p-4 rounded-xl border transition-colors cursor-pointer ${
      highlight ? 'border-[var(--color-neon-cyan)]/50 bg-[var(--color-neon-cyan)]/5 shadow-[0_0_15px_rgba(0,255,255,0.05)]' : 'border-white/10 bg-white/5 hover:border-white/20'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-white text-sm">{title}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-md ${active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400'}`}>Activo</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">{desc}</p>
      <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
        <UserPlus size={12} />
        {users} usuarios vinculados
      </div>
    </div>
  );
}

function PermissionRow({ label, active }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
      <span className="text-sm text-gray-300">{label}</span>
      <ToggleSwitch isOn={active} />
    </div>
  );
}

function IntegrationCard({ name, desc, status, icon }: any) {
  return (
    <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-white/5 rounded-xl border border-white/10">{icon}</div>
        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
          status === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-500 border border-white/5'
        }`}>
          {status}
        </span>
      </div>
      <h3 className="text-sm font-bold text-white mb-2">{name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function WorkflowStep({ order, name, role, sla, color, isFirst, isLast, responsible, aiInstructions }: any) {
    const colorClasses: any = {
        cyan: 'border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/5',
        blue: 'border-[var(--color-neon-blue)]/30 bg-[var(--color-neon-blue)]/5',
        purple: 'border-[var(--color-neon-purple)]/30 bg-[var(--color-neon-purple)]/5',
        orange: 'border-orange-500/30 bg-orange-500/5',
        green: 'border-green-500/30 bg-green-500/5',
    };

    const dotClasses: any = {
        cyan: 'bg-[var(--color-neon-cyan)]',
        blue: 'bg-[var(--color-neon-blue)]',
        purple: 'bg-[var(--color-neon-purple)]',
        orange: 'bg-orange-500',
        green: 'bg-green-500',
    };

    return (
        <div className="flex gap-6 relative">
            {!isLast && <div className="absolute left-4 top-10 bottom-0 w-px bg-white/10"></div>}
            
            <div className="shrink-0 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border border-white/10 bg-black flex items-center justify-center text-[10px] font-mono font-bold text-gray-500 z-10`}>
                    0{order}
                </div>
            </div>

            <div className={`flex-1 p-4 rounded-2xl border transition-all hover:bg-white/[0.05] flex items-center justify-between group ${colorClasses[color] || 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-10 rounded-full ${dotClasses[color]}`}></div>
                    <div>
                        <h4 className="text-sm font-bold text-white">{name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-tighter">
                                <UserPlus size={10} /> {responsible ? `${responsible.firstName} ${responsible.lastName}` : role}
                            </span>
                            <span className="text-[10px] text-[var(--color-neon-cyan)] flex items-center gap-1 font-mono">
                                <Clock size={10} /> SLA: {sla}
                            </span>
                        </div>
                        {aiInstructions && (
                            <div className="mt-2 flex items-start gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                                <BrainCircuit size={12} className="text-[var(--color-neon-purple)] mt-0.5" />
                                <p className="text-[9px] text-gray-400 italic leading-tight">{aiInstructions}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><Settings2 size={14} /></button>
                    {!isFirst && !isLast && <button className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>}
                </div>
            </div>
        </div>
    );
}

function InventoryTemplateCard({ name, desc, items, lastUsed, color, onDelete, onEdit }: any) {
    const colorClasses: any = {
        blue: 'border-[var(--color-neon-blue)]/30 group-hover:border-[var(--color-neon-blue)]/60',
        purple: 'border-[var(--color-neon-purple)]/30 group-hover:border-[var(--color-neon-purple)]/60',
        cyan: 'border-[var(--color-neon-cyan)]/30 group-hover:border-[var(--color-neon-cyan)]/60',
    };

    const iconColor: any = {
        blue: 'text-[var(--color-neon-blue)]',
        purple: 'text-[var(--color-neon-purple)]',
        cyan: 'text-[var(--color-neon-cyan)]',
    };

    return (
        <div className={`p-6 rounded-2xl border bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group flex flex-col gap-4 ${colorClasses[color] || 'border-white/10'}`}>
            <div className="flex justify-between items-start">
                <div className={`p-2 bg-white/5 rounded-xl border border-white/10 transition-transform group-hover:scale-110 ${iconColor[color]}`}>
                    <Layers size={20} />
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Items Base</span>
                    <span className="text-lg font-mono font-bold text-white">{items}</span>
                </div>
            </div>
            <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[var(--color-neon-blue)] transition-colors mb-2 uppercase tracking-wide">{name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">{desc}</p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                    <Clock size={12} />
                    USADO {lastUsed.toUpperCase()}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                      className="text-[10px] font-bold text-[var(--color-neon-blue)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                    >
                        Editar
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
