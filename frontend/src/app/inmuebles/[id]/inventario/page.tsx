"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ClipboardCheck, 
  History, 
  AlertCircle, 
  ArrowRightLeft, 
  ChevronLeft,
  Loader2,
  Plus,
  CheckCircle2,
  LayoutGrid,
  FileText,
  Camera,
  Wrench,
  Clock
} from 'lucide-react';
import { API_URL } from '@/lib/config';
import Link from 'next/link';

export default function PropertyInventoryLifecyclePage() {
  const { id } = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'compare'>('current');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, invRes, tempRes] = await Promise.all([
        fetch(`${API_URL}/properties/${id}`),
        fetch(`${API_URL}/inventory-master/property/${id}`),
        fetch(`${API_URL}/inventory-templates?tenantId=teus-tenant-id`)
      ]);

      if (propRes.ok) setProperty(await propRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (tempRes.ok) setTemplates(await tempRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantiate = async (templateId: string) => {
    try {
      const response = await fetch(`${API_URL}/inventory-master/instantiate/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error instantiating template:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#050505]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-gray-500 animate-pulse">Sincronizando ciclo de vida de inventario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Link href="/inmuebles" className="p-2 glass rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Ciclo de Vida de Inventario
            </h1>
            <p className="text-gray-400 mt-1 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> {property?.title} • {property?.propertyCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(`/inventory-master?propertyId=${id}`)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" /> Iniciar Handover
          </button>
        </div>
      </div>

      {/* Stats / Status Overview */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-[#111] border border-white/5 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Estado Check-in
          </p>
          <p className="text-xl font-bold">{inventory ? 'Completado' : 'Pendiente'}</p>
          <p className="text-[10px] text-gray-600 mt-1">Sincronizado con CRM</p>
        </div>
        <div className="bg-[#111] border border-white/5 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Wrench className="w-3 h-3 text-amber-500" /> Tickets Activos
          </p>
          <p className="text-xl font-bold">3</p>
          <p className="text-[10px] text-gray-600 mt-1">Basado en auditoría física</p>
        </div>
        <div className="bg-[#111] border border-white/5 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <ArrowRightLeft className="w-3 h-3 text-blue-500" /> Última Entrega
          </p>
          <p className="text-xl font-bold">12 Mar 2024</p>
          <p className="text-[10px] text-gray-600 mt-1">Hace 15 días</p>
        </div>
        <div className="bg-[#111] border border-white/5 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-red-500" /> Integridad
          </p>
          <p className="text-xl font-bold">85%</p>
          <p className="text-[10px] text-gray-600 mt-1">Deterioro moderado detectado</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        {[
          { id: 'current', label: 'Estado Actual', icon: LayoutGrid },
          { id: 'compare', label: 'Comparativa (Timeline)', icon: ArrowRightLeft },
          { id: 'history', label: 'Historial de Tickets', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-[#111] text-gray-400 border border-white/5 hover:border-white/10'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {!inventory && templates.length > 0 && (
          <div className="bg-[#111] border border-dashed border-blue-500/30 rounded-3xl p-12 text-center flex flex-col items-center gap-6">
            <div className="p-6 bg-blue-500/10 rounded-full">
              <FileText className="w-12 h-12 text-blue-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">No hay inventario configurado</h3>
              <p className="text-gray-400 max-w-md">
                Selecciona una plantilla base para instanciar el inventario inicial (Check-in) de esta propiedad.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
              {templates.slice(0, 3).map(temp => (
                <button 
                  key={temp.id}
                  onClick={() => handleInstantiate(temp.id)}
                  className="bg-[#1a1a1a] border border-white/5 hover:border-blue-500/50 p-6 rounded-2xl transition-all group"
                >
                  <h4 className="font-bold mb-2 group-hover:text-blue-400 uppercase text-xs tracking-widest">{temp.name}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{temp.description || 'Prototipo estándar'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {inventory && activeTab === 'current' && (
          <div className="grid grid-cols-1 gap-4">
            {inventory.zones.map((zone: any) => (
              <div key={zone.id} className="bg-[#111] border border-white/5 rounded-3xl p-8">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    {zone.name}
                    <span className="text-[10px] font-bold px-2 py-1 bg-white/5 text-gray-500 rounded-lg uppercase tracking-tighter">
                      {zone.items.length} ítems
                    </span>
                  </h3>
                  <button className="text-xs text-blue-400 hover:underline">Ver detalles de zona</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {zone.items.map((item: any) => (
                    <div key={item.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:border-white/10 transition-all">
                      <div className={`p-4 rounded-xl ${
                        item.condition === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.condition === 'GOOD' ? 'bg-blue-500/10 text-blue-500' :
                        item.condition === 'REGULAR' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        <div className="font-black text-xs">{item.condition[0]}</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{item.description || 'Sin notas'}</p>
                      </div>
                      <div className="flex gap-2">
                        {item.evidences?.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                            <Camera className="w-3 h-3" /> {item.evidences.length}
                          </div>
                        )}
                        {item.tickets?.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                            <Wrench className="w-3 h-3" /> 1
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#111] border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Mantenimiento de Grifería - Cocina</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" /> Reportado el 15 Mar 2024 • Ticket #TK-00{i}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg uppercase">Resuelto</span>
                    <p className="text-[10px] text-gray-600 mt-1 italic">Costo: $45.00</p>
                  </div>
                  <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="bg-[#111] rounded-3xl p-12 border border-white/5 flex flex-col items-center justify-center gap-6 opacity-30 select-none">
            <ArrowRightLeft className="w-16 h-16 text-blue-500" />
            <h3 className="text-xl font-bold">Comparativa de Línea de Tiempo</h3>
            <p className="text-sm text-gray-500">Funcionalidad en desarrollo - Próxima Fase 5</p>
          </div>
        )}
      </div>
    </div>
  );
}
