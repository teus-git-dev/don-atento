"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, Save, Building, MapPin, Layers, FileText, 
  ImageIcon, Plus, Clock, Loader2, Upload, ChevronRight, 
  ChevronLeft, CheckCircle2, DollarSign, User as UserIcon, 
  Briefcase, Info, Zap
} from "lucide-react";
import { TENANT_ID, API_URL } from "@/lib/config";
import { apiClient } from "@/lib/apiClient";
import { authService } from "@/services/authService";

const STEPS = [
  { id: 1, name: "Datos del Inmueble", icon: Building },
  { id: 2, name: "Ubicación", icon: MapPin },
  { id: 3, name: "Especificaciones", icon: Layers },
  { id: 4, name: "Propietario", icon: UserIcon },
  { id: 5, name: "Arrendatario", icon: Briefcase }, // Only if RENTED
  { id: 6, name: "Financiero & Multimedia", icon: DollarSign },
];

export default function EditarInmueblePage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Refs for file inputs
  const multimediaRef = useRef<HTMLInputElement>(null);
  const legalRef = useRef<HTMLInputElement>(null);
  
  // Property Info
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("APARTMENT");
  const [address, setAddress] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [propertyCode, setPropertyCode] = useState("");
  
  // Financial & Management
  const [rentAmount, setRentAmount] = useState<number>(0);
  const [adminAmount, setAdminAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [managementName, setManagementName] = useState("");
  const [managementNit, setManagementNit] = useState("");

  const [splatUrl, setSplatUrl] = useState("");
  
  // Owner Info
  const [ownerName, setOwnerName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPersonType, setOwnerPersonType] = useState("NATURAL");
  const [isTaxDeclarant, setIsTaxDeclarant] = useState(false);
  const [regimeType, setRegimeType] = useState("SIMPLIFIED");
  const [applyReteIva, setApplyReteIva] = useState(false);
  const [applyReteFuente, setApplyReteFuente] = useState(false);
  const [applyReteIca, setApplyReteIca] = useState(false);

  
  // Tenant Info (for RENTED status)
  const [tenantName, setTenantName] = useState("");
  const [tenantLastName, setTenantLastName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [tenantContractNumber, setTenantContractNumber] = useState("");
  const [tenantContractType, setTenantContractType] = useState("RESIDENTIAL");

  
  // Specs
  const [areaM2, setAreaM2] = useState<number>(0);
  const [rooms, setRooms] = useState<number>(0);
  const [bathrooms, setBathrooms] = useState<number>(0);

  // Additional Contacts
  const [additionalContacts, setAdditionalContacts] = useState<{name: string, phone: string}[]>([]);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  // Multimedia & Docs
  const [uploadedFiles, setUploadedFiles] = useState<{id: string, name: string, type: 'IMAGE' | 'VIDEO' | 'DOC', status: 'SUCCESS' | 'ERROR'}[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  
  const [coordinates, setCoordinates] = useState({ lat: 4.6097, lng: -74.0817 });
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (address && city) {
        // Georeferencing simulation (matches backend logic)
        const seed = address.length + city.length + department.length;
        setCoordinates({
          lat: 4.6097 + (seed % 100) / 1000,
          lng: -74.0817 + (seed % 100) / 1000
        });
      }
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [address, city, department]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        // Fetch Templates
        try {
            const temps = await apiClient.get<any[]>('/inventory-templates');
            setTemplates(temps || []);
        } catch (e) {
            console.error("Error loading templates", e);
        }

        // Fetch Property
        try {
            const data = await apiClient.get<any>(`/properties/${id}`);
            if (data) {
                setTitle(data.title || "");
            setPropertyType(data.propertyType || "APARTMENT");
            setAddress(data.address || "");
            setCity(data.city || "");
            setDepartment(data.department || "");
            setStatus(data.status || "AVAILABLE");
            setPropertyCode(data.propertyCode || "");
            setAreaM2(data.areaM2 || 0);
            setRooms(data.rooms || 0);
            setBathrooms(data.bathrooms || 0);
            setRentAmount(Number(data.rentAmount) || 0);
            setAdminAmount(Number(data.adminAmount) || 0);
            setTaxAmount(Number(data.taxAmount) || 0);
            setManagementName(data.managementName || "");
            setManagementNit(data.managementNit || "");

            setSplatUrl(data.splatUrl || "");
            setCoordinates({ lat: data.latitude || 4.6097, lng: data.longitude || -74.0817 });
            setSelectedTemplateId(data.inventoryTemplateId || "");
            setUploadedFiles(data.attachments || []);
            
            // Extract relations
            const ownerRel = data.relations?.find((r: any) => r.relationType === 'OWNER');
            if (ownerRel && ownerRel.user) {
                setOwnerName(ownerRel.user.firstName || "");
                setOwnerId(ownerRel.user.governmentId || "");
                setOwnerEmail(ownerRel.user.email || "");
                setOwnerPhone(ownerRel.user.phone || "");
                setOwnerPersonType(ownerRel.user.personType || "NATURAL");
                setIsTaxDeclarant(ownerRel.user.isTaxDeclarant || false);
                setRegimeType(ownerRel.user.regimeType || "SIMPLIFIED");
                setApplyReteIva(ownerRel.user.applyReteIva || false);
                setApplyReteFuente(ownerRel.user.applyReteFuente || false);
                setApplyReteIca(ownerRel.user.applyReteIca || false);

                
                if (ownerRel.user.additionalContacts) {
                    try {
                        setAdditionalContacts(JSON.parse(ownerRel.user.additionalContacts));
                    } catch(e) {}
                }
            }

            const tenantRel = data.relations?.find((r: any) => r.relationType === 'TENANT');
            if (tenantRel && tenantRel.user) {
                setTenantName(tenantRel.user.firstName || "");
                setTenantLastName(tenantRel.user.lastName || "");
                setTenantId(tenantRel.user.governmentId || "");
                setTenantEmail(tenantRel.user.email || "");
                setTenantPhone(tenantRel.user.phone || "");
                setContractStart(tenantRel.startDate ? new Date(tenantRel.startDate).toISOString().split('T')[0] : "");
                setContractEnd(tenantRel.endDate ? new Date(tenantRel.endDate).toISOString().split('T')[0] : "");
                setTenantContractNumber(tenantRel.contractNumber || "");
                setTenantContractType(tenantRel.contractType || "RESIDENTIAL");
            }
            }
        } catch (e) {
            console.error("Error fetching property data", e);
        }

        // Fetch Contracts
        try {
            const fetchedContracts = await apiClient.get<any[]>(`/contracts/property/${id}`);
            setContracts(fetchedContracts || []);
            
            // If there's a processed contract, auto-fill dates
            const processed = fetchedContracts?.find(c => c.status === 'PROCESSED');
            if (processed && processed.extractedData) {
                if (processed.extractedData.contractStart) setContractStart(processed.extractedData.contractStart);
                if (processed.extractedData.contractEnd) setContractEnd(processed.extractedData.contractEnd);
            }
        } catch (e) {
            console.error("Error fetching contracts", e);
        }
    } catch (e) {
        console.error("Error loading property data", e);
    } finally {
        setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO' | 'DOC') => {
    const file = e.target.files?.[0];
    if (file) {
        setIsSaving(true);
        try {
            // 1. Upload file
            const formData = new FormData();
            formData.append('file', file);
            
            // Use native fetch since apiClient doesn't support FormData directly
            const token = authService.getToken();
            const uploadRes = await fetch(`${API_URL}/tickets/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!uploadRes.ok) throw new Error('Error al subir archivo');
            const fileData = await uploadRes.json();
            
            // 2. Add to local state (for images)
            const fileId = Math.random().toString(36).substr(2, 9);
            const newFile = {
                id: fileId,
                name: file.name,
                type,
                status: 'SUCCESS' as const
            };
            setUploadedFiles(prev => [...prev, newFile]);

            // 3. If it's a contract, send to AI Processor
            if (type === 'DOC') {
                const contractRes = await apiClient.post<any>('/contracts/upload', {
                    propertyId: id,
                    fileUrl: fileData.url
                });
                
                // Add to local contracts state as PENDING_AI
                setContracts(prev => [contractRes, ...prev]);
                
                alert("Documento subido. La IA Don Atento está analizando el contrato...");
                
                // Poll for completion after 6 seconds (since our mock takes 5s)
                setTimeout(async () => {
                    const fetchedContracts = await apiClient.get<any[]>(`/contracts/property/${id}`);
                    setContracts(fetchedContracts || []);
                    
                    const processed = fetchedContracts?.find(c => c.id === contractRes.id && c.status === 'PROCESSED');
                    if (processed && processed.extractedData) {
                        if (processed.extractedData.contractStart) setContractStart(processed.extractedData.contractStart);
                        if (processed.extractedData.contractEnd) setContractEnd(processed.extractedData.contractEnd);
                        setTenantContractNumber(`CONTRATO-${Math.floor(Math.random() * 9000) + 1000}`);
                        alert("✨ IA Don Atento: He extraído automáticamente las fechas de inicio y fin del documento. Se han configurado las alarmas inteligentes de vencimiento y el veredicto legal está disponible.");
                    }
                }, 6000);
            }
        } catch (e) {
            console.error(e);
            alert("Error al procesar el documento.");
        } finally {
            setIsSaving(false);
        }
    }
  };

  const handleUpdateProperty = async () => {
    if (!title || !address || !ownerName || !propertyCode) {
        alert("Por favor complete los campos obligatorios (ID, Título, Dirección y Propietario)");
        return;
    }

    setIsSaving(true);
    try {
        const response = await fetch(`${API_URL}/properties/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                propertyType,
                address,
                city,
                department,
                areaM2: Number(areaM2),
                rooms: Number(rooms),
                bathrooms: Number(bathrooms),
                status,
                propertyCode,
                inventoryTemplateId: selectedTemplateId || null,
                rentAmount: Number(rentAmount),
                adminAmount: Number(adminAmount),
                taxAmount: Number(taxAmount),
                managementName,
                managementNit,

                splatUrl,
                attachments: uploadedFiles,
                ownerInfo: {
                    name: ownerName,
                    id: ownerId,
                    email: ownerEmail,
                    phone: ownerPhone,
                    additionalContacts,
                    personType: ownerPersonType,
                    isTaxDeclarant,
                    regimeType,
                    applyReteIva,
                    applyReteFuente,
                    applyReteIca,

                },
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                tenantInfo: status === "RENTED" ? {
                    firstName: tenantName,
                    lastName: tenantLastName,
                    governmentId: tenantId,
                    email: tenantEmail,
                    phone: tenantPhone,
                    contractStart,
                    contractEnd,
                    contractNumber: tenantContractNumber,
                    contractType: tenantContractType,

                } : null
            })
        });

        if (response.ok) {
            router.push("/inmuebles");
        } else {
            alert("Error al actualizar el inmueble");
        }
    } catch (e) {
        alert("Error de conexión al servidor");
    } finally {
        setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 4 && status !== "RENTED") {
      setCurrentStep(6);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const prevStep = () => {
    if (currentStep === 6 && status !== "RENTED") {
      setCurrentStep(4);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 text-gray-400 min-h-[60vh]">
            <Loader2 className="animate-spin text-[var(--color-neon-blue)]" size={40} />
            <p className="font-medium animate-pulse">Sincronizando maestro de inmuebles...</p>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/inmuebles" className="p-2 glass rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Inmueble</h1>
            <p className="text-xs text-gray-400">Paso {currentStep} de 6</p>
          </div>
        </div>
        <div className="flex gap-3">
          {currentStep === 6 && (
            <button 
              onClick={handleUpdateProperty}
              disabled={isSaving}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Actualizar Inmueble
            </button>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8 px-4 py-3 glass rounded-2xl border border-white/5 overflow-x-auto gap-4">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isSkipped = step.id === 5 && status !== "RENTED";
          if (isSkipped) return null;
          return (
            <div key={step.id} className="flex items-center gap-2 min-w-fit">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[var(--color-neon-blue)] text-white' : isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{step.id}</span>}
              </div>
              <span className={`text-[10px] uppercase font-bold hidden md:block ${isActive ? 'text-white' : 'text-gray-500'}`}>{step.name}</span>
              {step.id < 6 && <div className="hidden lg:block w-4 h-[1px] bg-white/10" />}
            </div>
          );
        })}
      </div>

      <div className="min-h-[500px]">
        {currentStep === 1 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-[var(--color-neon-blue)]/10 rounded-xl"><Building className="text-[var(--color-neon-blue)]" size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Datos Básicos</h2><p className="text-sm text-gray-400">Identificación principal del activo</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-[var(--color-neon-cyan)] uppercase tracking-widest">ID de Inmueble / Referencia *</label>
                <input type="text" value={propertyCode} readOnly className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-gray-400 cursor-not-allowed outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Nombre / Título *</label>
                <input type="text" value={title} readOnly className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Tipo</label>
                <select value={propertyType} disabled className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed outline-none opacity-70">
                  <option value="APARTMENT">Apartamento</option>
                  <option value="HOUSE">Casa</option>
                  <option value="BUILDING">Edificio</option>
                  <option value="WAREHOUSE">Bodega</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Estado</label>
                <select value={status} disabled className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed outline-none opacity-70">
                  <option value="AVAILABLE">Disponible</option>
                  <option value="RENTED">Arrendado</option>
                  <option value="UNDER_MAINTENANCE">En Mantenimiento</option>
                </select>
              </div>

              {/* Nueva sección: Gestión Documental */}
              <div className="col-span-1 md:col-span-2 mt-4 pt-8 border-t border-white/5">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="text-[var(--color-neon-blue)]" size={20} /> Gestión Documental
                </h3>
                <p className="text-sm text-gray-400 mb-6">Sube los contratos de arrendamiento o escrituras. La IA analizará el documento y extraerá la información.</p>
                
                {contracts.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {contracts.map((contract) => (
                            <div key={contract.id} className="p-4 rounded-xl border border-white/10 bg-black/20">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <FileText className={contract.status === 'PROCESSED' ? 'text-[var(--color-neon-cyan)]' : 'text-gray-400'} size={20} />
                                        <div>
                                            <p className="text-sm font-bold text-white">Contrato Cargado</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{new Date(contract.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {contract.status === 'PENDING_AI' && (
                                            <span className="flex items-center gap-2 text-[10px] text-[var(--color-neon-blue)] font-bold uppercase tracking-widest animate-pulse bg-[var(--color-neon-blue)]/10 px-3 py-1.5 rounded-lg">
                                                <Loader2 size={12} className="animate-spin" /> IA Analizando
                                            </span>
                                        )}
                                        {contract.status === 'PROCESSED' && (
                                            <span className="flex items-center gap-2 text-[10px] text-green-400 font-bold uppercase tracking-widest bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                                                <CheckCircle2 size={12} /> Analizado
                                            </span>
                                        )}
                                        <a href={contract.fileUrl?.startsWith('http') ? contract.fileUrl : `${API_URL.replace('/api', '')}${contract.fileUrl}`} target="_blank" rel="noreferrer" className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-2">
                                            Ver Documento
                                        </a>
                                    </div>
                                </div>

                                {contract.status === 'PROCESSED' && contract.legalVerdict && (
                                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Veredicto Legal (Ley 820)</p>
                                            <div className="flex items-center gap-2">
                                                {contract.legalVerdict.status === 'COMPLIANT' ? (
                                                    <CheckCircle2 className="text-green-400" size={16} />
                                                ) : (
                                                    <Info className="text-yellow-400" size={16} />
                                                )}
                                                <p className="text-sm text-white font-medium">{contract.legalVerdict.summary}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Fechas Extraídas</p>
                                            <div className="flex items-center gap-4 text-sm text-white font-mono">
                                                <div>
                                                    <span className="text-gray-500 text-[10px]">Inicio: </span>
                                                    {contract.extractedData?.contractStart}
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-[10px]">Fin: </span>
                                                    {contract.extractedData?.contractEnd}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div 
                    onClick={() => legalRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isSaving ? 'border-[var(--color-neon-blue)]/50 bg-[var(--color-neon-blue)]/5' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="animate-spin text-[var(--color-neon-blue)] mb-3" size={36} />
                            <span className="text-sm text-[var(--color-neon-blue)] font-bold animate-pulse">Procesando y analizando...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="text-gray-400 group-hover:text-white mb-3 transition-colors" size={32} />
                            <span className="text-sm font-medium text-white mb-1">Subir Nuevo Contrato (PDF/Imagen)</span>
                            <span className="text-xs text-gray-500">Haz clic aquí o arrastra tu archivo para análisis IA</span>
                            <input type="file" ref={legalRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'DOC')} />
                        </>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-500/10 rounded-xl"><MapPin className="text-red-500" size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Ubicación</h2><p className="text-sm text-gray-400">Localización precisa</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Dirección *</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
                  <input type="text" placeholder="Depto" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
                </div>
              </div>
              <div className="h-64 bg-black/40 rounded-2xl border border-white/10 overflow-hidden relative">
                <iframe width="100%" height="100%" style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(address + ", " + (city || "Colombia"))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}></iframe>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-xl"><Layers className="text-purple-500" size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Especificaciones</h2><p className="text-sm text-gray-400">Detalle físico</p></div>
            </div>
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div className="space-y-1"><label className="text-[10px] uppercase text-gray-500">M²</label><input type="number" value={areaM2} onChange={(e) => setAreaM2(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none" /></div>
              <div className="space-y-1"><label className="text-[10px] uppercase text-gray-500">Hab</label><input type="number" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none" /></div>
              <div className="space-y-1"><label className="text-[10px] uppercase text-gray-500">Baños</label><input type="number" value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white outline-none" /></div>
            </div>
            <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-sm font-medium text-white block">Plantilla de Inventario</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(t => (
                    <div key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTemplateId === t.id ? 'bg-[var(--color-neon-blue)]/10 border-[var(--color-neon-blue)]' : 'bg-white/5 border-white/10'}`}>
                      <h4 className="text-sm font-bold text-white">{t.name}</h4>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-xl"><UserIcon className="text-blue-500" size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Propietario</h2><p className="text-sm text-gray-400">Información fiscal</p></div>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <input type="text" placeholder="Nombre" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" />
              <input type="text" placeholder="Documento" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" />
              <input type="email" placeholder="Email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" />
              <input type="tel" placeholder="WhatsApp" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none" />
            </div>

          </div>
        )}

        {currentStep === 5 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-amber-500/10 rounded-xl"><Briefcase className="text-amber-500" size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Arrendatario</h2><p className="text-sm text-gray-400">Contrato vigente</p></div>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <input type="text" placeholder="Nombres" value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="text" placeholder="Documento" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
            </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                    N° Contrato <Info size={10} className="text-blue-400" />
                  </label>
                  <input 
                    type="text" 
                    value={propertyCode} 
                    readOnly 
                    className="w-full bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-2 text-xs text-blue-300 outline-none cursor-not-allowed font-bold" 
                  />
                  <p className="text-[8px] text-blue-500/60 mt-1 uppercase">Sincronizado con ID de Inmueble</p>
                </div>
                <div className="space-y-1"><label className="text-[10px] uppercase text-gray-500">Inicio</label><input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]" /></div>
              </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-500/10 rounded-xl"><DollarSign className="text-green-500" size={24} /></div>
              <div><h2 className="text-xl font-bold text-white">Financiero & Media</h2><p className="text-sm text-gray-400">Montos y archivos</p></div>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <input type="number" placeholder="Canon" value={rentAmount} onChange={(e) => setRentAmount(Number(e.target.value))} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white font-bold" />
              <input type="number" placeholder="Admon" value={adminAmount} onChange={(e) => setAdminAmount(Number(e.target.value))} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white" />
              <input type="text" placeholder="Splat URL" value={splatUrl} onChange={(e) => setSplatUrl(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-blue-400" />
            </div>
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                <div onClick={() => multimediaRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all">
                    <Upload className="mb-2 text-gray-500" />
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Añadir Archivos</span>
                    <input type="file" ref={multimediaRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'IMAGE')} />
                </div>
                <div className="space-y-2">
                    {uploadedFiles.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white">
                            <span>{f.name}</span>
                            <CheckCircle2 size={12} className="text-green-500" />
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Nav */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5">
        <button onClick={prevStep} disabled={currentStep === 1} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 disabled:opacity-0"><ChevronLeft size={18} /> Anterior</button>
        {currentStep < 6 && <button onClick={nextStep} className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all">Siguiente <ChevronRight size={18} /></button>}
      </div>
    </div>
  );
}
