"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Filter, Phone, Mail, MapPin, Star, MoreVertical, Wrench, Shield, User, Camera, Trash2, X, CheckCircle2 } from "lucide-react";
import { providersService, Provider, ProviderSpecialty, ProviderAdditionalContact, SpecialtyLabels } from "@/services/providersService";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Complex form state
  const [newProvider, setNewProvider] = useState({
    name: "",
    nit: "",
    email: "",
    phone: "",
    address: "",
    specialty: ProviderSpecialty.GENERAL,
    contactName: "",
    contactLastName: "",
    contactId: "",
    contactPhone: "+57 ",
    photoUrl: "",
    legalArl: "",
    legalSst: false,
    legalPolicyNumber: "",
    additionalContacts: [] as Omit<ProviderAdditionalContact, 'id'>[]
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await providersService.getProviders();
      setProviders(data);
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure phone numbers have +57
      const payload = {
        ...newProvider,
        contactPhone: newProvider.contactPhone.trim() === "+57" ? "" : (newProvider.contactPhone.startsWith("+57") ? newProvider.contactPhone : `+57 ${newProvider.contactPhone}`),
        additionalContacts: newProvider.additionalContacts.map(c => ({
          ...c,
          phone: c.phone?.trim() === "+57" ? "" : (c.phone?.startsWith("+57") ? c.phone : `+57 ${c.phone}`)
        }))
      };

      await providersService.createProvider(payload as any);
      setIsFormOpen(false);
      resetForm();
      loadProviders();
    } catch (error) {
      console.error("Error creating provider:", error);
    }
  };

  const resetForm = () => {
    setNewProvider({
      name: "",
      nit: "",
      email: "",
      phone: "",
      address: "",
      specialty: ProviderSpecialty.GENERAL,
      contactName: "",
      contactLastName: "",
      contactId: "",
      contactPhone: "+57 ",
      photoUrl: "",
      legalArl: "",
      legalSst: false,
      legalPolicyNumber: "",
      additionalContacts: []
    });
  };

  const addAdditionalContact = () => {
    setNewProvider({
      ...newProvider,
      additionalContacts: [
        ...newProvider.additionalContacts,
        { firstName: "", lastName: "", governmentId: "", phone: "+57 ", photoUrl: "" }
      ]
    });
  };

  const removeAdditionalContact = (index: number) => {
    const updated = [...newProvider.additionalContacts];
    updated.splice(index, 1);
    setNewProvider({ ...newProvider, additionalContacts: updated });
  };

  const updateAdditionalContact = (index: number, field: string, value: string) => {
    const updated = [...newProvider.additionalContacts];
    (updated[index] as any)[field] = value;
    setNewProvider({ ...newProvider, additionalContacts: updated });
  };

  const simulatePhotoUpload = (contactIndex?: number) => {
    const demoPhotos = [
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop"
    ];
    const randomPhoto = demoPhotos[Math.floor(Math.random() * demoPhotos.length)];

    if (contactIndex === undefined) {
      setNewProvider({ ...newProvider, photoUrl: randomPhoto });
    } else {
      updateAdditionalContact(contactIndex, 'photoUrl', randomPhoto);
    }
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="text-[var(--color-neon-cyan)]" /> Proveedores y Técnicos
          </h1>
          <p className="text-gray-400 mt-1">Red de contratistas y servicios externos de mantenimiento</p>
        </div>
        <div className="flex gap-3">
          <button 
            id="btn-new-provider"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
          >
            {isFormOpen ? <X size={18} /> : <Plus size={18} />}
            {isFormOpen ? "Cancelar" : "Nuevo Proveedor"}
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div id="provider-form" className="glass p-10 rounded-[2.5rem] border border-[var(--color-neon-cyan)]/20 shadow-[0_0_50px_rgba(0,255,255,0.05)] animate-in slide-in-from-top duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-neon-cyan)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10"></div>
          
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <Wrench className="text-[var(--color-neon-cyan)]" /> Registro Profesional de Proveedor
          </h3>
          
          <form onSubmit={handleCreate} className="space-y-10">
            {/* Section 1: Business Info */}
            <div className="space-y-6">
              <h4 className="text-xs font-mono uppercase text-[var(--color-neon-cyan)] tracking-[0.2em] border-b border-white/10 pb-2">1. Información de la Empresa</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Nombre Comercial / Razón Social</label>
                  <input id="prov-name" type="text" required value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" placeholder="Ej. Plomería Express SAS" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">NIT / ID Fiscal</label>
                  <input id="prov-nit" type="text" value={newProvider.nit} onChange={e => setNewProvider({...newProvider, nit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all font-mono" placeholder="900.XXX.XXX-X" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Especialidad</label>
                  <select value={newProvider.specialty} onChange={e => setNewProvider({...newProvider, specialty: e.target.value as ProviderSpecialty})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 appearance-none">
                    {Object.values(ProviderSpecialty).map(s => <option key={s} value={s} className="bg-[#0a0f1e] text-white">{SpecialtyLabels[s] || s}</option>)}
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-4">
                  <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Dirección Física</label>
                  <input id="prov-address" type="text" value={newProvider.address} onChange={e => setNewProvider({...newProvider, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" placeholder="Calle, Carrera, Ciudad..." />
                </div>
              </div>
            </div>

            {/* Section 2: Main Contact */}
            <div className="space-y-6">
              <h4 className="text-xs font-mono uppercase text-[var(--color-neon-cyan)] tracking-[0.2em] border-b border-white/10 pb-2">2. Contacto Principal / Representante</h4>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="space-y-4 flex flex-col items-center">
                   <div id="main-photo-upload" className="w-24 h-24 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => simulatePhotoUpload()}>
                      {newProvider.photoUrl ? (
                        <img src={newProvider.photoUrl} alt="Contact" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-gray-500" />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-bold uppercase">Cambiar</div>
                   </div>
                   <p className="text-[8px] font-mono text-gray-600 uppercase">Foto Perfil</p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Nombre</label>
                    <input id="contact-name" type="text" value={newProvider.contactName} onChange={e => setNewProvider({...newProvider, contactName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Apellido</label>
                    <input id="contact-lastname" type="text" value={newProvider.contactLastName} onChange={e => setNewProvider({...newProvider, contactLastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Cédula</label>
                    <input id="contact-id" type="text" value={newProvider.contactId} onChange={e => setNewProvider({...newProvider, contactId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Teléfono Móvil</label>
                    <input id="contact-phone" type="text" value={newProvider.contactPhone} onChange={e => setNewProvider({...newProvider, contactPhone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all font-mono" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Correo Electrónico</label>
                    <input type="email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Legal Compliance */}
            <div className="space-y-6">
              <h4 className="text-xs font-mono uppercase text-[var(--color-neon-cyan)] tracking-[0.2em] border-b border-white/10 pb-2">3. Cumplimiento Legal y Seguridad</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-white/5 rounded-3xl border border-white/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">ID ARL Vigente</label>
                  <input type="text" value={newProvider.legalArl} onChange={e => setNewProvider({...newProvider, legalArl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" placeholder="Ej. ARL Sura..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-gray-500 pl-1">Número de Póliza</label>
                  <input type="text" value={newProvider.legalPolicyNumber} onChange={e => setNewProvider({...newProvider, legalPolicyNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all" placeholder="Póliza de Responsabilidad Civil..." />
                </div>
                <div className="flex items-center gap-4 h-full pt-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input id="check-sst" type="checkbox" checked={newProvider.legalSst} onChange={e => setNewProvider({...newProvider, legalSst: e.target.checked})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-neon-cyan)]"></div>
                    <span className="ml-3 text-xs font-bold text-gray-400 uppercase">Certificado SST</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Secondary Contacts */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <h4 className="text-xs font-mono uppercase text-[var(--color-neon-cyan)] tracking-[0.2em]">4. Contactos de Equipo Adicionales</h4>
                <button id="btn-add-contact" type="button" onClick={addAdditionalContact} className="text-[10px] font-bold text-[var(--color-neon-cyan)] hover:underline flex items-center gap-1">
                  <Plus size={12} /> AÑADIR CONTACTO
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newProvider.additionalContacts.map((contact, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-3xl p-6 flex gap-4 relative group animate-in zoom-in-95 duration-300">
                    <button type="button" onClick={() => removeAdditionalContact(idx)} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="flex flex-col items-center gap-2">
                       <div id={`contact-photo-${idx}`} className="w-16 h-16 rounded-xl bg-white/10 border border-white/10 overflow-hidden cursor-pointer" onClick={() => simulatePhotoUpload(idx)}>
                          {contact.photoUrl ? <img src={contact.photoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-600" />}
                       </div>
                       <span className="text-[8px] font-mono text-gray-600 uppercase">Foto</span>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase text-gray-500">Nombre</label>
                          <input type="text" placeholder="Nombre" value={contact.firstName} onChange={e => updateAdditionalContact(idx, 'firstName', e.target.value)} className="w-full bg-black/20 border-b border-white/10 text-xs px-2 py-1 focus:outline-none focus:border-[var(--color-neon-cyan)] text-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase text-gray-500">Apellido</label>
                          <input type="text" placeholder="Apellido" value={contact.lastName} onChange={e => updateAdditionalContact(idx, 'lastName', e.target.value)} className="w-full bg-black/20 border-b border-white/10 text-xs px-2 py-1 focus:outline-none focus:border-[var(--color-neon-cyan)] text-white" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase text-gray-500">Télefono (+57)</label>
                          <input id={`contact-phone-${idx}`} type="text" placeholder="+57 ..." value={contact.phone} onChange={e => updateAdditionalContact(idx, 'phone', e.target.value)} className="w-full bg-black/20 border-b border-white/10 text-xs px-2 py-1 focus:outline-none focus:border-[var(--color-neon-cyan)] text-white font-mono" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-mono uppercase text-gray-500">Cédula</label>
                          <input type="text" placeholder="Documento" value={contact.governmentId} onChange={e => updateAdditionalContact(idx, 'governmentId', e.target.value)} className="w-full bg-black/20 border-b border-white/10 text-[10px] px-2 py-1 focus:outline-none focus:border-[var(--color-neon-cyan)] text-white font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-white/10">
              <button id="btn-save-provider" type="submit" className="w-full py-4 bg-[var(--color-neon-cyan)] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--color-neon-cyan)]/90 transition-all shadow-[0_10px_30px_rgba(0,255,255,0.2)]">
                Finalizar Registro de Proveedor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary Bar */}
      {!isFormOpen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-500">
           <div className="glass p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase">Activos</p>
                <p className="text-xl font-bold text-white">{providers.filter(p => p.status === 'ACTIVE').length}</p>
              </div>
              <Shield className="text-green-500 opacity-50" />
           </div>
           <div className="glass p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase">Verificados</p>
                <p className="text-xl font-bold text-white">{providers.filter(p => p.legalSst).length}</p>
              </div>
              <Star className="text-yellow-400 opacity-50" />
           </div>
           <div className="glass p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase">Especialidades</p>
                <p className="text-xl font-bold text-white">{new Set(providers.map(p => p.specialty)).size}</p>
              </div>
              <Wrench className="text-blue-500 opacity-50" />
           </div>
           <div className="glass p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase">Total Operarios</p>
                <p className="text-xl font-bold text-white">{providers.reduce((acc, p) => acc + (p.additionalContacts?.length || 0) + 1, 0)}</p>
              </div>
              <User className="text-purple-500 opacity-50" />
           </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[var(--color-neon-cyan)] transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar contratista por nombre o especialidad..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all placeholder:text-gray-600 text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {Object.values(ProviderSpecialty).slice(0, 4).map((cat) => (
            <button key={cat} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400 hover:text-white hover:border-[var(--color-neon-cyan)]/30 transition-all uppercase whitespace-nowrap">
              {SpecialtyLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-neon-cyan)]"></div>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="glass p-20 rounded-[3rem] border border-white/5 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <Users size={64} className="mx-auto text-gray-600 mb-6 opacity-10" />
          <p className="text-xl text-gray-500 font-medium">No se detectaron proveedores asociados</p>
          <button onClick={() => setIsFormOpen(true)} className="mt-4 text-[var(--color-neon-cyan)] hover:underline font-mono text-xs uppercase tracking-widest">Registrar el primero ahora</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredProviders.map((provider) => (
            <div key={provider.id} className="glass p-8 rounded-[3rem] border border-white/5 hover:border-[var(--color-neon-cyan)]/40 transition-all group relative">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                    {provider.photoUrl ? (
                      <img src={provider.photoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="text-[var(--color-neon-cyan)] opacity-50" size={28} />
                    )}
                    {provider.legalSst && (
                      <div className="absolute top-0 right-0 bg-[var(--color-neon-cyan)] p-1 rounded-bl-lg shadow-lg">
                        <CheckCircle2 size={10} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors tracking-tight">{provider.name}</h4>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-[var(--color-neon-cyan)] text-[9px] font-black uppercase tracking-widest border border-white/10">
                      {SpecialtyLabels[provider.specialty] || provider.specialty}
                    </span>
                  </div>
                </div>
                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between group/line">
                  <div className="flex items-center gap-3 text-sm text-gray-400 group-hover/line:text-white transition-colors">
                    <User size={14} className="text-gray-600" />
                    <span>{provider.contactName} {provider.contactLastName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-700 uppercase">Representante</span>
                </div>
                <div className="flex items-center justify-between group/line">
                  <div className="flex items-center gap-3 text-sm text-gray-400 group-hover/line:text-white transition-colors">
                    <Phone size={14} className="text-gray-600" /> 
                    <span className="font-mono">{provider.contactPhone || provider.phone}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-700 uppercase">Contacto</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 italic">
                  <Shield size={14} className="text-gray-700" />
                  <span className="text-[10px] uppercase font-mono">ARL: {provider.legalArl || 'Sin registrar'}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-mono text-gray-600 uppercase mb-3">Equipo Técnico</p>
                   <div className="flex -space-x-4">
                      {/* Main contact photo as first technician if available */}
                      <div className="w-10 h-10 rounded-full border-4 border-[#060b13] bg-white/10 flex items-center justify-center overflow-hidden z-10">
                        {provider.photoUrl ? <img src={provider.photoUrl} className="w-full h-full object-cover" /> : <User size={14} />}
                      </div>
                      {provider.additionalContacts?.map((c, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-[#060b13] bg-white/10 flex items-center justify-center overflow-hidden relative shadow-lg" title={`${c.firstName} ${c.lastName}`} style={{ zIndex: 10 - i }}>
                          {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-gray-400 uppercase">{c.firstName[0]}</span>}
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full border-4 border-[#060b13] bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 z-0">
                        +{(provider.technicians?.length || 0)}
                      </div>
                   </div>
                </div>
                <button className="h-10 px-4 bg-white/5 hover:bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
                  Gestionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
