"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

export default function NuevoInmueblePage() {
  const router = useRouter();
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
  
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 4.6097, lng: -74.0817 }); // Default Bogotá
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
        const response = await fetch(`${API_URL}/inventory-templates?tenantId=${TENANT_ID}`);
        if (response.ok) {
            const data = await response.json();
            setTemplates(data);
        }
    } catch (e) {
        console.error("Error fetching templates", e);
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

  const handleSaveProperty = async () => {
    if (!title || !address || !ownerName || !propertyCode) {
        alert("Por favor complete los campos obligatorios (ID, Título, Dirección y Propietario)");
        return;
    }

    setIsSaving(true);
    try {
        const response = await fetch(`${API_URL}/properties`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tenantId: TENANT_ID,
                title,
                propertyType,
                address,
                city: city || "Bogotá",
                department: department || "Cundinamarca",
                country: "Colombia",
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
                    insuranceCompany: tenantInsurance
                } : null
            })
        });

        if (response.ok) {
            router.push("/inmuebles");
        } else {
            alert("Error al guardar el inmueble");
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

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8 px-4 py-3 glass rounded-2xl border border-white/5 overflow-x-auto gap-4">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isSkipped = step.id === 5 && status !== "RENTED";

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
              {step.id < 6 && <div className="hidden lg:block w-8 h-[1px] bg-white/10 mx-2" />}
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
            <p className="text-xs text-gray-400">Paso {currentStep} de 6</p>
          </div>
        </div>
        <div className="flex gap-3">
          {currentStep === 6 && (
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
        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
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
                    value={propertyCode}
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Tipo de Propiedad</label>
                <select 
                    value={propertyType}
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
                    value={status}
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

        {/* STEP 2: LOCATION */}
        {currentStep === 2 && (
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Dirección Completa *</label>
                  <input 
                    type="text" 
                    placeholder="Calle 123 #45-67" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Departamento</label>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none">
                      <option value="">Seleccione...</option>
                      <option value="cundinamarca">Cundinamarca</option>
                      <option value="antioquia">Antioquia</option>
                      <option value="valle">Valle del Cauca</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Ciudad</label>
                    <input type="text" placeholder="Ej. Bogotá" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
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

        {/* STEP 3: SPECS */}
        {currentStep === 3 && (
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
                <input type="number" value={areaM2} onChange={(e) => setAreaM2(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Habitaciones</label>
                <input type="number" value={rooms} onChange={(e) => setRooms(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Baños</label>
                <input type="number" value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none" />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-sm font-medium text-white block mb-4">Plantilla de Inventario Maestro</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTemplateId === t.id ? 'bg-[var(--color-neon-blue)]/10 border-[var(--color-neon-blue)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                      <h4 className="text-sm font-bold text-white mb-1">{t.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase">{t.items?.length || 0} items predefinidos</p>
                    </div>
                  ))}
                  <div 
                    onClick={() => setSelectedTemplateId("")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTemplateId === "" ? 'bg-white/10 border-white/30' : 'bg-transparent border-white/10 text-gray-500'}`}
                  >
                    <h4 className="text-sm font-bold mb-1">Sin Plantilla</h4>
                    <p className="text-[10px] uppercase">Crear inventario desde cero</p>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* STEP 4: OWNER */}
        {currentStep === 4 && (
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
                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Documento / NIT</label>
                <input type="text" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Correo</label>
                <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                <input type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>

            {/* Tax Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[var(--color-neon-cyan)] uppercase tracking-wider">Perfil Fiscal & Bancario</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Régimen</label>
                  <select value={regimeType} onChange={(e) => setRegimeType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none">
                    <option value="SIMPLIFIED">Simplificado</option>
                    <option value="COMMON">Común</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Banco</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Número de Cuenta</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: TENANT (Conditional) */}
        {currentStep === 5 && (
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
                <input type="text" value={tenantName} onChange={(e) => setTenantName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase">Apellidos</label>
                <input type="text" value={tenantLastName} onChange={(e) => setTenantLastName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase">Documento</label>
                <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">N° Contrato</label>
                  <input type="text" value={tenantContractNumber} onChange={(e) => setTenantContractNumber(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Aseguradora</label>
                  <input type="text" value={tenantInsurance} onChange={(e) => setTenantInsurance(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" />
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

            {/* AI DOC UPLOAD INDICATOR */}
            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Zap size={14} className="text-[var(--color-neon-cyan)]" /> Cargar Contrato Escaneado (Análisis IA)
                </label>
                <div 
                    onClick={() => legalRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isSaving ? 'border-blue-500/50 bg-blue-500/5 cursor-wait' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="animate-spin text-[var(--color-neon-blue)] mb-2" size={32} />
                            <span className="text-xs text-blue-400 font-bold animate-pulse">DON ATENTO IA: Extrayendo datos del contrato...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="text-gray-500 mb-2 group-hover:text-white transition-colors" size={24} />
                            <span className="text-xs text-gray-400">Seleccione el PDF del contrato para autocompletar</span>
                        </>
                    )}
                </div>
                <div className="space-y-2 mt-4">
                    {uploadedFiles.filter(f => f.type === 'DOC').map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-gray-300">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-blue-400" />
                                <span>{f.name}</span>
                            </div>
                            <CheckCircle2 size={16} className="text-green-500" />
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* STEP 6: FINANCIAL & MULTIMEDIA */}
        {currentStep === 6 && (
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
                  <input type="number" value={rentAmount} onChange={(e) => setRentAmount(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white outline-none focus:border-green-500/50 transition-all font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Cuota de Administración</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" value={adminAmount} onChange={(e) => setAdminAmount(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-white outline-none font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">IVA sobre Canon</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input type="number" value={taxAmount} onChange={(e) => setTaxAmount(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white outline-none font-mono" />
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
                  <input type="text" value={splatUrl} onChange={(e) => setSplatUrl(e.target.value)} placeholder="https://..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-blue-400 outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-[var(--color-neon-cyan)]" /> Documentos Legales
                  </h3>
                  <div 
                    onClick={() => legalRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-[var(--color-neon-cyan)]/50 hover:bg-white/5 transition-all cursor-pointer group"
                  >
                    <Upload className="text-gray-500 mb-2 group-hover:text-[var(--color-neon-cyan)] transition-colors" size={24} />
                    <span className="text-xs text-gray-400">Subir Contrato / Escritura</span>
                    <input type="file" ref={legalRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'DOC')} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold">Administración del Edificio (Nombre)</label>
                  <input type="text" value={managementName} onChange={(e) => setManagementName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/5">
        <button 
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-0"
        >
          <ChevronLeft size={18} />
          Anterior
        </button>

        {currentStep < 6 ? (
          <button 
            onClick={nextStep}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all group"
          >
            Siguiente
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
