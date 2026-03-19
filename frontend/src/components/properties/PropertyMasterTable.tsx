"use client";

import { useState, useEffect } from "react";
import { Building2, Search, Plus, MoreVertical, Edit2, MapPin, Eye, Loader2, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { TENANT_ID, API_URL } from "@/lib/config";

export default function PropertyMasterTable() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/properties?tenantId=${TENANT_ID}`);
      if (response.ok) {
        const data = await response.json();
        setProperties(data);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_URL}/properties/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (response.ok) {
        setProperties(properties.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
      }
    } catch (error) {
      console.error("Error toggling property status:", error);
      alert("Error al cambiar el estado del inmueble");
    }
  };

  const filteredProperties = properties.filter(prop => 
    prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prop.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass rounded-2xl border border-white/5 overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/20">
        <div className="flex flex-1 w-full relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por ID, nombre, dirección..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-colors text-white placeholder:text-gray-500"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none glass px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors border border-white/10 text-gray-300">
            Filtros
          </button>
          <Link href="/inmuebles/nuevo" className="flex-1 sm:flex-none bg-[var(--color-neon-blue)] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,112,243,0.4)] flex items-center justify-center gap-2">
            <Plus size={16} />
            Nuevo Inmueble
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-gray-400">
            <Loader2 className="animate-spin text-[var(--color-neon-blue)]" size={40} />
            <p className="font-medium animate-pulse">Sincronizando maestro de inmuebles...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 text-gray-400">
                <Building2 size={48} className="opacity-20" />
                <p>No se encontraron inmuebles registrados.</p>
            </div>
        ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 text-gray-400 font-medium">
                <tr>
                <th className="px-6 py-4 rounded-tl-xl border-b border-white/5">ID Inmueble</th>
                <th className="px-6 py-4 border-b border-white/5">Nombre</th>
                <th className="px-6 py-4 border-b border-white/5">Tipo</th>
                <th className="px-6 py-4 border-b border-white/5">Ubicación</th>
                <th className="px-6 py-4 border-b border-white/5">Estado</th>
                <th className="px-6 py-4 border-b border-white/5">Operación</th>
                <th className="px-6 py-4 rounded-tr-xl border-b border-white/5 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {filteredProperties.map((prop) => (
                <tr key={prop.id} className={`hover:bg-white/5 transition-colors group ${!prop.isActive ? 'opacity-40 grayscale-[0.5]' : ''} ${prop.isVip ? 'bg-blue-500/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[var(--color-neon-cyan)] text-xs">{prop.propertyCode || 'SIN ID'}</span>
                        <span className="text-[9px] text-gray-600 font-mono italic">{prop.id.split('-')[0]}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                      prop.isVip 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                        : 'bg-white/5 text-gray-400 border-white/10 group-hover:bg-[var(--color-neon-blue)]/20 group-hover:text-[var(--color-neon-blue)] group-hover:border-[var(--color-neon-blue)]/30'
                    }`}>
                        <Building2 size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{prop.title}</span>
                      {prop.isVip && (
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                          <Zap size={8} className="fill-blue-400" /> VIP PROPERTY
                        </span>
                      )}
                    </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{prop.propertyType}</td>
                    <td className="px-6 py-4 text-gray-400 flex items-center gap-2">
                    <MapPin size={14} className="text-gray-500" />
                    {prop.city}, {prop.country}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold border w-fit ${
                                prop.status === "AVAILABLE" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                prop.status === "UNDER_MAINTENANCE" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]" :
                                "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            }`}>
                                {prop.status}
                            </span>
                            {(() => {
                                const tenantRel = prop.relations?.find((r: any) => r.relationType === 'TENANT');
                                if (tenantRel?.endDate) {
                                    const end = new Date(tenantRel.endDate);
                                    const now = new Date();
                                    const diffMonths = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
                                    
                                    if (diffMonths <= 4 && diffMonths >= 0) {
                                        return (
                                            <span className="flex items-center gap-1 text-[9px] text-orange-400 font-bold animate-pulse">
                                                <Clock size={10} /> Vence en {diffMonths} meses
                                            </span>
                                        );
                                    } else if (diffMonths < 0) {
                                        return (
                                            <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold">
                                                <Clock size={10} /> CONTRATO VENCIDO
                                            </span>
                                        );
                                    }
                                }
                                return null;
                            })()}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <button 
                            onClick={() => handleToggleActive(prop.id, prop.isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${prop.isActive ? 'bg-[var(--color-neon-blue)]' : 'bg-white/10'}`}
                        >
                            <span 
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prop.isActive ? 'translate-x-6' : 'translate-x-1'}`} 
                            />
                        </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                        href={`/inmuebles/${prop.id}/inspeccion`} 
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
                        title="Ver Detalle 3D"
                        >
                        <Eye size={16} />
                        </Link>
                        <Link 
                            href={`/inmuebles/${prop.id}/editar`}
                            className="p-2 text-gray-400 hover:text-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/10 rounded-lg transition-colors" 
                            title="Editar"
                        >
                            <Edit2 size={16} />
                        </Link>
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <MoreVertical size={16} />
                        </button>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
      </div>
      
      {/* Pagination Footer */}
      {!loading && filteredProperties.length > 0 && (
        <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between text-sm text-gray-500">
            <div>Mostrando {filteredProperties.length} resultados</div>
            <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">Anterior</button>
            <button className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Siguiente</button>
            </div>
        </div>
      )}
    </div>
  );
}
