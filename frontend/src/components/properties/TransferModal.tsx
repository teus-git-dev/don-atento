"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Calendar, Loader2 } from "lucide-react";
import { API_URL, TENANT_ID } from "@/lib/config";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
  onSuccess: () => void;
}

export default function TransferModal({ isOpen, onClose, property, onSuccess }: TransferModalProps) {
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    newOwnerId: "",
    newTenantId: "",
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const ownersRes = await fetch(`${API_URL}/users/owners?tenantId=${TENANT_ID}`);
      const techniciansRes = await fetch(`${API_URL}/users?tenantId=${TENANT_ID}`); // Use general list for tenants for now
      
      if (ownersRes.ok) setOwners(await ownersRes.json());
      if (techniciansRes.ok) setTenants(await techniciansRes.json());
    } catch (error) {
      console.error("Error fetching users for transfer:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.newOwnerId) return alert("El propietario es obligatorio");

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/properties/${property.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert("Cesión realizada con éxito");
        onSuccess();
        onClose();
      } else {
        throw new Error("Failed to transfer property");
      }
    } catch (error) {
      console.error("Transfer Error:", error);
      alert("Error al realizar la cesión");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/30">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Realizar Cesión</h2>
              <p className="text-xs text-gray-500 font-mono italic">{property.title} • {property.propertyCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* New Owner */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">Nuevo Propietario</label>
              <select 
                value={formData.newOwnerId}
                onChange={(e) => setFormData({ ...formData, newOwnerId: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-all text-white"
                required
              >
                <option value="">Seleccionar Propietario...</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
                ))}
              </select>
            </div>

            {/* New Tenant (Optional) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">Nuevo Arrendatario (Opcional)</label>
              <select 
                value={formData.newTenantId}
                onChange={(e) => setFormData({ ...formData, newTenantId: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all text-white"
              >
                <option value="">Mantener vacante / Sin cambio</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.role})</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1 flex items-center gap-2">
                <Calendar size={12} /> Fecha de Inicio de Cesión
              </label>
              <input 
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-neon-blue)]/50 outline-none transition-all text-white"
                required
              />
            </div>
          </div>

          <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl">
            <p className="text-[10px] text-orange-300 leading-relaxed">
              <strong>AVISO:</strong> Al realizar la cesión, todos los vínculos actuales de este inmueble pasarán a estado <strong>HISTÓRICO</strong>. El nuevo propietario y arrendatario serán los únicos activos a partir de la fecha seleccionada.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl border border-white/10 text-sm font-bold text-gray-400 hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] bg-gradient-to-r from-orange-600 to-orange-400 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Confirmar Cesión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
