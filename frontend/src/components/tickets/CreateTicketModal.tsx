"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, MapPin, User, Shield, Zap, AlertTriangle, Check, FileCode, Trash2, Loader2 } from "lucide-react";
import { TENANT_ID } from "@/lib/config";
import { apiClient } from "@/lib/apiClient";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [properties, setProperties] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [aiDictamen, setAiDictamen] = useState<{verdict: string, confidence: number} | null>(null);
  const [isValidatingAI, setIsValidatingAI] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [aiPriority, setAiPriority] = useState<{priority: string, reason: string} | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [userHasManuallyChangedPriority, setUserHasManuallyChangedPriority] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setBackendError(null);
    try {
      const [propsRes, wfsRes, techsRes] = await Promise.all([
        apiClient.get<any>(`/properties?tenantId=${TENANT_ID}&limit=1000`).catch(() => []),
        apiClient.get<any>(`/workflows?tenantId=${TENANT_ID}&limit=1000`).catch(() => []),
        apiClient.get<any>(`/users/technicians?tenantId=${TENANT_ID}&limit=1000`).catch(() => []),
      ]);

      const props = Array.isArray(propsRes) ? propsRes : (propsRes?.data || []);
      const wfs = Array.isArray(wfsRes) ? wfsRes : (wfsRes?.data || []);
      const techs = Array.isArray(techsRes) ? techsRes : (techsRes?.data || []);

      if (!Array.isArray(props) || !Array.isArray(wfs) || !Array.isArray(techs)) {
        setBackendError('Error del servidor: datos inválidos');
        setProperties([]); setWorkflows([]); setTechnicians([]);
      } else {
        setProperties(props); setWorkflows(wfs); setTechnicians(techs);
      }

      // Fetch admin user for reportedByUserId
      const adminData = await apiClient.get<any>(`/users/admin?tenantId=${TENANT_ID}`).catch(() => null);
      setAdminUserId(adminData?.id ?? null);
    } catch (err) {
      console.error("Error fetching modal data", err);
      setBackendError('No se pudo conectar al backend.');
      setProperties([]); setWorkflows([]); setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = Array.isArray(properties) ? properties.filter(p => 
    p.isActive !== false && (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) : [];

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.post(`/tickets`, {
        tenantId: TENANT_ID,
        propertyId: selectedProperty.id,
        reportedByUserId: adminUserId,
        workflowId: selectedWorkflow.id,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        assignedTechnicianId: selectedTechnician?.id,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      alert(`Error al guardar el ticket: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // AI Priority Classification Effect
  useEffect(() => {
    const timer = setTimeout(() => {
        if (formData.title.length > 5 || formData.description.length > 10) {
            classifyPriority();
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.title, formData.description]);

  const classifyPriority = async () => {
    if (userHasManuallyChangedPriority) return;
    setIsClassifying(true);
    try {
        const data = await apiClient.post<{priority: string; reason: string}>(`/cognitive/classify-priority`, {
            title: formData.title,
            description: formData.description,
        });
        setAiPriority(data);
        setFormData(prev => ({ ...prev, priority: data.priority as typeof formData.priority }));
    } catch (err) {
        console.error("Error classifying priority:", err);
    } finally {
        setIsClassifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      // Trigger AI validation for the first file added
      if (newFiles.length > 0) {
        validateWithAI(newFiles[0]);
      }
    }
  };

  const validateWithAI = async (file: File) => {
    setIsValidatingAI(true);
    try {
        const data = await apiClient.post<{verdict: string; confidence: number}>(`/cognitive/validate-evidence`, {
            fileName: file.name,
            fileType: file.type,
            description: formData.description || formData.title,
        });
        setAiDictamen(data);
    } catch (err) {
        console.error("AI Validation error", err);
    } finally {
        setIsValidatingAI(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
        const updated = prev.filter((_, i) => i !== index);
        if (updated.length === 0) setAiDictamen(null);
        return updated;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white shadow-sm border border-gray-200 w-full max-w-4xl rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold">Creación de Ticket Operativo</h2>
            <p className="text-xs text-gray-500">Panel de alta manual con georreferenciación y trazabilidad</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Backend error banner */}
        {backendError && (
          <div className="mx-6 mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-400">Error de conexión</p>
              <p className="text-[11px] text-red-300/80 mt-0.5">{backendError}</p>
            </div>
          </div>
        )}

        <div className="flex h-full flex-col md:flex-row overflow-hidden">
            {/* Left Column: Form Steps */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-gray-100">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">1. Identificar Inmueble (Nombre o ID)</label>
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input 
                                    type="text" 
                                    placeholder="Ej: PRP-001 o Apto 402..." 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-[#1E3A8A]/50 outline-none transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
                                {filteredProperties.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => setSelectedProperty(p)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                            selectedProperty?.id === p.id 
                                            ? 'bg-[#1E3A8A]/10 border-[#1E3A8A]/40' 
                                            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-xs">{p.title}</p>
                                            <p className="text-[10px] text-gray-500">{p.id} - {p.address}</p>
                                        </div>
                                        {selectedProperty?.id === p.id && <div className="text-[#1E3A8A]"><Check size={16} /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedProperty && (
                            <div className="space-y-4 animate-in zoom-in-95 duration-200">
                                {/* Location Breadcrumb */}
                                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <MapPin size={12} className="text-[#10B981]" />
                                    <span>{selectedProperty.country}</span>
                                    <span>/</span>
                                    <span>{selectedProperty.department}</span>
                                    <span>/</span>
                                    <span>{selectedProperty.city}</span>
                                    <span>/</span>
                                    <span className="text-[#1F2937] font-bold">{selectedProperty.zone}</span>
                                </div>

                                {/* Contact Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    {(() => {
                                        const ownerRel = selectedProperty.relations?.find((r: any) => r.relationType === 'OWNER');
                                        const owner = ownerRel?.user;
                                        return (
                                            <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                                                <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">Propietario</p>
                                                <p className="text-xs font-semibold">{owner ? `${owner.firstName} ${owner.lastName || ""}` : "Sin asignar"}</p>
                                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{owner?.phone || "---"}</p>
                                            </div>
                                        );
                                    })()}
                                    {(() => {
                                        const tenantRel = selectedProperty.relations?.find((r: any) => r.relationType === 'TENANT');
                                        const tenant = tenantRel?.user;
                                        return (
                                            <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                                                <p className="text-[9px] text-cyan-400 font-bold uppercase mb-1">Arrendatario</p>
                                                <p className="text-xs font-semibold">{tenant ? `${tenant.firstName} ${tenant.lastName || ""}` : "Sin asignar"}</p>
                                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{tenant?.phone || "---"}</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">2. Detalles de la Falla</label>
                            <input 
                                type="text"
                                placeholder="Título del Ticket (Ej: Daño en el grifo de la cocina)"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:border-[#1E3A8A]/50 outline-none transition-colors mb-3"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                            <textarea 
                                rows={4}
                                placeholder="Descripción detallada de la novedad..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:border-[#1E3A8A]/50 outline-none transition-colors resize-none mb-4"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">3. Prioridad Operativa</label>
                                {isClassifying && (
                                    <div className="flex items-center gap-1.5 text-[9px] text-[#1E3A8A] font-bold animate-pulse">
                                        <Loader2 size={10} className="animate-spin" />
                                        IA ANALIZANDO...
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => {
                                            setFormData({...formData, priority: p as any});
                                            setUserHasManuallyChangedPriority(true);
                                        }}
                                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                            formData.priority === p 
                                            ? p === 'URGENT' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                              p === 'HIGH' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' :
                                              p === 'MEDIUM' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' :
                                              'bg-gray-500/20 border-gray-500/50 text-gray-500'
                                            : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                                        }`}
                                    >
                                        {p === 'URGENT' ? 'URGENTE' : p === 'HIGH' ? 'ALTO' : p === 'MEDIUM' ? 'MEDIO' : 'BAJO'}
                                    </button>
                                ))}
                            </div>

                            {aiPriority && !userHasManuallyChangedPriority && (
                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-6 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield size={12} className="text-blue-400" />
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Sugerencia Don Atento AI</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                        "{aiPriority.reason}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">4. Multimedia (Evidencia)</label>
                            
                            <input 
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <div 
                                        onClick={triggerFileInput}
                                        className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-[#1E3A8A]/40 transition-colors cursor-pointer group bg-gray-50"
                                    >
                                        <Zap size={20} className="text-gray-500 mb-2 group-hover:text-[#1E3A8A] transition-colors" />
                                        <p className="text-[10px] font-medium text-gray-600">Presione para cargar fotos/videos</p>
                                    </div>
                                    <div className="w-40 bg-gray-50 rounded-2xl border border-gray-100 p-3 flex flex-col items-center justify-center relative overflow-hidden">
                                        {isValidatingAI ? (
                                            <Loader2 className="animate-spin text-[#1E3A8A]" size={24} />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center ${aiDictamen ? 'text-[#10B981] shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'text-gray-600'}`}>
                                                <Zap size={24} />
                                            </div>
                                        )}
                                        <p className="text-[9px] mt-2 text-gray-500 uppercase font-bold text-center">
                                            {isValidatingAI ? "Analizando..." : aiDictamen ? "IA Validated" : "Gema-Vision"}
                                        </p>
                                    </div>
                                </div>

                                {aiDictamen && (
                                    <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-3 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-[#10B981]" />
                        <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Atento-Vision Dictum</span>
                      </div>
                      <span className="ml-auto text-[8px] font-mono text-gray-500">CONFIDENCE: {(aiDictamen.confidence * 100).toFixed(0)}%</span>
                                        <p className="text-[11px] text-gray-600 italic leading-relaxed">
                                            "{aiDictamen.verdict}"
                                        </p>
                                    </div>
                                )}

                                {selectedFiles.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center justify-between group">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-500 group-hover:text-[#1E3A8A] transition-colors">
                                                        <FileCode size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-medium text-gray-200 truncate">{file.name}</p>
                                                        <p className="text-[8px] text-gray-500 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => removeFile(idx)}
                                                    className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">4. Flujo de Estados (BPM)</label>
                                <div className="space-y-2">
                                    {workflows.map(wf => (
                                        <button
                                            key={wf.id}
                                            onClick={() => setSelectedWorkflow(wf)}
                                            className={`w-full p-3 rounded-xl border transition-all text-left flex items-center justify-between ${
                                                selectedWorkflow?.id === wf.id 
                                                ? 'bg-[#1E3A8A]/10 border-[#1E3A8A]/40 shadow-[0_0_10px_rgba(0,112,243,0.1)]' 
                                                : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Shield size={16} className={selectedWorkflow?.id === wf.id ? "text-[#1E3A8A]" : "text-gray-500"} />
                                                <p className="font-bold text-[11px]">{wf.name}</p>
                                            </div>
                                            {selectedWorkflow?.id === wf.id && <Check size={14} className="text-[#1E3A8A]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">5. Asignar Especialista</label>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setSelectedTechnician(null)}
                                        className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                                            selectedTechnician === null 
                                            ? 'bg-amber-500/10 border-amber-500/40' 
                                            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-500">
                                            <User size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-[11px]">Sin asignar (Pendiente)</p>
                                            <p className="text-[9px] text-gray-500 font-mono">Asignar después</p>
                                        </div>
                                        {selectedTechnician === null && <Check size={14} className="text-amber-500" />}
                                    </button>

                                    {technicians.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTechnician(t)}
                                            className={`w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3 ${
                                                selectedTechnician?.id === t.id 
                                                ? 'bg-[#10B981]/10 border-[#10B981]/40' 
                                                : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                {t.firstName[0]}{t.lastName[0]}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-[11px]">{t.firstName} {t.lastName}</p>
                                                <p className="text-[9px] text-gray-500 font-mono">{t.phone}</p>
                                            </div>
                                            {selectedTechnician?.id === t.id && <Check size={14} className="text-[#10B981]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column: Visualization / Map */}
            <div className="w-full md:w-80 bg-gray-50 p-6 flex flex-col gap-4 overflow-hidden">
                <div className="h-48 rounded-2xl border border-gray-200 overflow-hidden relative bg-[#090f14] shadow-inner">
                    {selectedProperty ? (
                        <iframe 
                            width="100%" 
                            height="100%" 
                            style={{ border: 0, opacity: 0.6, filter: 'invert(90%) hue-rotate(180deg)' }} 
                            loading="lazy" 
                            allowFullScreen
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedProperty.address + ", " + selectedProperty.city + ", Colombia")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                            <MapPin size={40} className="text-gray-500 mb-2" />
                            <p className="text-[8px] uppercase tracking-tighter">Esperando selección...</p>
                        </div>
                    )}

                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[8px] font-mono text-[#1F2937] border border-gray-200">
                        GPS: {selectedProperty ? `${selectedProperty.latitude?.toFixed(4) || "0"}, ${selectedProperty.longitude?.toFixed(4) || "0"}` : "PENDING..."}
                    </div>
                </div>

                <div className="flex-1 bg-white shadow-sm border border-gray-200 rounded-2xl p-4 border border-gray-100 overflow-y-auto">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Resumen de Alta</h4>
                    <div className="space-y-4">
                        <SummaryItem label="Inmueble" value={selectedProperty?.title || "---"} />
                        <SummaryItem label="Ticket" value={formData.title || "---"} />
                        <SummaryItem label="Archivos" value={selectedFiles.length > 0 ? `${selectedFiles.length} adjunto(s)` : "Ninguno"} />
                        <SummaryItem label="Prioridad" value={formData.priority === 'URGENT' ? '🚨 URGENTE' : formData.priority === 'HIGH' ? '🟠 ALTO' : formData.priority === 'LOW' ? '🟢 BAJO' : '🔵 MEDIO'} />
                        <SummaryItem label="Especialista" value={selectedTechnician ? `${selectedTechnician.firstName} ${selectedTechnician.lastName}` : "Sin asignar (Pendiente)"} />
                        <SummaryItem label="Flujo BPM" value={selectedWorkflow?.name || "---"} />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="text-gray-500 hover:text-[#1F2937] transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>
          
          <button 
            onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
            disabled={
                loading || 
                (step === 1 && !selectedProperty) || 
                (step === 3 && (!formData.title || !selectedWorkflow || !adminUserId))
            }
            className="bg-[#1E3A8A] text-[#1F2937] px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
          >
            {loading ? (
                <>
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                    Sincronizando...
                </>
            ) : step === 3 ? (adminUserId ? 'Finalizar y Crear' : 'Admin no cargado...') : 'Siguiente Paso'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
    return (
        <div>
            <p className="text-[8px] text-gray-500 uppercase font-mono">{label}</p>
            <p className="text-xs font-medium text-gray-200 truncate">{value}</p>
        </div>
    );
}
