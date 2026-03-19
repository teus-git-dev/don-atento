"use client";

import { useState } from "react";
import PropertyMasterTable from "@/components/properties/PropertyMasterTable";
import VisionInventoryMapper from "@/components/inventory/VisionInventoryMapper";
import { Sparkles, X } from "lucide-react";

export default function InmueblesPage() {
  const [showVision, setShowVision] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maestro de Inmuebles</h1>
          <p className="text-gray-400 mt-1">Gestión centralizada del portafolio inmobiliario</p>
        </div>
        <button 
          onClick={() => setShowVision(!showVision)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            showVision 
            ? 'bg-white/10 text-white border border-white/20' 
            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
          }`}
        >
          {showVision ? <X size={16} /> : <Sparkles size={16} />}
          {showVision ? 'Cerrar Onboarding' : 'Vision Onboarding'}
        </button>
      </div>

      {showVision && (
        <div className="animate-in fade-in zoom-in duration-300">
          <VisionInventoryMapper propertyId="selected-property-id" />
        </div>
      )}

      <PropertyMasterTable />
    </div>
  );
}
