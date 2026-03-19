"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Filter, Phone, Mail, MapPin, Star, MoreVertical, Wrench } from "lucide-react";
import { providersService, Provider, ProviderSpecialty } from "@/services/providersService";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "",
    nit: "",
    email: "",
    phone: "",
    address: "",
    specialty: ProviderSpecialty.GENERAL
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
      await providersService.createProvider(newProvider);
      setIsFormOpen(false);
      setNewProvider({
        name: "",
        nit: "",
        email: "",
        phone: "",
        address: "",
        specialty: ProviderSpecialty.GENERAL
      });
      loadProviders();
    } catch (error) {
      console.error("Error creating provider:", error);
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
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
          >
            <Plus size={16} /> {isFormOpen ? "Cerrar" : "Nuevo Proveedor"}
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="glass p-8 rounded-[2rem] border border-[var(--color-neon-cyan)]/20 shadow-[0_0_30px_rgba(0,255,255,0.05)] animate-in slide-in-from-top duration-500">
          <h3 className="text-xl font-bold text-white mb-6">Registrar Nuevo Proveedor</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-gray-400 pl-1">Nombre Comercial</label>
              <input 
                type="text"
                required
                value={newProvider.name}
                onChange={e => setNewProvider({...newProvider, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all font-medium"
                placeholder="Ej. Plomería Express Sas"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-gray-400 pl-1">NIT / ID Fiscal</label>
              <input 
                type="text"
                value={newProvider.nit}
                onChange={e => setNewProvider({...newProvider, nit: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all font-medium"
                placeholder="900.XXX.XXX-X"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-gray-400 pl-1">Especialidad Principal</label>
              <select 
                value={newProvider.specialty}
                onChange={e => setNewProvider({...newProvider, specialty: e.target.value as ProviderSpecialty})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all font-medium appearance-none"
              >
                {Object.values(ProviderSpecialty).map(s => (
                  <option key={s} value={s} className="bg-[#1a1c24]">{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-gray-400 pl-1">TeléfonoContacto</label>
              <input 
                type="text"
                value={newProvider.phone}
                onChange={e => setNewProvider({...newProvider, phone: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all font-medium"
                placeholder="+57 321..."
              />
            </div>
            <div className="space-y-2 lg:col-span-2 flex items-end">
              <button type="submit" className="w-full h-[50px] bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/5">
                Guardar Proveedor
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o especialidad..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['PLUMBING', 'ELECTRICAL', 'MASONRY'].map((cat) => (
            <button key={cat} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400 hover:text-white transition-all uppercase">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-neon-cyan)]"></div>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="glass p-20 rounded-[2rem] border border-white/5 text-center">
          <Users size={48} className="mx-auto text-gray-600 mb-4 opacity-20" />
          <p className="text-gray-400">No se encontraron proveedores registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div key={provider.id} className="glass p-6 rounded-[2rem] border border-white/5 hover:border-[var(--color-neon-cyan)]/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all"><MoreVertical size={16} /></button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Star className="text-yellow-400 fill-yellow-400" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors">{provider.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] text-[10px] font-bold">
                      {provider.specialty}
                    </span>
                    <span className="text-xs text-gray-500 font-mono italic">Rating {provider.rating?.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Phone size={14} className="text-gray-600" /> <span>{provider.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Mail size={14} className="text-gray-600" /> <span>{provider.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <MapPin size={14} className="text-gray-600" /> <span>{provider.address || 'N/A'}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex -space-x-3 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-[#1a1c24] bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold">
                            T{i}
                        </div>
                    ))}
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-2 ring-[#1a1c24] text-[10px] font-medium text-gray-500">
                        +{provider.technicians?.length || 0}
                    </div>
                </div>
                <button className="text-[10px] font-mono text-[var(--color-neon-cyan)] uppercase tracking-wider hover:underline transition-all">
                  Ver Técnicos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
