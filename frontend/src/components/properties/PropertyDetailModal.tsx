"use client";

import { X, Building2, MapPin, DollarSign, User, FileText, Info } from "lucide-react";

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
}

export default function PropertyDetailModal({ isOpen, onClose, property }: PropertyDetailModalProps) {
  if (!isOpen || !property) return null;

  const ownerRel = property.relations?.find((r: any) => r.relationType === 'OWNER');
  const tenantRel = property.relations?.find((r: any) => r.relationType === 'TENANT');

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "No definido";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white shadow-sm border border-gray-200 w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] uppercase tracking-tight">Detalle del Inmueble</h2>
              <p className="text-xs text-gray-500 font-mono italic">{property.propertyCode || 'SIN ID'} • {property.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* General info */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" /> Información General
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Tipo</p>
                <p className="text-sm font-medium text-gray-800">{property.propertyType}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Área (m²)</p>
                <p className="text-sm font-medium text-gray-800">{property.areaM2 || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Habitaciones</p>
                <p className="text-sm font-medium text-gray-800">{property.rooms || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Baños</p>
                <p className="text-sm font-medium text-gray-800">{property.bathrooms || '-'}</p>
              </div>
            </div>
          </section>

          {/* Location */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" /> Ubicación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Dirección</p>
                <p className="text-sm font-medium text-gray-800">{property.address}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Ciudad / País</p>
                <p className="text-sm font-medium text-gray-800">{property.city}, {property.country}</p>
              </div>
              {property.managementName && (
                <div className="col-span-full">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Edificio / Copropiedad</p>
                  <p className="text-sm font-medium text-gray-800">{property.managementName}</p>
                </div>
              )}
            </div>
          </section>

          {/* Financials */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" /> Aspectos Financieros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Canon (Arriendo)</p>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(property.rentAmount)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Administración</p>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(property.adminAmount)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Impuestos / IVA</p>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(property.taxAmount)}</p>
              </div>
            </div>
          </section>

          {/* Stakeholders */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <User size={16} className="text-orange-500" /> Propietario
              </h3>
              {ownerRel ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Nombre</p>
                    <p className="text-sm font-medium text-gray-800">{ownerRel.user?.firstName} {ownerRel.user?.lastName}</p>
                  </div>
                  {ownerRel.user?.email && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email</p>
                      <p className="text-sm font-medium text-gray-800">{ownerRel.user?.email}</p>
                    </div>
                  )}
                  {ownerRel.user?.phone && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Teléfono</p>
                      <p className="text-sm font-medium text-gray-800">{ownerRel.user?.phone}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No hay propietario registrado</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <User size={16} className="text-blue-500" /> Arrendatario
              </h3>
              {tenantRel ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Nombre</p>
                    <p className="text-sm font-medium text-gray-800">{tenantRel.user?.firstName} {tenantRel.user?.lastName}</p>
                  </div>
                  {tenantRel.user?.phone && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Teléfono</p>
                      <p className="text-sm font-medium text-gray-800">{tenantRel.user?.phone}</p>
                    </div>
                  )}
                  {tenantRel.endDate && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest flex items-center gap-1"><FileText size={10} /> Fin Contrato</p>
                      <p className="text-sm font-medium text-gray-800">{new Date(tenantRel.endDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No hay arrendatario (Vacante)</p>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
