"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Eye, 
  Power, 
  PowerOff,
  Search,
  ChevronRight,
  FileText,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';

export default function InventoryTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Mock tenantId for demo
      const response = await fetch(`${API_URL}/inventory-templates?tenantId=teus-tenant-id`);
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await fetch(`${API_URL}/inventory-templates/${id}/toggle-status`, { method: 'PATCH' });
      fetchTemplates();
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta plantilla?")) return;
    try {
      await fetch(`${API_URL}/inventory-templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Plantillas de Inventario
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Gestión de modelos estándar por inmobiliaria
          </p>
        </div>
        <Link 
          href="/inventory-master?mode=template"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" /> Nueva Plantilla
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input 
          placeholder="Buscar plantillas..." 
          className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/30 transition-all text-sm"
        />
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex justify-center py-20 flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-gray-500 animate-pulse">Cargando plantillas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-[#111] border border-white/5 rounded-3xl p-6 hover:border-white/20 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${template.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => toggleStatus(template.id)}
                    className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${template.status === 'ACTIVE' ? 'text-amber-500' : 'text-emerald-500'}`}
                    title={template.status === 'ACTIVE' ? "Desactivar" : "Activar"}
                  >
                    {template.status === 'ACTIVE' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 text-red-500 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                {template.name}
              </h3>
              <p className="text-gray-500 text-sm mb-6 line-clamp-2">
                {template.description || "Sin descripción configurada."}
              </p>

              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {template.status === 'ACTIVE' ? (
                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1 uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Activa
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 bg-white/10 text-gray-500 rounded-lg flex items-center gap-1 uppercase">
                      <XCircle className="w-3 h-3" /> Inactiva
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600 font-mono">
                    {template.zones?.length || 0} Zonas
                  </span>
                </div>
                <Link 
                  href={`/inventory-master?mode=template&id=${template.id}`}
                  className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-white/10 flex flex-col items-center gap-4 text-gray-500">
              <FileText className="w-12 h-12 opacity-20" />
              <p>No se encontraron plantillas. Crea la primera para empezar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
