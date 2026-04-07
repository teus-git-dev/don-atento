"use client";

import { useState, useRef } from "react";
import { X, User, Phone, Mail, MessageSquare, Save, Loader2, Search, Building2, Plus } from "lucide-react";
import { API_URL, TENANT_ID } from "@/lib/config";
import { authService } from "@/services/authService";
import { useEffect } from "react";

interface CreateProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProspectModal({ isOpen, onClose, onSuccess }: CreateProspectModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+57 ",
    source: "WHATSAPP",
    interestedIn: "",
    assignedAgentId: "",
  });
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const user = authService.getCurrentUser();
  const isAdmin = user.role === 'ADMIN_TENANT' || user.role === 'SUPERADMIN';

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchAgents();
    }
  }, [isOpen, isAdmin]);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/users?tenantId=${TENANT_ID}`);
      if (res.ok) {
        const allUsers = await res.json();
        // Filter those who can be agents (AGENT role)
        setAgents(allUsers.filter((u: any) => u.role === 'AGENT' || u.role === 'ADMIN_TENANT'));
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("+57 ")) {
      value = "+57 " + value.replace(/^\+?5?7?\s?/, "");
    }
    setFormData({ ...formData, phone: value });
  };

  const handlePropertySearch = async (val: string) => {
    setPropertySearch(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/properties?tenantId=${TENANT_ID}`);
        if (res.ok) {
          const all = await res.json();
          const filtered = all.filter((p: any) => 
            p.title.toLowerCase().includes(val.toLowerCase()) || 
            (p.propertyCode && p.propertyCode.toLowerCase().includes(val.toLowerCase()))
          );
          setSearchResults(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const addProperty = (prop: any) => {
    if (!selectedProperties.find(p => p.id === prop.id)) {
      setSelectedProperties([...selectedProperties, prop]);
    }
    setPropertySearch("");
    setSearchResults([]);
  };

  const removeProperty = (id: string) => {
    setSelectedProperties(selectedProperties.filter(p => p.id !== id));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate phone prefix +57
      let cleanPhone = formData.phone.trim().replace(/\s+/g, '');
      if (!cleanPhone.startsWith('+57')) {
        alert("El número de teléfono debe comenzar con +57");
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        phone: cleanPhone,
        tenantId: TENANT_ID,
        assignedAgentId: isAdmin ? (formData.assignedAgentId || null) : user.id,
        propertyIds: selectedProperties.map(p => p.id),
        status: 'NEW'
      };

      const response = await fetch(`${API_URL}/crm/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to create prospect");
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating prospect:", err);
      alert("Error al crear el prospecto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-[var(--color-neon-cyan)]" size={20} />
            Nuevo Prospecto (Lead)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Nombre</label>
              <input 
                autoFocus
                type="text" 
                required
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all"
                placeholder="Ej: Camilo"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Apellido</label>
              <input 
                type="text" 
                required
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all"
                placeholder="Ej: Restrepo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all"
                placeholder="camilo@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">WhatsApp / Celular</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all font-mono"
                placeholder="+57 300 000 0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Origen</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <select 
                  value={formData.source}
                  onChange={e => setFormData({...formData, source: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none appearance-none"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="WEB">Sitio Web</option>
                  <option value="REFERRAL">Referido</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Interés General</label>
              <input 
                type="text" 
                value={formData.interestedIn}
                onChange={e => setFormData({...formData, interestedIn: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all"
                placeholder="Ej: Apartamentos zona norte"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Inmuebles Específicos (BD)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                value={propertySearch}
                onChange={e => handlePropertySearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[var(--color-neon-cyan)]/50 focus:outline-none transition-all"
                placeholder="Buscar por Nombre o ID (ej: CC-101)..."
              />
              {isSearching && <Loader2 className="absolute right-3 top-3 animate-spin text-cyan-500" size={16} />}
              
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1c1e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProperty(p)}
                      className="w-full p-3 text-left hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-none transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 size={16} className="text-cyan-400" />
                        <div>
                          <p className="text-xs font-bold text-white leading-none">{p.title}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{p.propertyCode || "Sin Código"}</p>
                        </div>
                      </div>
                      <Plus size={14} className="text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProperties.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-2xl border border-dotted border-white/10">
                {selectedProperties.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-1 bg-[var(--color-neon-cyan)]/10 border border-[var(--color-neon-cyan)]/30 rounded-full group">
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{p.propertyCode || p.title.substring(0, 8)}</span>
                    <button 
                      type="button" 
                      onClick={() => removeProperty(p.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] text-[var(--color-neon-cyan)] uppercase tracking-widest font-black ml-1">Asignar Agente Comercial</label>
              <select 
                value={formData.assignedAgentId}
                onChange={e => setFormData({...formData, assignedAgentId: e.target.value})}
                className="w-full bg-white/5 border border-[var(--color-neon-cyan)]/30 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-cyan)] focus:outline-none appearance-none font-bold"
              >
                <option value="">-- Seleccionar Agente --</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName} ({agent.role === 'ADMIN_TENANT' ? 'Admin' : 'Asesor'})
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-gray-500 italic ml-1">Como administrador, puedes delegar este prospecto a un asesor específico.</p>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 glass py-3 rounded-xl text-xs font-bold text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-[var(--color-neon-cyan)] text-black py-3 rounded-xl text-xs font-black hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Registrar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
