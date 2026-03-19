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
  const [insuranceCompany, setInsuranceCompany] = useState("");
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
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  
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
  const [tenantInsurance, setTenantInsurance] = useState("");
  
  // Specs
  const [areaM2, setAreaM2] = useState<number>(0);
  const [rooms, setRooms] = useState<number>(0);
  const [bathrooms, setBathrooms] = useState<number>(0);

  // Additional Contacts
  const [additionalContacts, setAdditionalContacts] = useState<{name: string, phone: string}[]>([]);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  // Multimedia & Docs
  const [uploadedFiles, setUploadedFiles] = useState<{id: string, name: string, type: 'IMAGE' | 'VIDEO' | 'DOC', status: 'SUCCESS' | 'ERROR'}[]>([]);
  
  const [coordinates, setCoordinates] = useState({ lat: 4.6097, lng: -74.0817 });
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        // Fetch Templates
        const tempRes = await fetch(`${API_URL}/inventory-templates?tenantId=${TENANT_ID}`);
        if (tempRes.ok) {
            const temps = await tempRes.json();
            setTemplates(temps);
        }

        // Fetch Property
        const res = await fetch(`${API_URL}/properties/${id}`);
        if (res.ok) {
            const data = await res.json();
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
            setInsuranceCompany(data.insuranceCompany || "");
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
                setBankName(ownerRel.user.bankName || "");
                setAccountNumber(ownerRel.user.accountNumber || "");
                
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
                setTenantInsurance(tenantRel.insuranceCompany || "");
            }
        }
    } catch (e) {
        console.error("Error loading property data", e);
    } finally {
        setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO' | 'DOC') => {
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
            setIsSaving(true);
            setTimeout(() => {
                setContractStart("2026-03-01");
                setContractEnd("2027-02-28");
                setTenantContractNumber(`CONTRATO-${Math.floor(Math.random() * 9000) + 1000}`);
                setIsSaving(false);
                alert("✨ AI: He extraído automáticamente las fechas y número de contrato del documento.");
            }, 2500);
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
                insuranceCompany,
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
                    bankName,
                    accountNumber
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
                    insuranceCompany: tenantInsurance
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
                <input type="text" value={propertyCode} onChange={(e) => setPropertyCode(e.target.value)} className="w-full bg-black/40 border-2 border-[var(--color-neon-blue)]/30 rounded-xl px-4 py-3 text-lg font-bold text-white focus:border-[var(--color-neon-blue)] outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Nombre / Título *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Tipo</label>
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                  <option value="APARTMENT">Apartamento</option>
                  <option value="HOUSE">Casa</option>
                  <option value="BUILDING">Edificio</option>
                  <option value="WAREHOUSE">Bodega</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
                  <option value="AVAILABLE">Disponible</option>
                  <option value="RENTED">Arrendado</option>
                  <option value="UNDER_MAINTENANCE">En Mantenimiento</option>
                </select>
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
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Declarante", val: isTaxDeclarant, set: setIsTaxDeclarant },
                  { label: "ReteIVA", val: applyReteIva, set: setApplyReteIva },
                  { label: "ReteFuente", val: applyReteFuente, set: setApplyReteFuente },
                  { label: "ReteICA", val: applyReteIca, set: setApplyReteIca },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="w-4 h-4 accent-[var(--color-neon-cyan)]" />
                    <span className="text-[10px] text-gray-400 uppercase">{item.label}</span>
                  </label>
                ))}
              </div>
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
                <div className="space-y-1"><label className="text-[10px] uppercase text-gray-500">N° Contrato</label><input type="text" value={tenantContractNumber} onChange={(e) => setTenantContractNumber(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white" /></div>
                <div className="space-y-1"><label className="text-[10px] uppercase text-gray-500">Inicio</label><input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]" /></div>
            </div>

            {/* AI DOC UPLOAD INDICATOR */}
            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Zap size={14} className="text-[var(--color-neon-cyan)]" /> Analizar Nuevo Contrato (IA)
                </label>
                <div 
                    onClick={() => legalRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isSaving ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:bg-white/5'}`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="animate-spin text-[var(--color-neon-blue)] mb-2" size={32} />
                            <span className="text-xs text-blue-400 font-bold animate-pulse">DON ATENTO IA: Extrayendo datos...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="text-gray-500 mb-2" size={24} />
                            <span className="text-xs text-gray-400">Subir PDF para autocompletar</span>
                            <input type="file" ref={legalRef} className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'DOC')} />
                        </>
                    )}
                </div>
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
