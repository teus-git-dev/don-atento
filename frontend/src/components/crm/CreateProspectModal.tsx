"use client";

import { useState } from "react";
import { X, User, Phone, Mail, MessageSquare, Save, Loader2 } from "lucide-react";
import { API_URL, TENANT_ID, CURRENT_AGENT_ID } from "@/lib/config";

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
    phone: "",
    source: "WHATSAPP",
    interestedIn: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/crm/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tenantId: TENANT_ID,
          assignedAgentId: CURRENT_AGENT_ID,
          status: 'NEW'
        })
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
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all"
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
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Interés</label>
              <input 
                type="text" 
                value={formData.interestedIn}
                onChange={e => setFormData({...formData, interestedIn: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-all"
                placeholder="Inmueble / Zona"
              />
            </div>
          </div>

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
