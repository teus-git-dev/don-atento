"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Building, MapPin, Layers, FileText, 
  ImageIcon, Plus, Clock, Loader2, Upload, ChevronRight, 
  ChevronLeft, CheckCircle2, DollarSign, User as UserIcon, 
  Briefcase, Info, Zap, Users, XCircle, Video, Box, X,
  ShieldCheck, AlertCircle
} from "lucide-react";
import { TENANT_ID, API_URL } from "@/lib/config";
import { apiClient } from "@/lib/apiClient";

const STEPS = [
  { id: 1, name: "Carga de Contrato (IA)", icon: FileText },
  { id: 2, name: "Datos del Inmueble", icon: Building },
  { id: 3, name: "Ubicación", icon: MapPin },
  { id: 4, name: "Especificaciones", icon: Layers },
  { id: 5, name: "Propietario", icon: UserIcon },
  { id: 6, name: "Arrendatario", icon: Briefcase },
  { id: 7, name: "Financiero & Multimedia", icon: DollarSign },
];



const COLOMBIAN_GEOGRAPHY: Record<string, string[]> = {
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Antioquia": ["Medellín", "Envigado", "Itagüí", "Bello", "Rionegro", "Apartadó", "Caucasia", "Turbo"],
  "Arauca": ["Arauca", "Tame", "Saravena"],
  "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Puerto Colombia", "Sabanalarga"],
  "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar"],
  "Boyacá": ["Tunja", "Sogamoso", "Duitama", "Chiquinquirá"],
  "Caldas": ["Manizales", "La Dorada", "Riosucio"],
  "Caquetá": ["Florencia", "San Vicente del Caguán"],
  "Casanare": ["Yopal", "Aguazul", "Villanueva"],
  "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
  "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi"],
  "Chocó": ["Quibdó", "Istmina"],
  "Córdoba": ["Montería", "Cereté", "Sahagún", "Lorica", "Montelíbano"],
  "Cundinamarca": ["Bogotá", "Soacha", "Chía", "Zipaquirá", "Facatativá", "Fusagasugá", "Girardot", "Mosquera", "Madrid", "Funza"],
  "Guainía": ["Inírida"],
  "Guaviare": ["San José del Guaviare"],
  "Huila": ["Neiva", "Pitalito", "Garzón"],
  "La Guajira": ["Riohacha", "Maicao", "Uribia"],
  "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
  "Meta": ["Villavicencio", "Acacías", "Granada"],
  "Nariño": ["Pasto", "Ipiales", "Tumaco"],
  "Norte de Santander": ["Cúcuta", "Ocaña", "Villa del Rosario", "Pamplona"],
  "Putumayo": ["Mocoa", "Puerto Asís"],
  "Quindío": ["Armenia", "Calarcá", "Quimbaya"],
  "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
  "San Andrés": ["San Andrés"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja", "San Gil"],
  "Sucre": ["Sincelejo", "Corozal"],
  "Tolima": ["Ibagué", "Espinal", "Melgar"],
  "Valle del Cauca": ["Cali", "Buenaventura", "Palmira", "Tuluá", "Yumbo", "Cartago", "Buga", "Jamundí"],
  "Vaupés": ["Mitú"],
  "Vichada": ["Puerto Carreño"]
};

