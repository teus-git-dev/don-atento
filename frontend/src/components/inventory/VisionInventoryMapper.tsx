"use client";

import React, { useState } from 'react';
import { Upload, Camera, CheckCircle, AlertCircle, Loader2, Sparkles, Plus } from 'lucide-react';

interface DetectedAsset {
  name: string;
  category: string;
  condition: string;
  description: string;
  expectedLifespanMonths: number;
}

export default function VisionInventoryMapper({ propertyId }: { propertyId: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedAssets, setDetectedAssets] = useState<DetectedAsset[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const simulateVisionOnboarding = async () => {
    setIsAnalyzing(true);
    // Simulate API call to backend
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockAssets: DetectedAsset[] = [
      {
        name: 'Aire Acondicionado Split',
        category: 'BEDROOM',
        condition: 'GOOD',
        description: 'Unidad marca Samsung, detectada vía visión artificial.',
        expectedLifespanMonths: 120
      },
      {
        name: 'Estufa de Inducción',
        category: 'KITCHEN',
        condition: 'NEW',
        description: 'Cubierta vitrocerámica de 4 puestos.',
        expectedLifespanMonths: 180
      }
    ];

    setDetectedAssets(mockAssets);
    setIsAnalyzing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));
      simulateVisionOnboarding();
    }
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 p-8 rounded-3xl border border-gray-100 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
            <Sparkles className="text-purple-400" size={20} />
            Atento-Vision Onboarding
          </h3>
          <p className="text-xs text-gray-500">Escaneo inteligente de activos mediante IA.</p>
        </div>
        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Beta v2.0</span>
        </div>
      </div>

      {!previewUrl ? (
        <label className="border-2 border-dashed border-gray-100 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer rounded-2xl h-48 flex flex-col items-center justify-center gap-4 group">
          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
          <div className="p-4 bg-purple-500/20 rounded-full group-hover:scale-110 transition-transform">
            <Camera className="text-purple-400" size={24} />
          </div>
          <p className="text-sm text-gray-500 font-medium">Sube una foto de la propiedad para inventariar</p>
        </label>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 aspect-video bg-gray-50">
            <img src={previewUrl} className="w-full h-full object-cover opacity-60" alt="Vista previa" />
            
            {isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 backdrop-blur-sm">
                <Loader2 className="text-purple-400 animate-spin mb-2" size={32} />
                <span className="text-xs font-mono text-purple-400 animate-pulse">ANALIZANDO ACTIVOS...</span>
              </div>
            )}

            {!isAnalyzing && detectedAssets.map((asset, i) => (
               <div key={i} className={`absolute flex items-center gap-2 px-2 py-1 bg-gray-100 backdrop-blur-md border border-gray-300 rounded-full text-[10px] text-[#1F2937] animate-in zoom-in duration-500`}
                    style={{ top: `${20 + i*20}%`, left: `${30 + i*15}%` }}>
                 <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                 {asset.name}
               </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resultados Sugeridos</span>
                {!isAnalyzing && (
                    <button className="text-[10px] text-purple-400 font-bold hover:underline">Confirmar Todo</button>
                )}
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {isAnalyzing && [1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              ))}
              
              {!isAnalyzing && detectedAssets.map((asset, i) => (
                <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between group hover:border-purple-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                      <Plus size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1F2937]">{asset.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase">{asset.category} • {asset.condition}</p>
                    </div>
                  </div>
                  <CheckCircle className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                </div>
              ))}
            </div>

            {!isAnalyzing && previewUrl && (
                <button onClick={() => { setPreviewUrl(null); setDetectedAssets([]); }} className="w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-[10px] font-bold text-gray-500 uppercase transition-all tracking-widest border border-gray-100">
                    Subir Otra Foto
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
