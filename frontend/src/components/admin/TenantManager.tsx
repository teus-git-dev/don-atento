"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { tenantService, Tenant } from '@/services/tenantService';
import { authService } from '@/services/authService';
import {
  Building2, Plus, MoreVertical, ShieldCheck, ShieldAlert,
  Zap, X, Calendar, Pencil, Ban, Trash2, AlertTriangle, Copy, CheckCircle
} from 'lucide-react';

const LATAM_LOCATIONS: Record<string, string[]> = {
  "Colombia": ["Bogotá D.C.", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga"],
  "México": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla"],
  "Argentina": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza"],
  "Chile": ["Santiago", "Valparaíso", "Concepción"],
  "Perú": ["Lima", "Arequipa", "Trujillo"],
  "España": ["Madrid", "Barcelona", "Valencia", "Sevilla"],
};

const emptyForm = {
  nit: '', name: '', country: 'Colombia', city: 'Bogotá D.C.',
  address: '', plan: 'basic' as 'basic' | 'pro' | 'enterprise',
  adminName: '', adminLastName: '', adminCedula: '', adminEmail: '', adminPhone: ''
};

// ── Dropdown Component ──────────────────────────────────────────────────────
function TenantActionsMenu({ tenant, onEdit, onInactivate, onDelete }: {
  tenant: Tenant;
  onEdit: () => void;
  onInactivate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 bg-white shadow-sm border border-gray-200 rounded-lg border border-gray-200 text-gray-500 hover:text-[#1F2937] hover:border-white/30 transition-colors"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute bottom-10 right-0 z-50 w-52 rounded-2xl border border-gray-200 bg-[#0d1525] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1F2937] transition-colors"
          >
            <Pencil size={14} className="text-blue-400" /> Modificar Tenant
          </button>
          <button
            onClick={() => { setOpen(false); onInactivate(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1F2937] transition-colors"
          >
            <Ban size={14} className="text-yellow-400" />
            {tenant.status === 'active' ? 'Inactivar Tenant' : 'Activar Tenant'}
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} /> Eliminar Tenant
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function TenantManager() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [mounted, setMounted] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Shown ONCE after email change — contains the new temp password
  const [newCredential, setNewCredential] = useState<{ password: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [inactivateTarget, setInactivateTarget] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setMounted(true);
    setTenants(tenantService.getTenants());
  }, []);

  const refresh = () => setTenants([...tenantService.getTenants()]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = formData.plan === 'pro' ? 800 : 400;
    tenantService.createTenant({ name: formData.name, status: 'active', plan: formData.plan, aiTicketLimit: limit });
    refresh();
    setIsCreateOpen(false);
    setFormData(emptyForm);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);
    try {
      // 1. Update company fields locally (localStorage-backed)
      const all = tenantService.getTenants();
      const idx = all.findIndex(t => t.id === editTarget.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], name: formData.name, plan: formData.plan };
        localStorage.setItem('don_atento_tenants', JSON.stringify(all));
      }

      // 2. Resolve real backend DB tenant ID (localStorage uses generated IDs like TNT-001)
      const token = authService.getToken();
      if (!token) throw new Error('No tienes sesión de SuperAdmin iniciada. Inicia sesión en /login para realizar esta acción.');
      
      const tenantsRes = await fetch('/api/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tenantsRes.status === 401 || tenantsRes.status === 403) {
        throw new Error('Sesión de SuperAdmin expirada o inválida. Por favor, inicia sesión nuevamente.');
      }
      if (!tenantsRes.ok) throw new Error('No se pudo obtener la lista de tenants del servidor.');
      const backendTenants: { id: string; name: string }[] = await tenantsRes.json();
      // Match by the ORIGINAL tenant name (before the user's edits)
      const originalName = editTarget.name.toLowerCase();
      // Fuzzy match: check if any significant word matches (handles 'Incasa Inmobiliaria NC Group SAS' vs 'Incasa NC Group')
      const originalWords = originalName.split(' ').filter(w => w.length > 3);
      const backendTenant = backendTenants.find(t => {
        const dbName = t.name.toLowerCase();
        return originalWords.some(word => dbName.includes(word));
      });
      if (!backendTenant) throw new Error(`Tenant "${editTarget.name}" no encontrado en el servidor. Verifica que el nombre coincida.`);

      // 3. Update admin user via backend API using the real DB ID
      const res = await fetch(`/api/tenants/${backendTenant.id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          adminFirstName: editAdminForm.firstName,
          adminLastName: editAdminForm.lastName,
          adminPhone: editAdminForm.phone,
          adminEmail: editAdminForm.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar el admin.');

      // 4. If email changed, show the new temp password ONCE
      if (data.emailChanged && data.newTemporaryPassword) {
        setNewCredential({ password: data.newTemporaryPassword, email: editAdminForm.email });
      }

      refresh();
      setEditTarget(null);
    } catch (err: any) {
      setEditError(err.message ?? 'Error desconocido.');
    } finally {
      setEditLoading(false);
    }
  };

  const openEdit = (tenant: Tenant) => {
    setFormData({ ...emptyForm, name: tenant.name, plan: tenant.plan });
    setEditAdminForm({ firstName: '', lastName: '', phone: '', email: '' });
    setEditError(null);
    setEditTarget(tenant);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmInactivate = () => {
    if (!inactivateTarget) return;
    const newStatus = inactivateTarget.status === 'active' ? 'suspended' : 'active';
    tenantService.updateStatus(inactivateTarget.id, newStatus);
    refresh();
    setInactivateTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.name) return;
    const all = tenantService.getTenants().filter(t => t.id !== deleteTarget.id);
    localStorage.setItem('don_atento_tenants', JSON.stringify(all));
    refresh();
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1F2937] focus:outline-none focus:border-blue-500/50";
  const labelCls = "block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  // ── Shared form fields ───────────────────────────────────────────────────
  const TenantFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nombre Inmobiliaria</label>
          <input type="text" required value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className={inputCls} placeholder="Inversiones Horizonte" />
        </div>
        <div>
          <label className={labelCls}>NIT</label>
          <input type="text" value={formData.nit}
            onChange={e => setFormData({ ...formData, nit: e.target.value })}
            className={inputCls} placeholder="900.123.456-7" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Plan</label>
          <select value={formData.plan}
            onChange={e => setFormData({ ...formData, plan: e.target.value as any })}
            className={inputCls + " appearance-none"}>
            <option value="basic" className="bg-gray-900">Plan Básico – $450.000 COP/mes</option>
            <option value="pro" className="bg-gray-900">Plan Premium – $700.000 COP/mes</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xs uppercase font-bold tracking-widest text-gray-500">Cartera de Clientes Inmobiliarios</h3>
        <button
          onClick={() => { setFormData(emptyForm); setIsCreateOpen(true); }}
          className="bg-[#1E3A8A] text-[#1F2937] px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,112,243,0.3)]"
        >
          <Plus size={14} /> Nueva Inmobiliaria
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.id} className={`bg-white shadow-sm border border-gray-200 p-6 rounded-3xl border transition-all group relative overflow-hidden ${
            tenant.status !== 'active' ? 'opacity-50 border-gray-100 grayscale' : 'border-gray-100 hover:border-[#1E3A8A]/50'
          }`}>
            {/* Plan Badge */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-bold uppercase tracking-wider ${
              tenant.plan === 'pro' ? 'bg-[#1E3A8A]/20 text-[#1E3A8A]' : 'bg-gray-500/20 text-gray-500'
            }`}>
              PLAN {tenant.plan === 'pro' ? 'PREMIUM' : 'BÁSICO'}
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500">
                <Building2 size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#1F2937] group-hover:text-[#10B981] transition-colors">{tenant.name}</h4>
                <span className="text-[10px] font-mono text-gray-500">{tenant.id} • Desde {tenant.createdAt}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-gray-500">Tickets IA (Mensual)</span>
                  <span className="text-[#1F2937]">{tenant.aiTicketsUsed} / {tenant.aiTicketLimit}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      (tenant.aiTicketsUsed / tenant.aiTicketLimit) > 0.9
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        : 'bg-[#10B981] shadow-[0_0_8px_rgba(0,255,255,0.5)]'
                    }`}
                    style={{ width: `${Math.min(tenant.aiTicketsUsed / tenant.aiTicketLimit, 1) * 100}%` }}
                  />
                </div>
              </div>

              {(tenant.subscriptionStart || tenant.subscriptionEnd) && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="p-2 rounded-xl bg-[#1E3A8A]/10 text-[#1E3A8A]">
                    <Calendar size={14} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-gray-500 tracking-widest">Vencimiento Suscripción</span>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#1F2937] font-bold">{tenant.subscriptionEnd || '--'}</span>
                      <span className="text-[9px] text-[#10B981] font-mono">Inicia: {tenant.subscriptionStart}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {tenant.status === 'active' ? (
                    <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold uppercase">
                      <ShieldCheck size={14} /> Activo
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-yellow-500 text-[10px] font-bold uppercase">
                      <ShieldAlert size={14} /> Inactivo
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setInactivateTarget(tenant)}
                    className={`p-2 bg-white shadow-sm border border-gray-200 rounded-lg border transition-colors ${
                      tenant.status === 'active'
                        ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                        : 'border-green-500/30 text-green-400 hover:bg-green-500/20'
                    }`}
                    title={tenant.status === 'active' ? 'Inactivar' : 'Activar'}
                  >
                    <Zap size={14} />
                  </button>
                  <TenantActionsMenu
                    tenant={tenant}
                    onEdit={() => openEdit(tenant)}
                    onInactivate={() => setInactivateTarget(tenant)}
                    onDelete={() => { setDeleteTarget(tenant); setDeleteConfirmText(''); }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE MODAL ─────────────────────────────────────────────── */}
      {isCreateOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white shadow-sm border border-gray-200 w-full max-w-2xl rounded-3xl p-8 border border-blue-500/30 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-[#1F2937]">Nueva Inmobiliaria</h2>
                <p className="text-sm text-[#10B981] font-mono mt-1">Panel Exclusivo Teus SuperAdmin</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#1F2937] transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-6">
              <TenantFormFields />
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-[#10B981] uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={16} /> Admin Tenant
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Nombres</label>
                    <input type="text" required value={formData.adminName}
                      onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                      className={inputCls} placeholder="Juan Alberto" />
                  </div>
                  <div>
                    <label className={labelCls}>Apellidos</label>
                    <input type="text" required value={formData.adminLastName}
                      onChange={e => setFormData({ ...formData, adminLastName: e.target.value })}
                      className={inputCls} placeholder="Pérez García" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Correo Electrónico</label>
                    <input type="email" required value={formData.adminEmail}
                      onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                      className={inputCls} placeholder="admin@inmobiliaria.com" />
                    <p className="text-[10px] text-gray-500 mt-2">La contraseña temporal será enviada a este correo.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#1F2937] hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-[#1E3A8A] hover:bg-blue-500 text-[#1F2937] rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(0,112,243,0.5)] flex items-center gap-2">
                  <ShieldCheck size={16} /> Registrar y Activar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
      {editTarget && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white shadow-sm border border-gray-200 w-full max-w-2xl rounded-3xl p-8 border border-blue-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Modificar Tenant</h2>
                <p className="text-xs text-gray-500 font-mono mt-1">{editTarget.id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500 hover:text-[#1F2937] transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleEdit} className="space-y-6">
              {/* Company fields */}
              <TenantFormFields />

              {/* Admin section */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-[#10B981] uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={15} /> Información del Admin Tenant
                </h3>
                <p className="text-[11px] text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-2">
                  ⚠ Si cambias el correo electrónico, se generará una nueva contraseña temporal y se enviará un email al nuevo correo.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Nombres</label>
                    <input type="text" value={editAdminForm.firstName}
                      onChange={e => setEditAdminForm({ ...editAdminForm, firstName: e.target.value })}
                      className={inputCls} placeholder="Juan Alberto" />
                  </div>
                  <div>
                    <label className={labelCls}>Apellidos</label>
                    <input type="text" value={editAdminForm.lastName}
                      onChange={e => setEditAdminForm({ ...editAdminForm, lastName: e.target.value })}
                      className={inputCls} placeholder="Pérez García" />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono (WhatsApp)</label>
                    <input type="text" value={editAdminForm.phone}
                      onChange={e => setEditAdminForm({ ...editAdminForm, phone: e.target.value })}
                      className={inputCls} placeholder="+57 300 000 0000" />
                  </div>
                  <div>
                    <label className={labelCls}>Correo Electrónico</label>
                    <input type="email" required value={editAdminForm.email}
                      onChange={e => setEditAdminForm({ ...editAdminForm, email: e.target.value })}
                      className={inputCls} placeholder="admin@inmobiliaria.com" />
                  </div>
                </div>
              </div>

              {editError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">{editError}</p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditTarget(null)} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#1F2937] hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={editLoading} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[#1F2937] rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                  <Pencil size={14} /> {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── NEW CREDENTIAL MODAL (shown ONCE after email change) ────── */}
      {newCredential && mounted && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-white shadow-sm border border-gray-200 w-full max-w-md rounded-3xl p-8 border border-yellow-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <ShieldCheck size={28} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-bold text-[#1F2937] mb-1">Nuevas Credenciales Generadas</h2>
              <p className="text-sm text-gray-500">
                Email de bienvenida enviado a <span className="text-[#1F2937] font-bold">{newCredential.email}</span>.
                Guarda la contraseña ahora — <span className="text-yellow-400 font-bold">no se mostrará de nuevo.</span>
              </p>
            </div>

            <div className="bg-black/60 border border-gray-200 rounded-2xl p-5 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Contraseña Temporal (Un Solo Uso)</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 font-mono text-lg font-bold text-[#1F2937] tracking-wider break-all">
                  {newCredential.password}
                </code>
                <button
                  onClick={() => copyToClipboard(newCredential.password)}
                  className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-[#1F2937] transition-colors flex-shrink-0"
                  title="Copiar"
                >
                  {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setNewCredential(null)}
              className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-[#1F2937] rounded-xl text-sm font-bold transition-all"
            >
              Entendido — He guardado la contraseña
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── INACTIVATE CONFIRMATION ──────────────────────────────────── */}
      {inactivateTarget && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white shadow-sm border border-gray-200 w-full max-w-md rounded-3xl p-8 border border-yellow-500/30 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Ban size={32} className="text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-[#1F2937] mb-2">
              {inactivateTarget.status === 'active' ? 'Inactivar' : 'Activar'} Tenant
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              ¿Estás seguro que deseas {inactivateTarget.status === 'active' ? 'inactivar' : 'activar'} a{' '}
              <span className="text-[#1F2937] font-bold">{inactivateTarget.name}</span>?
              {inactivateTarget.status === 'active' && ' El acceso al sistema quedará bloqueado.'}
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setInactivateTarget(null)} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#1F2937] hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={confirmInactivate} className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-[#1F2937] rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                <Ban size={14} /> {inactivateTarget.status === 'active' ? 'Inactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE DOUBLE CONFIRMATION ───────────────────────────────── */}
      {deleteTarget && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white shadow-sm border border-gray-200 w-full max-w-md rounded-3xl p-8 border border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-[#1F2937] mb-1">Eliminar Tenant</h2>
              <p className="text-sm text-gray-500">
                Esta acción es <span className="text-red-400 font-bold">permanente e irreversible</span>.
                Todos los datos de{' '}
                <span className="text-[#1F2937] font-bold">{deleteTarget.name}</span> serán eliminados.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">
                Escribe el nombre del tenant para confirmar:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-red-500"
                placeholder={deleteTarget.name}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#1F2937] hover:bg-gray-50 transition-colors">Cancelar</button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== deleteTarget.name}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-[#1F2937] rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              >
                <Trash2 size={14} /> Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
