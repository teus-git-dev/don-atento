"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { tenantService, Tenant } from '@/services/tenantService';
import { Building2, Plus, MoreVertical, ShieldCheck, ShieldAlert, Zap, X, Calendar } from 'lucide-react';

const LATAM_LOCATIONS: Record<string, string[]> = {
  "Colombia": ["Bogotá D.C.", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales"],
  "México": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "Mérida"],
  "Argentina": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata"],
  "Chile": ["Santiago", "Valparaíso", "Concepción", "La Serena", "Antofagasta"],
  "Perú": ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Cusco"],
  "Ecuador": ["Guayaquil", "Quito", "Cuenca", "Santo Domingo"],
  "España": ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga"]
};

export default function TenantManager() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Expanded Form State
  const [formData, setFormData] = useState({
    nit: '',
    name: '',
    country: 'Colombia',
    city: 'Bogotá D.C.',
    address: '',
    plan: 'basic' as 'basic' | 'pro' | 'enterprise',
    adminName: '',
    adminLastName: '',
    adminCedula: '',
    adminEmail: '',
    adminPhone: ''
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setTenants(tenantService.getTenants());
  }, []);

  const availableCities = LATAM_LOCATIONS[formData.country] || [];

  const toggleStatus = (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    tenantService.updateStatus(id, newStatus);
    setTenants([...tenantService.getTenants()]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate creation of tenant and its ADMIN_TENANT user
    const limit = formData.plan === 'pro' ? 800 : 400; // Simplified internal limits logic
    
    tenantService.createTenant({
      name: formData.name,
      status: 'active',
      plan: formData.plan,
      aiTicketLimit: limit,
    });

    setTenants([...tenantService.getTenants()]);
    setIsModalOpen(false);
    setFormData({ nit: '', name: '', country: 'Colombia', city: 'Bogotá D.C.', address: '', plan: 'basic', adminName: '', adminLastName: '', adminCedula: '', adminEmail: '', adminPhone: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs uppercase font-bold tracking-widest text-gray-500">Cartera de Clientes Inmobiliarios</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-neon-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,112,243,0.3)]"
        >
            <Plus size={14} /> Nueva Inmobiliaria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-[var(--color-neon-blue)]/50 transition-all group relative overflow-hidden">
            {/* Plan Badge */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[8px] font-bold uppercase tracking-wider ${
                tenant.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                tenant.plan === 'pro' ? 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)]' :
                'bg-gray-500/20 text-gray-400'
            }`}>
                PLAN {tenant.plan === 'pro' ? 'PREMIUM' : 'BÁSICO'}
            </div>

            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                    <Building2 size={24} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-[var(--color-neon-cyan)] transition-colors">{tenant.name}</h4>
                    <span className="text-[10px] font-mono text-gray-500">{tenant.id} • Desde {tenant.createdAt}</span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-gray-500">Tickets IA (Mensual)</span>
                        <span className="text-white">{tenant.aiTicketsUsed} / {tenant.aiTicketLimit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${
                                (tenant.aiTicketsUsed / tenant.aiTicketLimit) > 0.9 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[var(--color-neon-cyan)] shadow-[0_0_8px_rgba(0,255,255,0.5)]'
                            }`}
                            style={{ width: `${(Math.min(tenant.aiTicketsUsed / tenant.aiTicketLimit, 1)) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Subscription Control */}
                {(tenant.subscriptionStart || tenant.subscriptionEnd) && (
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="p-2 rounded-xl bg-[var(--color-neon-blue)]/10 text-[var(--color-neon-blue)]">
                        <Calendar size={14} />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <span className="text-[8px] uppercase font-bold text-gray-500 tracking-widest">Vencimiento Suscripción</span>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-white font-bold">{tenant.subscriptionEnd || '--'}</span>
                            <span className="text-[9px] text-[var(--color-neon-cyan)] font-mono">Inicia: {tenant.subscriptionStart}</span>
                        </div>
                    </div>
                </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {tenant.status === 'active' ? (
                            <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold uppercase">
                                <ShieldCheck size={14} /> Activo
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase">
                                <ShieldAlert size={14} /> Suspendido
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => toggleStatus(tenant.id)}
                            className={`p-2 glass rounded-lg border transition-colors ${
                              tenant.status === 'active' ? 'border-red-500/30 text-red-400 hover:bg-red-500/20' : 'border-green-500/30 text-green-400 hover:bg-green-500/20'
                            }`}
                            title={tenant.status === 'active' ? "Suspender Inmobiliaria" : "Activar Inmobiliaria"}
                        >
                            <Zap size={14} />
                        </button>
                        <button className="p-2 glass rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
                            <MoreVertical size={14} />
                        </button>
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Create Modal with Portal to fix Stacking Trap */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass w-full max-w-3xl rounded-3xl p-6 md:p-8 border border-[var(--color-neon-blue)]/30 shadow-[0_0_50px_rgba(0,112,243,0.15)] flex flex-col slide-in-from-bottom-5 max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 sticky top-0 bg-black/20 backdrop-blur-md z-10 -mx-6 md:-mx-8 px-6 md:px-8 pt-2">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Nueva Inmobiliaria (Tenant)</h2>
                <p className="text-sm text-[var(--color-neon-cyan)] font-mono">Panel Exclusivo Teus SuperAdmin</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              
              {/* Sección Inmobiliaria */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
                  <Building2 size={16} className="text-blue-400" /> Datos de la Empresa
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">NIT</label>
                    <input 
                      type="text" required value={formData.nit} onChange={e => setFormData({...formData, nit: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50"
                      placeholder="900.123.456-7"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nombre Inmobiliaria</label>
                    <input 
                      type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50"
                      placeholder="Inversiones Horizonte"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Dirección Física</label>
                    <input 
                      type="text" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50"
                      placeholder="Av. Principal #123, Edificio Empresarial Piso 5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">País</label>
                    <select 
                      required value={formData.country} 
                      onChange={e => {
                        const newCountry = e.target.value;
                        const newCities = LATAM_LOCATIONS[newCountry] || [];
                        setFormData({...formData, country: newCountry, city: newCities[0] || ''});
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 appearance-none"
                    >
                      {Object.keys(LATAM_LOCATIONS).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Ciudad</label>
                    <select 
                      required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 appearance-none"
                    >
                      {availableCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección Suscripción */}
              <div className="pt-4 border-t border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-widest">
                  <Zap size={16} className="text-purple-400" /> Plan Operativo (SaaS)
                </h3>
                 <div>
                    <select 
                      value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value as any})}
                      className="w-full bg-purple-900/10 border border-purple-500/30 rounded-xl px-4 py-3 text-sm text-purple-200 focus:outline-none focus:border-[var(--color-neon-blue)]/50 appearance-none font-bold"
                    >
                      <option value="basic" className="bg-gray-900">Plan Básico - $450.000 COP/mes (Automatización Esencial)</option>
                      <option value="pro" className="bg-gray-900">Plan Premium - $700.000 COP/mes (Todo Ilimitado y Modelos Dedicados)</option>
                    </select>
                  </div>
              </div>

              {/* Sección Administrador */}
              <div className="pt-4 border-t border-white/5 space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-neon-cyan)] flex items-center gap-2 uppercase tracking-widest">
                  <ShieldCheck size={16} /> Creación Usuario Administrador (ADMIN_TENANT)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nombres</label>
                    <input 
                      type="text" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})}
                      className="w-full bg-black/40 border border-[var(--color-neon-cyan)]/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/60"
                      placeholder="Juan Alberto"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Apellidos</label>
                    <input 
                      type="text" required value={formData.adminLastName} onChange={e => setFormData({...formData, adminLastName: e.target.value})}
                      className="w-full bg-black/40 border border-[var(--color-neon-cyan)]/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/60"
                      placeholder="Pérez García"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Cédula</label>
                    <input 
                      type="text" required value={formData.adminCedula} onChange={e => setFormData({...formData, adminCedula: e.target.value})}
                      className="w-full bg-black/40 border border-[var(--color-neon-cyan)]/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/60"
                      placeholder="123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Teléfono (WhatsApp)</label>
                    <input 
                      type="text" required value={formData.adminPhone} onChange={e => setFormData({...formData, adminPhone: e.target.value})}
                      className="w-full bg-black/40 border border-[var(--color-neon-cyan)]/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-neon-cyan)]/60"
                      placeholder="+57 300 000 0000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[var(--color-neon-cyan)] uppercase tracking-widest mb-1.5">Correo Electrónico de Acceso</label>
                    <input 
                      type="email" required value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                      className="w-full bg-black/40 border border-[var(--color-neon-cyan)]/40 rounded-xl px-4 py-3 text-sm text-[var(--color-neon-cyan)] font-bold focus:outline-none focus:border-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                      placeholder="admin@horizonte.com"
                    />
                    <p className="text-[10px] text-gray-500 mt-2 pb-6">La contraseña temporal será enviada a este correo de forma automática.</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-white/5 sticky bottom-0 bg-black/20 backdrop-blur-md z-10 -mx-6 md:-mx-8 px-6 md:px-8 -mb-6 md:-mb-8 py-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-[var(--color-neon-blue)] hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(0,112,243,0.5)] flex items-center gap-2"
                >
                  <ShieldCheck size={18} /> Registrar y Activar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
