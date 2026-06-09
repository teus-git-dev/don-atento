"use client";

import { useState, useEffect } from "react";
import {
  Users, Plus, Search, Star, MoreVertical, Wrench,
  Shield, User, Camera, Trash2, X, CheckCircle2, Phone
} from "lucide-react";
import {
  providersService,
  type Provider,
  ProviderSpecialty,
  type ProviderAdditionalContact,
  SpecialtyLabels,
} from "@/services/providersService";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const emptyForm = {
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
    additionalContacts: [] as Omit<ProviderAdditionalContact, "id">[],
  };

  const [form, setForm] = useState(emptyForm);

  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await providersService.getProviders();
      setProviders(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await providersService.createProvider(form as Parameters<typeof providersService.createProvider>[0]);
      setIsFormOpen(false);
      setForm(emptyForm);
      loadProviders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setError(msg);
    }
  };

  const addContact = () =>
    setForm((f) => ({
      ...f,
      additionalContacts: [
        ...f.additionalContacts,
        { firstName: "", lastName: "", governmentId: "", phone: "+57 ", photoUrl: "" },
      ],
    }));

  const removeContact = (idx: number) =>
    setForm((f) => ({
      ...f,
      additionalContacts: f.additionalContacts.filter((_, i) => i !== idx),
    }));

  const updateContact = (idx: number, field: string, value: string) =>
    setForm((f) => {
      const updated = [...f.additionalContacts];
      (updated[idx] as Record<string, unknown>)[field] = value;
      return { ...f, additionalContacts: updated };
    });

  const filtered = providers.filter(
    (p) =>
      (p.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.specialty ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-400 font-mono text-sm">{error}</p>
        <button
          onClick={loadProviders}
          className="px-6 py-2 bg-[var(--color-neon-cyan)] text-black font-bold rounded-xl"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="text-[var(--color-neon-cyan)]" /> Proveedores y Técnicos
          </h1>
          <p className="text-gray-400 mt-1">Red de contratistas y servicios externos de mantenimiento</p>
        </div>
        <button
          id="btn-new-provider"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
        >
          {isFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isFormOpen ? "Cancelar" : "Nuevo Proveedor"}
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="glass p-10 rounded-[2.5rem] border border-[var(--color-neon-cyan)]/20 animate-in slide-in-from-top duration-500">
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <Wrench className="text-[var(--color-neon-cyan)]" /> Registro de Proveedor
          </h3>
          <form onSubmit={handleCreate} className="space-y-8">
            {/* Business info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <label className="text-[10px] font-mono uppercase text-gray-500">Nombre Comercial</label>
                <input required type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50"
                  placeholder="Ej. Plomería Express SAS" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-gray-500">NIT</label>
                <input type="text" value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/50 font-mono"
                  placeholder="900.XXX.XXX-X" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-gray-500">Especialidad</label>
                <select value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value as ProviderSpecialty })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none appearance-none">
                  {Object.values(ProviderSpecialty).map((s) => (
                    <option key={s} value={s} className="bg-[#0a0f1e]">{SpecialtyLabels[s] ?? s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Legal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white/5 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-gray-500">ARL Vigente</label>
                <input type="text" value={form.legalArl}
                  onChange={(e) => setForm({ ...form, legalArl: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  placeholder="Ej. ARL Sura" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-gray-500">N° Póliza</label>
                <input type="text" value={form.legalPolicyNumber}
                  onChange={(e) => setForm({ ...form, legalPolicyNumber: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                  placeholder="Póliza de Responsabilidad Civil" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input id="sst" type="checkbox" checked={form.legalSst}
                  onChange={(e) => setForm({ ...form, legalSst: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-neon-cyan)]" />
                <label htmlFor="sst" className="text-xs font-bold text-gray-400 uppercase cursor-pointer">Certificado SST</label>
              </div>
            </div>

            {/* Additional contacts */}
            <div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                <h4 className="text-xs font-mono uppercase text-[var(--color-neon-cyan)] tracking-widest">Contactos adicionales</h4>
                <button type="button" onClick={addContact}
                  className="text-[10px] font-bold text-[var(--color-neon-cyan)] hover:underline flex items-center gap-1">
                  <Plus size={12} /> AÑADIR
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.additionalContacts.map((c, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 relative">
                    <button type="button" onClick={() => removeContact(idx)}
                      className="absolute top-3 right-3 text-gray-600 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Nombre" value={c.firstName}
                        onChange={(e) => updateContact(idx, "firstName", e.target.value)}
                        className="bg-black/20 border-b border-white/10 text-xs px-2 py-1 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]" />
                      <input type="text" placeholder="Apellido" value={c.lastName}
                        onChange={(e) => updateContact(idx, "lastName", e.target.value)}
                        className="bg-black/20 border-b border-white/10 text-xs px-2 py-1 text-white focus:outline-none focus:border-[var(--color-neon-cyan)]" />
                      <input type="text" placeholder="+57 ..." value={c.phone ?? ""}
                        onChange={(e) => updateContact(idx, "phone", e.target.value)}
                        className="bg-black/20 border-b border-white/10 text-xs px-2 py-1 text-white focus:outline-none focus:border-[var(--color-neon-cyan)] font-mono" />
                      <input type="text" placeholder="Cédula" value={c.governmentId ?? ""}
                        onChange={(e) => updateContact(idx, "governmentId", e.target.value)}
                        className="bg-black/20 border-b border-white/10 text-xs px-2 py-1 text-white focus:outline-none focus:border-[var(--color-neon-cyan)] font-mono" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit"
              className="w-full py-4 bg-[var(--color-neon-cyan)] text-black font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all">
              Finalizar Registro
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      {!isFormOpen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Activos", value: providers.filter((p) => p.status === "ACTIVE").length, icon: <Shield className="text-green-500 opacity-50" /> },
            { label: "SST Verificados", value: providers.filter((p) => p.legalSst).length, icon: <Star className="text-yellow-400 opacity-50" /> },
            { label: "Especialidades", value: new Set(providers.map((p) => p.specialty)).size, icon: <Wrench className="text-blue-500 opacity-50" /> },
            { label: "Total Operarios", value: providers.reduce((a, p) => a + (p.additionalContacts?.length ?? 0) + 1, 0), icon: <User className="text-purple-500 opacity-50" /> },
          ].map((s) => (
            <div key={s.label} className="glass p-4 rounded-3xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-500 uppercase">{s.label}</p>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
              {s.icon}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input type="text" placeholder="Buscar por nombre o especialidad..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 text-white placeholder:text-gray-600" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-neon-cyan)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-20 rounded-[3rem] border border-white/5 text-center">
          <Users size={64} className="mx-auto text-gray-600 mb-6 opacity-10" />
          <p className="text-xl text-gray-500 font-medium">No se detectaron proveedores</p>
          <button onClick={() => setIsFormOpen(true)}
            className="mt-4 text-[var(--color-neon-cyan)] hover:underline font-mono text-xs uppercase tracking-widest">
            Registrar el primero ahora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((p) => (
            <div key={p.id} className="glass p-8 rounded-[3rem] border border-white/5 hover:border-[var(--color-neon-cyan)]/40 transition-all group relative">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                    {p.photoUrl
                      ? <img src={p.photoUrl} className="w-full h-full object-cover" alt={p.name} />
                      : <Users className="text-[var(--color-neon-cyan)] opacity-50" size={28} />}
                    {p.legalSst && (
                      <div className="absolute top-0 right-0 bg-[var(--color-neon-cyan)] p-1 rounded-bl-lg">
                        <CheckCircle2 size={10} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors">{p.name}</h4>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-[var(--color-neon-cyan)] text-[9px] font-black uppercase tracking-widest border border-white/10">
                      {SpecialtyLabels[p.specialty] ?? p.specialty}
                    </span>
                  </div>
                </div>
                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5">
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <User size={14} className="text-gray-600 shrink-0" />
                  <span>{[p.contactName, p.contactLastName].filter(Boolean).join(" ") || "Sin representante"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <Phone size={14} className="text-gray-600 shrink-0" />
                  <span className="font-mono">{p.contactPhone ?? p.phone ?? "Sin teléfono"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Shield size={14} className="text-gray-700 shrink-0" />
                  <span className="text-[10px] uppercase font-mono">ARL: {p.legalArl ?? "Sin registrar"}</span>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-gray-600 uppercase mb-3">Equipo Técnico</p>
                  <div className="flex -space-x-4">
                    <div className="w-10 h-10 rounded-full border-4 border-[#060b13] bg-white/10 flex items-center justify-center overflow-hidden z-10">
                      {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" alt="" /> : <User size={14} />}
                    </div>
                    {(p.additionalContacts ?? []).slice(0, 3).map((c, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-4 border-[#060b13] bg-white/10 flex items-center justify-center overflow-hidden shadow-lg" style={{ zIndex: 10 - i }}>
                        {c.photoUrl
                          ? <img src={c.photoUrl} className="w-full h-full object-cover" alt="" />
                          : <span className="text-[10px] font-bold text-gray-400 uppercase">{c.firstName?.[0] ?? "?"}</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <button className="h-10 px-4 bg-white/5 hover:bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all">
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
