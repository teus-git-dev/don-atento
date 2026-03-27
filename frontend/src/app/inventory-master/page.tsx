"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  MapPin, 
  Camera, 
  Video, 
  Mic, 
  Settings, 
  Droplets, 
  Zap, 
  Flame, 
  Key, 
  CheckCircle2, 
  PlusCircle, 
  ChevronRight, 
  Save,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  X,
  StopCircle,
  Play
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { API_URL, TENANT_ID } from '@/lib/config';

// --- Media Modal Component ---
interface MediaModalProps {
  type: 'IMAGE' | 'VIDEO' | 'VOICE_NOTE';
  onClose: () => void;
  onCapture: (blob: Blob, previewUrl: string) => void;
}

const MediaModal = ({ type, onClose, onCapture }: MediaModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupMedia() {
      try {
        const constraints = {
          video: type === 'IMAGE' || type === 'VIDEO',
          audio: type === 'VIDEO' || type === 'VOICE_NOTE'
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setError("No se pudo acceder a la cámara o micrófono. Por favor verifica los permisos.");
      }
    }
    setupMedia();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [type]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob, URL.createObjectURL(blob));
        onClose();
      }
    }, 'image/jpeg');
  };

  const startRecording = () => {
    if (!stream) return;
    const options = { mimeType: type === 'VIDEO' ? 'video/webm' : 'audio/webm' };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: options.mimeType });
      onCapture(blob, URL.createObjectURL(blob));
      onClose();
    };
    
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden max-w-2xl w-full">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]">
          <h3 className="text-xl font-bold flex items-center gap-2 text-blue-400">
            {type === 'IMAGE' && <Camera className="w-5 h-5" />}
            {type === 'VIDEO' && <Video className="w-5 h-5" />}
            {type === 'VOICE_NOTE' && <Mic className="w-5 h-5" />}
            Capture {type === 'IMAGE' ? 'Fotografía' : type === 'VIDEO' ? 'Video' : 'Nota de Voz'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-8 flex flex-col items-center">
          {error ? (
            <div className="text-red-400 flex flex-col items-center gap-4 py-12">
              <AlertTriangle className="w-12 h-12" />
              <p className="text-center">{error}</p>
            </div>
          ) : (
            <>
              {(type === 'IMAGE' || type === 'VIDEO') && (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video w-full mb-8">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-xs font-bold">REC</span>
                    </div>
                  )}
                </div>
              )}
              
              {type === 'VOICE_NOTE' && (
                <div className="py-20 flex flex-col items-center gap-6">
                  <div className={`p-8 rounded-full bg-blue-500/10 border-2 ${isRecording ? 'border-red-500 animate-pulse' : 'border-blue-500/20'}`}>
                    <Mic className={`w-16 h-16 ${isRecording ? 'text-red-500' : 'text-blue-500'}`} />
                  </div>
                  {isRecording && <div className="text-red-400 font-mono animate-bounce">GRABANDO...</div>}
                </div>
              )}

              <div className="flex gap-4">
                {type === 'IMAGE' && (
                  <button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all scale-110">
                    <Camera className="w-6 h-6" /> Capturar Foto
                  </button>
                )}
                {(type === 'VIDEO' || type === 'VOICE_NOTE') && (
                  !isRecording ? (
                    <button onClick={startRecording} className="bg-red-600 hover:bg-red-700 px-10 py-5 rounded-3xl font-bold flex items-center gap-3 transition-all scale-110 shadow-lg shadow-red-600/30">
                      <Play className="w-6 h-6" /> Empezar Grabación
                    </button>
                  ) : (
                    <button onClick={stopRecording} className="bg-white text-black hover:bg-gray-200 px-10 py-5 rounded-3xl font-bold flex items-center gap-3 transition-all scale-110">
                      <StopCircle className="w-6 h-6" /> Detener y Guardar
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- CSS Helpers ---
const mirrorStyle = `
  .mirror {
    transform: scaleX(-1);
  }
`;

// Icon Mapping
const ITEM_ICONS: Record<string, React.ReactNode> = {
  'Pisos y Paredes': <MapPin />,
  'Techos y Cielorrasos': <Home />,
  'Iluminación y Eléctricos': <Zap />,
  'Carpintería de Madera': <Settings />,
  'Carpintería Metálica': <Settings />,
  'Sanitarios y Grifería': <Droplets />,
};

type Evidence = { type: 'IMAGE' | 'VIDEO' | 'VOICE_NOTE'; url: string };
type InventoryComponent = { id: string; name: string; category: string; condition: string; description: string; quantity?: number; material?: string; evidences: Evidence[] };
type MasterZone = { id: string; name: string; type: string; items: InventoryComponent[] };

const DEFAULT_COMPONENTS: any[] = [];

export default function MasterInventoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isTemplateMode = searchParams.get('mode') === 'template';
  const templateId = searchParams.get('id');
  
  const [propertyId] = useState('TEMP-PROPERTY-ID'); 
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const [zones, setZones] = useState<MasterZone[]>([]);
  
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | 'success' | 'error'>(null);
  const [activeMedia, setActiveMedia] = useState<{ zoneId: string, itemId: string, type: 'IMAGE' | 'VIDEO' | 'VOICE_NOTE' } | null>(null);

  useEffect(() => {
    if (templateId) {
      fetchTemplate(templateId);
    }
  }, [templateId]);

  const fetchTemplate = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/inventory-templates/${id}`);
      const data = await response.json();
      setTemplateName(data.name);
      setTemplateDescription(data.description || '');
      if (data.zones && data.zones.length > 0) {
        setZones(data.zones.map((z: any) => ({
          ...z,
          items: (z.templateItems || []).map((ti: any) => ({
            ...ti,
            evidences: [] // Templates usually don't have evidences, but we keep the structure
          }))
        })));
        setActiveZoneId(data.zones[0].id);
      }
    } catch (err) {
      console.error("Error fetching template:", err);
    }
  };

  const activeZone = zones.find(z => z.id === activeZoneId) || null;

  const addZone = (type: string) => {
    const count = zones.filter(z => z.type === type).length + 1;
    const typeNames: Record<string, string> = {
      'ZONAS_PRIVADAS': 'Habitación',
      'ZONAS_DE_SERVICIO': 'Baño',
      'EXTERIORES': 'Balcón/Terraza',
      'ZONAS_COMUNES': 'Pasillo/Estancia'
    };
    
    const newZone: MasterZone = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${typeNames[type]} ${count}`,
      type: type as any,
      items: DEFAULT_COMPONENTS.map(c => ({ 
        ...c, 
        id: Math.random().toString(36).substr(2, 9), 
        evidences: [] 
      }))
    };
    setZones([...zones, newZone]);
    setActiveZoneId(newZone.id);
  };

  const removeZone = (id: string) => {
    if (zones.length <= 1) return;
    const newZones = zones.filter(z => z.id !== id);
    setZones(newZones);
    if (activeZoneId === id) setActiveZoneId(newZones[0].id);
  };

  const updateItem = (zoneId: string, itemId: string, field: string, value: any) => {
    setZones(zones.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        items: z.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, [field]: value };
        })
      };
    }));
  };

  const addItem = (zoneId: string) => {
    setZones(zones.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        items: [...z.items, {
          id: Math.random().toString(36).substr(2, 9),
          name: "Nuevo Ítem",
          category: "GENERAL",
          condition: "GOOD",
          description: "",
          evidences: []
        }]
      };
    }));
  };

  const removeItem = (zoneId: string, itemId: string) => {
    setZones(zones.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        items: z.items.filter(item => item.id !== itemId)
      };
    }));
  };

  const handleCapture = (zoneId: string, itemId: string, type: 'IMAGE' | 'VIDEO' | 'VOICE_NOTE') => {
    setActiveMedia({ zoneId, itemId, type });
  };

  const uploadMedia = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, `capture_${Date.now()}.bin`);
    
    try {
      const response = await fetch(`${API_URL}/inventory-master/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      return data.url; // e.g., /uploads/file-123.jpg
    } catch (err) {
      console.error("Error uploading media:", err);
      return null;
    }
  };

  const onMediaCaptured = async (blob: Blob, previewUrl: string) => {
    if (!activeMedia) return;
    const { zoneId, itemId, type } = activeMedia;
    
    // First, show a local preview if needed (we already have previewUrl)
    // But for "saved" state, we want the real URL
    const realUrl = await uploadMedia(blob);
    if (!realUrl) {
      alert("Error al subir el archivo. Inténtalo de nuevo.");
      return;
    }

    setZones(zones.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        items: z.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, evidences: [...(item.evidences || []), { type, url: realUrl }] };
        })
      };
    }));
    setActiveMedia(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      if (isTemplateMode && !templateName) {
        alert("Por favor, ingresa un nombre para la plantilla.");
        setIsSaving(false);
        return;
      }

      const endpoint = isTemplateMode 
        ? (templateId ? `${API_URL}/inventory-templates/${templateId}` : `${API_URL}/inventory-templates`)
        : `${API_URL}/inventory-master/property/${propertyId === 'TEMP-PROPERTY-ID' ? 'demo-property' : propertyId}`;
      
      const method = (isTemplateMode && templateId) ? 'PATCH' : 'POST';

      const body = isTemplateMode 
        ? { name: templateName, description: templateDescription, zones, tenantId: TENANT_ID }
        : { zones };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setSaveStatus('success');
        if (isTemplateMode) {
          setTimeout(() => router.push('/configuracion?tab=inventarios'), 1500);
        } else {
          setTimeout(() => setSaveStatus(null), 3000);
        }
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {isTemplateMode ? 'Constructor de Plantillas' : 'Maestro de Inventarios'}
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            {isTemplateMode ? <Settings className="w-4 h-4" /> : <Home className="w-4 h-4" />}
            {isTemplateMode ? 'Definición de estándares para inmobiliaria' : 'Registro de Estado Físico y Funcional'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {saveStatus === 'success' && (
            <span className="text-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 className="w-5 h-5" /> Guardado Correctamente
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Error al guardar
            </span>
          )}
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className={`bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Guardando...' : 'Finalizar Registro'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Navigation - Sidebar */}
        <div className="col-span-3 space-y-6">
          {['ZONAS_COMUNES', 'ZONAS_PRIVADAS', 'ZONAS_DE_SERVICIO', 'EXTERIORES'].map((type) => (
            <div key={type} className="bg-[#111] rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {type.replace('_', ' ')}
                </h3>
                <button 
                  onClick={() => addZone(type)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  title="Agregar estancia"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {zones.filter(z => z.type === type).map((zone) => (
                  <div key={zone.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => setActiveZoneId(zone.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-xl flex justify-between items-center transition-all ${
                        activeZoneId === zone.id 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : 'text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{zone.name}</span>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${activeZoneId === zone.id ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                    <button 
                      onClick={() => removeZone(zone.id)}
                      className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="col-span-9 space-y-8">
          {isTemplateMode && (
            <div className="bg-[#111] rounded-3xl p-8 border border-white/10 mb-8 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 tracking-widest">Nombre de la Plantilla</label>
                <input 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ej. Apartamento Estándar 3 Hab"
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500/50 transition-all text-lg font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 tracking-widest">Descripción (Opcional)</label>
                <textarea 
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe brevemente el propósito de esta plantilla..."
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                  rows={2}
                />
              </div>
            </div>
          )}

          {activeZone ? (
            <>
              {/* Active Area Banner */}
              <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-3xl p-8 border border-white/10 backdrop-blur-xl flex justify-between items-center">
                <div>
                  <input 
                    value={activeZone.name}
                    onChange={(e) => {
                      setZones(zones.map(z => z.id === activeZoneId ? { ...z, name: e.target.value } : z));
                    }}
                    className="text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                  />
                  <p className="text-blue-300">Registro detallado de infraestructura y acabados</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                  <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Zona ID</span>
                  <p className="font-mono text-blue-400 text-sm">{activeZone.id}</p>
                </div>
              </div>

              {/* Component Assessment Cards */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {activeZone.items.map((item) => (
                  <div key={item.id} className="bg-[#111] rounded-3xl p-6 border border-white/5 hover:border-white/20 transition-all group relative">
                    <button 
                      onClick={() => removeItem(activeZone.id, item.id)}
                      className="absolute top-4 right-4 p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-white/5 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        {ITEM_ICONS[item.name] || <Settings />}
                      </div>
                      <div className="flex gap-2">
                        {!isTemplateMode && (
                          <>
                            <button 
                              onClick={() => handleCapture(activeZone.id, item.id, 'IMAGE')}
                              className={`p-2 rounded-lg transition-all ${
                                item.evidences?.some((e: any) => e.type === 'IMAGE') 
                                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' 
                                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
                              }`}
                              title={item.evidences?.some((e: any) => e.type === 'IMAGE') ? "Foto Capturada" : "Tomar Foto"}
                            >
                              <Camera className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleCapture(activeZone.id, item.id, 'VIDEO')}
                              className={`p-2 rounded-lg transition-all ${
                                item.evidences?.some((e: any) => e.type === 'VIDEO') 
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
                              }`}
                              title={item.evidences?.some((e: any) => e.type === 'VIDEO') ? "Video Capturado" : "Grabar Video"}
                            >
                              <Video className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleCapture(activeZone.id, item.id, 'VOICE_NOTE')}
                              className={`p-2 rounded-lg transition-all ${
                                item.evidences?.some((e: any) => e.type === 'VOICE_NOTE') 
                                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50' 
                                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
                              }`}
                              title={item.evidences?.some((e: any) => e.type === 'VOICE_NOTE') ? "Audio Capturado" : "Grabar Audio"}
                            >
                              <Mic className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <input 
                      value={item.name}
                      onChange={(e) => updateItem(activeZone.id, item.id, 'name', e.target.value)}
                      className="text-xl font-bold mb-4 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                    />
                    
                    <div className="space-y-4">
                      {isTemplateMode ? (
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Categoría del Item</label>
                          <select 
                            value={item.category}
                            onChange={(e) => updateItem(activeZone.id, item.id, 'category', e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 text-white"
                          >
                            <option value="GENERAL">General</option>
                            <option value="KITCHEN">Cocina</option>
                            <option value="BATHROOM">Baño</option>
                            <option value="LIVING_ROOM">Sala / Comedor</option>
                            <option value="BEDROOM">Habitación</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Cantidad</label>
                              <input 
                                type="number"
                                value={item.quantity || 1}
                                onChange={(e) => updateItem(activeZone.id, item.id, 'quantity', parseInt(e.target.value))}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                              />
                            </div>
                            <div className="flex-[2]">
                              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Material / Marca</label>
                              <input 
                                value={item.material || ''}
                                onChange={(e) => updateItem(activeZone.id, item.id, 'material', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                placeholder="Ej. Madera, Cerámica..."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Estado del Ítem</label>
                            <div className="flex gap-2">
                              {[
                                { id: 'EXCELLENT', label: 'Excelente', color: 'bg-emerald-500' },
                                { id: 'GOOD', label: 'Bueno', color: 'bg-blue-500' },
                                { id: 'REGULAR', label: 'Regular', color: 'bg-amber-500' },
                                { id: 'BAD', label: 'Malo', color: 'bg-red-500' }
                              ].map(s => (
                                <button 
                                  key={s.id} 
                                  onClick={() => updateItem(activeZone.id, item.id, 'condition', s.id)}
                                  className={`flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all ${
                                    item.condition === s.id 
                                      ? `${s.color} border-white/20 text-white shadow-lg` 
                                      : 'border-white/5 text-gray-500 hover:bg-white/5'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">
                          {isTemplateMode ? 'Especificaciones Sugeridas' : 'Observaciones / Comentarios'}
                        </label>
                        <textarea 
                          value={item.description}
                          onChange={(e) => updateItem(activeZone.id, item.id, 'description', e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                          placeholder={isTemplateMode ? "Ej. Paredes con pintura blanca lavable" : "Escribe observaciones detalladas..."}
                          rows={2}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Item Button */}
              <button 
                onClick={() => addItem(activeZone.id)}
                className="w-full py-6 border-2 border-dashed border-white/5 rounded-[2rem] text-gray-500 hover:text-blue-400 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 mb-8 group"
              >
                <PlusCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-bold uppercase tracking-widest text-xs">Agregar Item a {activeZone.name}</span>
              </button>

              {/* AI Integration Tip */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex gap-4">
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500 h-fit">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-500 mb-1">Entrenamiento de Cerebro IA</h4>
                  <p className="text-sm text-amber-200/70">
                    Al registrar materiales de alta gama en esta zona, la IA priorizará técnicos certificados 
                    para futuros tickets de mantenimiento en esta propiedad.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-40 bg-white/5 border border-dashed border-white/10 rounded-[3rem] text-gray-500">
               <Home size={64} className="opacity-20 mb-4" />
               <p className="text-lg font-bold uppercase tracking-widest font-mono">No hay estancias seleccionadas</p>
               <p className="text-sm">Agrega o selecciona una zona en el panel izquierdo para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      <style>{mirrorStyle}</style>

      {activeMedia && (
        <MediaModal 
          type={activeMedia.type} 
          onClose={() => setActiveMedia(null)} 
          onCapture={onMediaCaptured}
        />
      )}
    </div>
  );
}