export default function NuevoInmueblePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Refs for file inputs
  const multimediaRef = useRef<HTMLInputElement>(null);
  const legalRef = useRef<HTMLInputElement>(null);
  const visionVideoRef = useRef<HTMLInputElement>(null);
  
  // Property Info
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("APARTMENT");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [department, setDepartment] = useState("Cundinamarca");
  const [city, setCity] = useState("Bogotá");
  const [status, setStatus] = useState("AVAILABLE");
  const [propertyCode, setPropertyCode] = useState("");
  
  // Financial & Management
  const [rentAmount, setRentAmount] = useState<number>(0);
  const [adminAmount, setAdminAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [managementName, setManagementName] = useState("");
  const [managementNit, setManagementNit] = useState("");
  const [managementEmail, setManagementEmail] = useState("");
  const [managementPhone, setManagementPhone] = useState("");

  const [splatUrl, setSplatUrl] = useState("");
  const [visionVideoUrl, setVisionVideoUrl] = useState("");
  const [isVisionProcessing, setIsVisionProcessing] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<any>(null);
  
  // Owner Info
  const [ownerName, setOwnerName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("+57");
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
  const [tenantPhone, setTenantPhone] = useState("+57");

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
  const [uploadedFiles, setUploadedFiles] = useState<{id: string, name: string, type: 'IMAGE' | 'VIDEO' | 'DOC' | 'IMG', status: 'SUCCESS' | 'ERROR'}[]>([]);
  
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 4.6097, lng: -74.0817 }); // Default Bogotá

  // AI Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'decimal',
        minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const parseCurrency = (str: string) => {
    return Number(str.replace(/\D/g, '')) || 0;
  };

  useEffect(() => {
    fetchTemplates();
    fetchWorkflows();
  }, []);

  const fetchTemplates = async () => {
    try {
        const data = await apiClient.get<any[]>('/inventory-templates');
        setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
        console.error("Error fetching templates", e);
    }
  };

  const fetchWorkflows = async () => {
    try {
        const res = await apiClient.get<{ data: unknown[] }>('/workflows?limit=100');
        setWorkflows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
        console.error("Error fetching workflows", e);
    }
  };

  const handleAddContact = () => {
    if (newContact.name || newContact.phone) {
        setAdditionalContacts([...additionalContacts, newContact]);
        setNewContact({ name: "", phone: "" });
    }
  };

  const handleRemoveContact = (index: number) => {
    setAdditionalContacts(additionalContacts.filter((_, i) => i !== index));
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContractFile(file);
    setIsExtracting(true);

    try {
        const response = await fetch(`${API_URL}/cognitive/extract-contract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                tenantId: TENANT_ID
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                setExtractionResult(result);
                // Auto-populate
                const d = result.data;
                setTenantName(d.tenantName);
                setTenantLastName(d.tenantLastName);
                setTenantId(d.tenantId);
                setTenantEmail(d.tenantEmail);
                setTenantPhone(d.tenantPhone);
                setRentAmount(d.rentAmount);
                setAdminAmount(d.adminAmount);
                setContractStart(d.startDate);
                setContractEnd(d.endDate);
                setAddress(d.propertyAddress);
                setManagementName(d.agencyName);
                setManagementNit(d.agencyNit);
                setTenantContractNumber(d.contractNumber);
                setTitle(`Propiedad - ${d.tenantName} ${d.tenantLastName}`);
                setStatus("RENTED");
            } else {
                alert(result.error || "No se pudo extraer información del documento.");
            }
        } else {
            alert("Error en la conexión con el motor de IA.");
        }
    } catch (e) {
        console.error("Extraction error", e);
        alert("Error crítico al procesar el contrato.");
    } finally {
        setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO' | 'DOC' | 'IMG') => {
    const file = e.target.files?.[0];
    if (file) {
        const fileId = Math.random().toString(36).substr(2, 9);
        const newFile = {
            id: fileId,
            name: file.name,
            type,
            status: 'SUCCESS' as const
        };
        setUploadedFiles(prev => [...prev, newFile]);

        // AI Extraction Simulation for Contracts
        if (type === 'DOC' && currentStep === 5) {
            setIsSaving(true); // Reusing as local loading state
            setTimeout(() => {
                // Mocking extraction
                setContractStart("2026-03-01");
                setContractEnd("2027-02-28");
                setTenantContractNumber(`CONTRATO-${Math.floor(Math.random() * 9000) + 1000}`);
                setIsSaving(false);
                alert("✨ IA: He extraído automáticamente las fechas y número de contrato del documento.");
            }, 2500);
        }
    }
  };

  const handleVisionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVisionProcessing(true);
    try {
        // 1. Upload the video file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tenantId', TENANT_ID); // Assuming tenantId is needed for upload

        const uploadRes = await fetch(`${API_URL}/inventory-master/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) {
            throw new Error("Failed to upload video.");
        }
        const data = await uploadRes.json();
        setVisionVideoUrl(data.url); // Save the video URL (/uploads/...)
        
        // 2. Analyze video with AI
        const response = await fetch(`${API_URL}/cognitive/analyze-vision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                fileName: file.name, 
                fileType: file.type,
                videoUrl: data.url // Pass the uploaded video URL for the IA to "see" it
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                setSplatUrl(result.splatUrl);
                setVisionAnalysis(result.analysis);
            } else {
                alert(result.error || "No se pudo procesar la visión AI del video.");
            }
        } else {
            alert("Error en la conexión con el motor de Visión AI.");
        }
    } catch (err) {
        console.error("Vision processing error", err);
        alert("Error de conexión con el motor de Visión AI. Verifique que el servidor esté activo.");
    } finally {
        setIsVisionProcessing(false);
    }
  };

  const handleSaveProperty = async () => {
    if (!title || !address || !ownerName || !propertyCode) {
        alert("Por favor complete los campos obligatorios (ID, Título, Dirección y Propietario)");
        return;
    }

    setIsSaving(true);
    try {
        const payload = {
            title,
            propertyType,
            address,
            city: city || "Bogotá",
            department: department || "Cundinamarca",
            country: "Colombia",
            areaM2: Number(areaM2) || 0,
            rooms: Number(rooms) || 0,
            bathrooms: Number(bathrooms) || 0,
            status,
            propertyCode,
            inventoryTemplateId: selectedTemplateId || null,
            workflowId: selectedWorkflowId || null,
            // Strip currency formatting (35.000.000 -> 35000000)
            rentAmount: parseCurrency(String(rentAmount)),
            adminAmount: parseCurrency(String(adminAmount)),
            taxAmount: parseCurrency(String(taxAmount)),
            managementName,
            managementNit,
            managementEmail,
            managementPhone,
            splatUrl,
            visionVideoUrl,
            visionAnalysis,
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
            attachments: uploadedFiles,
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
        };

        await apiClient.post('/properties', payload);
        router.push("/inmuebles");
    } catch (e: any) {
        // Show the actual server error message for easier debugging
        const msg = e?.message || "Error de conexión al servidor";
        alert(`Error al guardar el inmueble:\n${msg}`);
        console.error("Save property error:", e);
    } finally {
        setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 5 && status !== "RENTED") {
      setCurrentStep(7);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 7));
    }
  };

  const prevStep = () => {
    if (currentStep === 7 && status !== "RENTED") {
      setCurrentStep(5);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8 px-4 py-3 glass rounded-2xl border border-white/5 overflow-x-auto gap-4">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isSkipped = step.id === 6 && status !== "RENTED";

          if (isSkipped) return null;

          return (
            <div key={step.id} className="flex items-center gap-2 min-w-fit">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                ${isActive ? 'bg-[var(--color-neon-blue)] text-white shadow-[0_0_10px_rgba(0,112,243,0.5)]' : 
                  isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'}
              `}>
                {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{step.id}</span>}
              </div>
              <div className="hidden md:flex flex-col">
                <span className={`text-[10px] uppercase font-bold tracking-widest ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {step.name}
                </span>
              </div>
              {step.id < 7 && <div className="hidden lg:block w-8 h-[1px] bg-white/10 mx-2" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-4">
          <Link href="/inmuebles" className="p-2 glass rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Crear Inmueble</h1>
            <p className="text-xs text-gray-400">Paso {currentStep} de 7</p>
          </div>
        </div>
        <div className="flex gap-3">
          {currentStep === 7 && (
            <button 
              onClick={handleSaveProperty}
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-green-500 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Finalizar y Guardar
            </button>
          )}
        </div>
      </div>

      {renderStepIndicator()}

      <div className="min-h-[500px]">
        {/* STEP 1: CONTRACT EXTRACTION */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass rounded-2xl p-10 border border-white/10 flex flex-col items-center text-center space-y-6 bg-gradient-to-b from-white/[0.05] to-transparent">
              <div className="w-20 h-20 rounded-3xl bg-[var(--color-neon-blue)]/20 flex items-center justify-center border border-[var(--color-neon-blue)]/30 shadow-[0_0_30px_rgba(0,112,243,0.2)]">
                <FileText className="text-[var(--color-neon-blue)]" size={40} />
              </div>
              <div className="max-w-md">
                <h2 className="text-3xl font-bold text-white mb-2">Comienza con el Contrato</h2>
                <p className="text-gray-400">Sube el contrato de arrendamiento y nuestra IA extraerá automáticamente los datos del inmueble, inquilino y valores legales.</p>
              </div>

              {!isExtracting && !extractionResult && (
                <label className="w-full max-w-lg h-48 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[var(--color-neon-blue)]/50 hover:bg-white/[0.02] transition-all group">
                   <input type="file" className="hidden" onChange={handleContractUpload} accept=".pdf,.doc,.docx,image/*" />
                   <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
                     <Upload className="text-gray-400 group-hover:text-[var(--color-neon-blue)]" size={32} />
                   </div>
                   <div className="space-y-1">
                     <p className="text-sm font-bold text-white tracking-wide">CLIC PARA CARGAR DOCUMENTO</p>
                     <p className="text-[10px] text-gray-500 uppercase tracking-widest">PDF, DOCX o IMAGEN DISPONIBLE</p>
                   </div>
                </label>
              )}

              {isExtracting && (
                <div className="w-full max-w-lg p-10 rounded-3xl glass border border-[var(--color-neon-blue)]/30 flex flex-col items-center gap-6 animate-pulse">
                   <Loader2 className="text-[var(--color-neon-blue)] animate-spin" size={48} />
                   <div className="space-y-2 text-center">
                     <h3 className="text-lg font-bold text-white tracking-widest uppercase italic">Don Atento Legal-Brain v2.0</h3>
                     <p className="text-xs text-[var(--color-neon-blue)] font-mono animate-pulse">ABOGADO EXPERTO ANALIZANDO LEY 820 Y EXTRAYENDO CONOCIMIENTO...</p>
                   </div>
                   <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-[var(--color-neon-blue)] h-full w-2/3 animate-[shimmer_2s_infinite]"></div>
                   </div>
                </div>
              )}

              {extractionResult && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                   <div className="glass p-6 rounded-2xl border border-green-500/30 bg-green-500/5 space-y-4">
                      <div className="flex items-center gap-2 text-green-400 mb-1">
                        <CheckCircle2 size={24} />
                        <h3 className="font-bold text-lg">Sello de Validación Legal</h3>
                      </div>
                      <p className="text-[9px] font-mono text-green-400/60 uppercase mb-4 tracking-tighter">Validado por: {extractionResult.validation.legalPersona}</p>
                      <div className="space-y-3">
                        {extractionResult.validation.findings.map((f: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs text-gray-300">
                             <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                             {f}
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-gray-500 uppercase mb-2">Advertencia IA:</p>
                        <p className="text-xs text-orange-400/80 italic">{extractionResult.validation.warnings[0]}</p>
                      </div>
                   </div>

                   <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
                      <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Resumen de Extracción</h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                         <div>
                            <p className="text-[10px] text-gray-500 uppercase">Inquilino</p>
                            <p className="text-sm font-bold text-white">{extractionResult.data.tenantName} {extractionResult.data.tenantLastName}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-gray-500 uppercase">Documento</p>
                            <p className="text-sm font-bold text-white">{extractionResult.data.tenantId}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-gray-500 uppercase">Canon Total</p>
                            <p className="text-sm font-bold text-[var(--color-neon-cyan)]">${extractionResult.data.rentAmount.toLocaleString()}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-gray-500 uppercase">Vigencia</p>
                            <p className="text-sm font-bold text-white">12 Meses</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setCurrentStep(2)}
                        className="w-full mt-4 bg-[var(--color-neon-blue)] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.3)]"
                      >
                         CONTINUAR CON DATOS <ChevronRight size={18} />
                      </button>
                   </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
               <button 
                onClick={() => setCurrentStep(2)}
                className="text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
               >
                 Omitir carga y llenar manualmente
               </button>
            </div>
          </div>
        )}

        {/* STEP 2: BASIC INFO */}
        {currentStep === 2 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-[var(--color-neon-blue)]/10 rounded-xl">
                <Building className="text-[var(--color-neon-blue)]" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Datos Básicos</h2>
                <p className="text-sm text-gray-400">Identificación principal del activo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-[var(--color-neon-cyan)] uppercase tracking-widest">ID de Inmueble / Referencia *</label>
                <input 
                    type="text" 
                    placeholder="Ej. REF-846-3 (Obligatorio)" 
                    value={propertyCode || ""}
                    onChange={(e) => setPropertyCode(e.target.value)}
                    className="w-full bg-black/40 border-2 border-[var(--color-neon-blue)]/30 rounded-xl px-4 py-3 text-lg font-bold text-white focus:border-[var(--color-neon-blue)] outline-none transition-all" 
                />
                <p className="text-[10px] text-gray-500 flex items-center gap-1"><Info size={10} /> Este identificador debe ser único para el tenant.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Nombre / Título del Inmueble *</label>
                <input 
                    type="text" 
                    placeholder="Ej. Apto 402 Torre B" 
                    value={title || ""}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Tipo de Propiedad</label>
                <select 
                    value={propertyType || "APARTMENT"}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none"
                >
                  <option value="APARTMENT">Apartamento</option>
                  <option value="HOUSE">Casa</option>
                  <option value="BUILDING">Edificio</option>
                  <option value="WAREHOUSE">Bodega</option>
                  <option value="OFFICE">Oficina</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Estado Inicial</label>
                <select 
                    value={status || "AVAILABLE"}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="RENTED">Arrendado</option>
                  <option value="UNDER_MAINTENANCE">En Mantenimiento</option>
                  <option value="FOR_SALE">En Venta</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION */}
        {currentStep === 3 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <MapPin className="text-red-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Ubicación Geográfica</h2>
                <p className="text-sm text-gray-400">Localización precisa del inmueble</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Dirección Completa *</label>
                    <input 
                        type="text" 
                        placeholder="Ej. Calle 123 #45-67, Edificio Atento..." 
                        value={address || ""}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-cyan)] transition-all outline-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">País</label>
                    <select 
                        value={country || "Colombia"} 
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="Colombia">Colombia</option>
                      <option value="México">México</option>
                      <option value="España">España</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Departamento</label>
                    <select 
                        value={department || ""} 
                        onChange={(e) => {
                            const newDept = e.target.value;
                            setDepartment(newDept);
                            if (COLOMBIAN_GEOGRAPHY[newDept]) {
                                setCity(COLOMBIAN_GEOGRAPHY[newDept][0]);
                            }
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">Seleccione Departamento...</option>
                      {Object.keys(COLOMBIAN_GEOGRAPHY).sort().map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Ciudad</label>
                    <select 
                        value={city || ""} 
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">Seleccione Ciudad...</option>
                      {department && COLOMBIAN_GEOGRAPHY[department]?.map(c => (
                          <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-64 bg-black/40 rounded-2xl border border-white/10 relative overflow-hidden">
                {address ? (
                  <iframe width="100%" height="100%" style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg)' }} loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(address + ", " + (city || "Colombia"))}&t=&z=14&ie=UTF8&iwloc=&output=embed`}></iframe>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[10px] uppercase font-bold tracking-widest">Esperando dirección...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SPECS */}
        {currentStep === 4 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Layers className="text-purple-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Especificaciones & Planta</h2>
                <p className="text-sm text-gray-400">Detalles físicos y selección de plantilla del inventario</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Área (m²)</label>
                <input type="number" value={areaM2 || 0} onChange={(e) => setAreaM2(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Habitaciones</label>
                <input type="number" value={rooms || 0} onChange={(e) => setRooms(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Baños</label>
                <input type="number" value={bathrooms || 0} onChange={(e) => setBathrooms(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white block">Plantilla de Inventario Maestro</label>
                    <select 
                        value={selectedTemplateId || ""} 
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)] outline-none cursor-pointer"
                    >
                        <option value="">Sin Plantilla (Crear desde cero)</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({(t.zones?.reduce((acc: number, z: any) => acc + (z.templateItems?.length || 0), 0) || t.items?.length || 0)} items)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 pt-4">
                    <label className="text-sm font-medium text-white block">Flujo Operativo por Defecto</label>
                    <select 
                        value={selectedWorkflowId || ""} 
                        onChange={(e) => setSelectedWorkflowId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-purple)] outline-none cursor-pointer"
                    >
                        <option value="">Sin Flujo (Asignar manualmente)</option>
                        {workflows.map(w => (
                            <option key={w.id} value={w.id}>
                                {w.name} ({w.steps?.length || 0} etapas)
                            </option>
                        ))}
                    </select>
                </div>
            </div>
          </div>
        )}

        {/* STEP 5: OWNER */}
        {currentStep === 5 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <UserIcon className="text-blue-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Datos del Propietario</h2>
                <p className="text-sm text-gray-400">Información legal y fiscal del titular</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo *</label>
                <input type="text" value={ownerName || ""} onChange={(e) => setOwnerName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Documento / NIT</label>
                <input type="text" value={ownerId || ""} onChange={(e) => setOwnerId(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Correo</label>
                <input type="email" value={ownerEmail || ""} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    value={ownerPhone || ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("+57")) {
                        setOwnerPhone(val);
                      } else if (val === "+5") {
                        setOwnerPhone("+57");
                      } else {
                        setOwnerPhone("+57" + val.replace(/\D/g, ''));
                      }
                    }} 
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-neon-cyan)] outline-none font-mono" 
                  />
                  <Zap size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-neon-cyan)]/50" />
                </div>
              </div>
            </div>



            {/* Additional Contacts */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4 mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} /> Contactos Adicionales
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Nombre de contacto" 
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none"
                />
                <div className="flex gap-2">
                  <input 
                    type="tel" 
                    placeholder="Teléfono" 
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none"
                  />
                  <button 
                    onClick={handleAddContact}
                    className="p-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {additionalContacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-3 pr-1 py-1 text-[10px] text-gray-300">
                    <span>{contact.name}: {contact.phone}</span>
                    <button onClick={() => handleRemoveContact(idx)} className="p-1 hover:text-red-400">
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--color-neon-cyan)] uppercase tracking-wider">Perfil Fiscal</h3>
                <select value={ownerPersonType} onChange={(e) => setOwnerPersonType(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-xs text-white outline-none">
                  <option value="NATURAL">Persona Natural</option>
                  <option value="JURIDICA">Persona Jurídica</option>
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Declarante", val: isTaxDeclarant, set: setIsTaxDeclarant },
                  { label: "ReteIVA", val: applyReteIva, set: setApplyReteIva },
                  { label: "ReteFuente", val: applyReteFuente, set: setApplyReteFuente },
                  { label: "ReteICA", val: applyReteIca, set: setApplyReteIca },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="w-4 h-4 accent-[var(--color-neon-cyan)]" />
                    <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors uppercase font-medium">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Régimen</label>
                  <select value={regimeType} onChange={(e) => setRegimeType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="SIMPLIFIED">Simplificado</option>
                    <option value="COMMON">Común</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: TENANT (Conditional) */}
        {currentStep === 6 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Briefcase className="text-amber-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Información del Arrendatario</h2>
                <p className="text-sm text-gray-400">Datos del ocupante actual y contrato</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase">Nombres</label>
                <input type="text" value={tenantName || ""} onChange={(e) => setTenantName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase">Apellidos</label>
                <input type="text" value={tenantLastName || ""} onChange={(e) => setTenantLastName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase">WhatsApp</label>
                    <input 
                        type="tel" 
                        value={tenantPhone || ""} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith("+57")) {
                            setTenantPhone(val);
                          } else if (val === "+5") {
                            setTenantPhone("+57");
                          } else {
                            setTenantPhone("+57" + val.replace(/\D/g, ''));
                          }
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--color-neon-cyan)] outline-none font-mono" 
                    />
              </div>
            </div>



            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                    N° Contrato <Info size={10} className="text-blue-400" />
                  </label>
                  <input 
                    type="text" 
                    value={propertyCode} 
                    readOnly 
                    className="w-full bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300 outline-none cursor-not-allowed font-bold" 
                    placeholder="Auto-asignado por ID Inmueble"
                  />
                  <p className="text-[8px] text-blue-500/60 mt-1 uppercase">Sincronizado con ID de Inmueble</p>
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Tipo</label>
                  <select value={tenantContractType} onChange={(e) => setTenantContractType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="RESIDENTIAL">Vivienda</option>
                    <option value="COMMERCIAL">Comercial</option>
                  </select>
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Inicio</label>
                  <input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none [color-scheme:dark]" />
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Vencimiento</label>
                  <input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none [color-scheme:dark]" />
              </div>
            </div>


          </div>
        )}

        {/* STEP 7: FINANCIAL & MULTIMEDIA */}
        {currentStep === 7 && (
          <div className="glass rounded-2xl p-8 border border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <DollarSign className="text-green-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Financiero & Multimedia</h2>
                <p className="text-sm text-gray-400">Montos de canon, administración y archivos del inmueble</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Canon de Arrendamiento</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input 
                      type="text" 
                      value={formatCurrency(rentAmount || 0)} 
                      onChange={(e) => setRentAmount(parseCurrency(e.target.value))} 
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white outline-none focus:border-green-500/50 transition-all font-mono text-right" 
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Cuota de Administración</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input 
                    type="text" 
                    value={formatCurrency(adminAmount || 0)} 
                    onChange={(e) => setAdminAmount(parseCurrency(e.target.value))} 
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white outline-none font-mono text-right" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">IVA sobre Canon</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input 
                    type="text" 
                    value={formatCurrency(taxAmount || 0)} 
                    onChange={(e) => setTaxAmount(parseCurrency(e.target.value))} 
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white outline-none font-mono text-right" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={14} className="text-[var(--color-neon-cyan)]" /> Archivos & Media
                  </h3>
                  <div 
                    onClick={() => multimediaRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-[var(--color-neon-blue)]/50 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <Upload className="text-gray-500 mb-2 group-hover:text-[var(--color-neon-blue)] transition-colors" size={24} />
                    <span className="text-xs text-gray-400">Subir fotos o videos</span>
                    <input type="file" ref={multimediaRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, 'IMAGE')} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {uploadedFiles.filter(f => f.type === 'IMAGE' || f.type === 'VIDEO').map(f => (
                        <div key={f.id} className="p-2 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between text-[10px] text-gray-400">
                            <span className="truncate">{f.name}</span>
                            <CheckCircle2 size={12} className="text-green-500" />
                        </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Enlace Gaussian Splat 3D</label>
                  <input type="text" value={splatUrl || ""} onChange={(e) => setSplatUrl(e.target.value)} placeholder="https://..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-blue-400 outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-[var(--color-neon-cyan)]" /> Gaussian Splat 3D & Vision AI
                  </h3>
                  
                    {!splatUrl && !isVisionProcessing ? (
                      <div 
                          onClick={() => visionVideoRef.current?.click()}
                          className="border-2 border-dashed border-[var(--color-neon-cyan)]/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-[var(--color-neon-cyan)]/50 hover:bg-[var(--color-neon-cyan)]/5 transition-all cursor-pointer group"
                      >
                          <Video className="text-[var(--color-neon-cyan)]/50 mb-3 group-hover:scale-110 transition-transform" size={40} />
                          <span className="text-sm text-white font-bold">Cargar Video del Inmueble</span>
                          <p className="text-[10px] text-gray-500 mt-2 max-w-[200px]">La IA procesará el video para crear el modelo 3D y detectar reparaciones necesarias.</p>
                          <input type="file" ref={visionVideoRef} className="hidden" accept="video/*" onChange={handleVisionUpload} />
                      </div>
                    ) : isVisionProcessing ? (
                    <div className="border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-white/5">
                        <Loader2 className="animate-spin text-[var(--color-neon-cyan)] mb-4" size={40} />
                        <span className="text-sm text-white font-bold animate-pulse">PROCESANDO VISION-AI...</span>
                        <p className="text-[10px] text-[var(--color-neon-cyan)] mt-2 font-mono uppercase">Generando Nube de Puntos & Análisis de Daños</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                        <div className="p-4 bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/20 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Box className="text-[var(--color-neon-cyan)]" size={24} />
                                <div>
                                    <p className="text-xs font-bold text-white">Modelo Gaussian Splat 3D Listo</p>
                                    <a href={splatUrl} target="_blank" className="text-[10px] text-[var(--color-neon-cyan)] underline truncate block max-w-[200px]">{splatUrl}</a>
                                </div>
                            </div>
                            <button onClick={() => setSplatUrl("")} className="p-2 hover:bg-white/10 rounded-lg text-gray-500"><X size={16} /></button>
                        </div>

                        {visionAnalysis && (
                            <div className="p-5 bg-black/40 border border-white/10 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-green-500" /> Diagnóstico de Reparaciones
                                    </h4>
                                    <div className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold">Health: {visionAnalysis.overallHealth}%</div>
                                </div>
                                
                                <div className="space-y-3">
                                    {visionAnalysis.repairs.map((repair: any) => (
                                        <div key={repair.id} className="flex gap-3 items-start p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className={`p-1.5 rounded-lg mt-0.5 ${repair.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                <AlertCircle size={12} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-white">{repair.area}</p>
                                                <p className="text-[10px] text-gray-400">{repair.issue}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                    <p className="text-[10px] text-blue-300 italic">" {visionAnalysis.recommendation} "</p>
                                    <p className="text-[8px] text-blue-500 mt-2 text-right">-- {visionAnalysis.expertIdentity}</p>
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 pt-4">
                    <FileText size={14} className="text-[var(--color-neon-cyan)]" /> Documentos Adicionales
                  </h3>
                  <div 
                    onClick={() => legalRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-[var(--color-neon-cyan)]/50 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <Upload className="text-gray-500 mb-2 group-hover:text-[var(--color-neon-cyan)] transition-colors" size={24} />
                    <span className="text-xs text-gray-400">Subir Archivos Adicionales</span>
                    <input type="file" ref={legalRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'DOC')} />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Nombre Administración</label>
                        <input type="text" value={managementName || ""} onChange={(e) => setManagementName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">NIT</label>
                            <input type="text" value={managementNit || ""} onChange={(e) => setManagementNit(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Celular</label>
                            <input type="text" value={managementPhone || ""} onChange={(e) => setManagementPhone(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold">Correo Administración</label>
                        <input type="email" value={managementEmail || ""} onChange={(e) => setManagementEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--color-neon-cyan)] outline-none" />
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-8 border-t border-white/5">
        <button 
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 disabled:opacity-0"
        >
          <ChevronLeft size={18} /> Anterior
        </button>

        <div className="flex gap-4">
          {currentStep < 7 ? (
            <button 
              onClick={nextStep}
              className="bg-white text-black px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Siguiente Paso <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleSaveProperty}
              disabled={isSaving}
              className="bg-[var(--color-neon-blue)] text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,112,243,0.3)] disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
              CREAR PROPIEDAD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
