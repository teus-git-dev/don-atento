"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Search, Building2, UserCircle, MapPin, Zap, Bot, Image as ImageIcon, Briefcase } from "lucide-react";

export default function NuevoTicketPage() {
  const [tenantSearch, setTenantSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Mock data para simulación de búsqueda integrando Inquilino -> Inmueble -> Ubicación
  const mockTenants = [
    { id: "T-01", name: "Camilo Rodríguez", doc: "CC 1.023.456.789", property: "Apto 402 - Torre B", location: "Cali, Valle del Cauca, COL" },
    { id: "T-02", name: "Teus Prime S.A.S", doc: "NIT 901.234.567-8", property: "Local Comercial Centro", location: "Bogotá, Cundinamarca, COL" }
  ];

  const handleSearch = (val: string) => {
    setTenantSearch(val);
    if(val.length > 2) {
      const found = mockTenants.find(t => t.name.toLowerCase().includes(val.toLowerCase()) || t.doc.includes(val));
      if(found && !selectedTenant) {
        // Auto-select for demo purposes after typing
        setTimeout(() => setSelectedTenant(found), 500);
      }
    } else {
      setSelectedTenant(null);
    }
  };

  const simulateAiAnalysis = () => {
    setIsAiAnalyzing(true);
    setTimeout(() => {
      setAiSuggestions([
        { id: 1, role: "Plomero Especialista", confidence: 94, reason: "Detección visual de fuga en tubería de PVC de 1/2'' conectada a calentador de paso." },
        { id: 2, role: "Técnico Gasista", confidence: 68, reason: "Recomendado preventivamente por estar cerca del ducto de extracción." }
      ]);
      setIsAiAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tickets" className="p-2 glass rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Crear Ticket de Mantenimiento</h1>
            <p className="text-sm text-gray-400">Captura un nuevo requerimiento con asistencia inteligente</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/tickets" className="px-5 py-2.5 glass rounded-xl text-sm font-medium hover:bg-white/5 transition-colors text-gray-300">
            Cancelar
          </Link>
          <button className="bg-[var(--color-neon-blue)] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,112,243,0.4)] flex items-center gap-2">
            <Send size={16} />
            Crear Ticket Activo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - User/Property Identification */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/5">
            <h2 className="text-lg font-medium flex items-center gap-2 mb-6 text-white border-b border-white/10 pb-3">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono text-[var(--color-neon-blue)]">1</span>
              Identificación de Origen
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Buscar Inquilino o Propiedad</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neon-blue)]" size={18} />
                  <input 
                    type="text" 
                    value={tenantSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Nombre, CC, NIT o Nombre del Inmueble..." 
                    className="w-full bg-black/40 border border-[var(--color-neon-blue)]/30 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-[var(--color-neon-blue)] focus:outline-none transition-colors text-white shadow-[0_0_10px_rgba(0,112,243,0.1)]" 
                  />
                  {tenantSearch.length > 0 && !selectedTenant && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 animate-pulse">Buscando...</div>
                  )}
                </div>
              </div>

              {selectedTenant && (
                <div className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/5 space-y-3 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <UserCircle className="text-green-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-white">{selectedTenant.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{selectedTenant.doc}</p>
                    </div>
                  </div>
                  <div className="h-px w-full bg-white/5"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex gap-2 items-start">
                      <Building2 className="text-gray-400 mt-0.5 shrink-0" size={14} />
                      <div>
                        <p className="text-[10px] uppercase text-gray-500 font-medium">Inmueble Vinculado</p>
                        <p className="text-sm text-gray-200">{selectedTenant.property}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <MapPin className="text-gray-400 mt-0.5 shrink-0" size={14} />
                      <div>
                        <p className="text-[10px] uppercase text-gray-500 font-medium">Ubicación Autocompletada</p>
                        <p className="text-sm text-[var(--color-neon-blue)]">{selectedTenant.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/5">
            <h2 className="text-lg font-medium flex items-center gap-2 mb-6 text-white border-b border-white/10 pb-3">
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono text-[var(--color-neon-blue)]">2</span>
              Detalle del Requerimiento
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Título Breve</label>
                <input type="text" placeholder="Ej. Fuga de agua en lavaplatos" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-colors text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Descripción Detallada</label>
                <textarea rows={4} placeholder="Describa el problema reportado..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[var(--color-neon-blue)]/50 focus:outline-none transition-colors text-white resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - AI Intelligence */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
            {/* Visual AI glow back */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-neon-purple)] rounded-full blur-[80px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" />

            <h2 className="text-lg font-medium flex items-center justify-between mb-4 text-white border-b border-white/10 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono text-[var(--color-neon-purple)]">3</span>
                Asignación Cognitiva (IA)
              </div>
              <Bot className="text-[var(--color-neon-purple)]" size={20} />
            </h2>
            
            <p className="text-sm text-gray-400 mb-4 relative z-10">
              Sube evidencia fotográfica o en video del daño para que la Inteligencia Artificial analice el problema y sugiera al técnico especializado óptimo, en lugar de asignarlo manualmente.
            </p>

            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-[var(--color-neon-purple)]/50 hover:bg-[var(--color-neon-purple)]/5 transition-all cursor-pointer mb-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <ImageIcon className="text-gray-400" size={24} />
              </div>
              <p className="text-sm text-gray-300 font-medium">Arrastra archivo multimedia aquí</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Soporta JPG, PNG, MP4</p>
              
              <button 
                type="button"
                onClick={simulateAiAnalysis}
                disabled={isAiAnalyzing}
                className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isAiAnalyzing ? (
                  <><span className="w-3 h-3 rounded-full bg-[var(--color-neon-purple)] animate-ping inline-block"></span> Analizando Contexto Visual...</>
                ) : (
                  <><Zap size={14} className="text-[var(--color-neon-purple)]" /> Simular Carga y Análisis IA</>
                )}
              </button>
            </div>

            {/* AI Suggestions Results */}
            {aiSuggestions && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 relative z-10">
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">Especialistas Sugeridos por IA:</h3>
                
                {aiSuggestions.map((sug: any, index: number) => (
                  <div key={sug.id} className={`p-4 rounded-xl border flex gap-4 ${index === 0 ? 'bg-[var(--color-neon-purple)]/10 border-[var(--color-neon-purple)]/30 shadow-[0_0_15px_rgba(138,43,226,0.15)]' : 'bg-black/20 border-white/5'}`}>
                    <div className="mt-1">
                      <Briefcase className={index === 0 ? 'text-[var(--color-neon-purple)]' : 'text-gray-500'} size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${index === 0 ? 'text-white' : 'text-gray-300'}`}>{sug.role}</p>
                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                           <span className="text-[10px] text-gray-400 font-mono">Confianza:</span>
                           <span className={`text-xs font-bold ${index === 0 ? 'text-green-400' : 'text-yellow-400'}`}>{sug.confidence}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{sug.reason}</p>
                      
                      {index === 0 && (
                        <div className="mt-3">
                          <button type="button" className="text-xs font-medium bg-[var(--color-neon-purple)] text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 transition-colors shadow-[0_0_10px_rgba(138,43,226,0.4)]">
                            Asignar Automáticamente
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
