'use client';

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, CreditCard, MapPin, Home,
  FileText, Calendar, Tag, Shield, Building2, ChevronRight,
  Map
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface ContactProfilePanelProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  role: 'TENANT_USER' | 'OWNER';
}

export function ContactProfilePanel({ user, isOpen, onClose, role }: ContactProfilePanelProps) {
  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      apiClient.get(`/users/${user.id}/details`)
        .then((res) => {
          setDetails(res);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setDetails(null);
    }
  }, [isOpen, user?.id]);

  if (!mounted || !user) return null;

  const roleLabel = role === 'TENANT_USER' ? 'Arrendatario' : 'Propietario';
  const accentColor = role === 'TENANT_USER' ? 'var(--color-neon-blue)' : 'var(--color-neon-cyan)';
  const accentClass = role === 'TENANT_USER' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';

  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '??';

  const fields: { icon: React.ReactNode; label: string; value: string | null | undefined }[] = [
    { icon: <Mail size={14} />, label: 'Correo Electrónico', value: user.email },
    { icon: <Phone size={14} />, label: 'Teléfono / WhatsApp', value: user.phone || user.whatsappId },
    { icon: <CreditCard size={14} />, label: 'Documento', value: user.governmentId },
    { icon: <MapPin size={14} />, label: 'Tipo de persona', value: user.personType },
    { icon: <Tag size={14} />, label: 'Régimen tributario', value: user.regimeType },
    { icon: <Building2 size={14} />, label: 'Banco', value: user.bankName },
    { icon: <FileText size={14} />, label: 'Número de cuenta', value: user.accountNumber },
    { icon: <Calendar size={14} />, label: 'Creado', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
  ];

  const linkedProperties = role === 'TENANT_USER' ? details?.rentedProperties : details?.ownedProperties;
  const mainProperty = linkedProperties?.[0]; // Show first property

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className={`fixed right-0 top-0 h-full z-[9999] w-full max-w-md shadow-2xl transition-transform duration-300 ease-out flex flex-col`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          background: 'linear-gradient(180deg, #0d1526 0%, #080f1e 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: accentColor }} />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Perfil de Contacto</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}15)`, border: `1px solid ${accentColor}40` }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {user.firstName} {user.lastName}
              </h2>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${accentClass}`}>
                <Home size={10} /> {roleLabel}
              </span>
              {user.sourceTag && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-white/10 text-gray-400">
                  {user.sourceTag}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          
          {/* Contact Info */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-3">Información de Contacto</p>
            <div className="space-y-2">
              {fields.map((f, i) =>
                f.value ? (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                    <div className="mt-0.5 text-gray-500">{f.icon}</div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">{f.label}</p>
                      <p className="text-sm text-white font-mono mt-0.5">{f.value}</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Associated Property Section */}
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-3">Inmueble Asociado</p>
            
            {loading ? (
              <div className="animate-pulse bg-white/5 rounded-xl h-24 border border-white/10"></div>
            ) : mainProperty ? (
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-0 group-hover:opacity-100"></div>
                
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Home size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{mainProperty.title || mainProperty.propertyCode}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Map size={10} /> {mainProperty.address || mainProperty.city || 'Dirección no registrada'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${mainProperty.relationContext?.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {mainProperty.relationContext?.status === 'ACTIVE' ? 'Vigente' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 relative z-10">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Canon Mensual</p>
                    <p className="text-sm text-white font-mono font-bold mt-0.5">
                      {mainProperty.financials?.canon ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(mainProperty.financials.canon) : '$0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Contrato N°</p>
                    <p className="text-sm text-gray-300 font-mono mt-0.5">
                      {mainProperty.relationContext?.contractNumber || 'No especificado'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/[0.02] border border-white/5 border-dashed">
                <Home size={24} className="text-gray-600 mb-2 opacity-50" />
                <p className="text-xs text-gray-500 font-medium">No se encontró ningún inmueble vinculado</p>
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold mb-3">Configuración Tributaria</p>
            <div className="space-y-2">
              {[
                { label: 'Rte. IVA', active: user.applyReteIva },
                { label: 'Rte. Fuente', active: user.applyReteFuente },
                { label: 'Rte. ICA', active: user.applyReteIca },
                { label: 'Declarante de Renta', active: user.isTaxDeclarant },
              ].map((flag, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs text-gray-400">{flag.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flag.active ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-600 border border-white/10'}`}>
                    {flag.active ? 'Sí' : 'No'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/20">
          <button
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-125"
            style={{ background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`, border: `1px solid ${accentColor}30` }}
          >
            <span>Ver historial completo</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
