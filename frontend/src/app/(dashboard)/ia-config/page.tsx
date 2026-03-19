"use client";

import { useState, useEffect } from "react";
import { 
  BotMessageSquare, 
  Save, 
  BookOpen, 
  MessageCircle, 
  ShieldAlert, 
  Plus, 
  Trash2,
  Sparkles
} from "lucide-react";
import { tenantService } from "@/services/tenantService";
import { brainService, BrandBrain } from "@/services/brainService";

export default function IAConfigPage() {
  const currentTenant = tenantService.getCurrentTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personality' | 'policies' | 'faq'>('personality');
  
  const [brain, setBrain] = useState<BrandBrain>({
    tone: 'PROFESSIONAL',
    policies: '',
    faq: [{ question: '', answer: '' }],
    responseRules: ''
  });

  useEffect(() => {
    const fetchBrain = async () => {
      try {
        const data = await brainService.getBrain(currentTenant.id);
        if (data) {
          setBrain({
            ...data,
            faq: data.faq || [{ question: '', answer: '' }]
          });
        }
      } catch (error) {
        console.error("Error fetching brain:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrain();
  }, [currentTenant.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await brainService.updateBrain(currentTenant.id, brain);
      alert("Cerebro de Marca actualizado con éxito");
    } catch (error) {
      console.error("Error saving brain:", error);
      alert("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const addFaq = () => {
    setBrain({ ...brain, faq: [...(brain.faq || []), { question: '', answer: '' }] });
  };

  const removeFaq = (index: number) => {
    const newFaq = [...(brain.faq || [])];
    newFaq.splice(index, 1);
    setBrain({ ...brain, faq: newFaq });
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaq = [...(brain.faq || [])];
    newFaq[index][field] = value;
    setBrain({ ...brain, faq: newFaq });
  };

  if (loading) return <div className="p-8 text-gray-400 font-mono">Cargando Inteligencia...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BotMessageSquare className="text-[var(--color-neon-cyan)] shadow-[0_0_15px_rgba(0,255,255,0.5)]" /> 
            Cerebro de Marca
          </h1>
          <p className="text-gray-400 mt-1">Configura y entrena la personalidad de tu inmobiliaria</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)] disabled:opacity-50"
        >
          <Save size={20} /> {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <TabButton 
            active={activeTab === 'personality'} 
            onClick={() => setActiveTab('personality')}
            icon={<Sparkles size={18} />}
            label="Personalidad"
          />
          <TabButton 
            active={activeTab === 'policies'} 
            onClick={() => setActiveTab('policies')}
            icon={<ShieldAlert size={18} />}
            label="Políticas y Reglas"
          />
          <TabButton 
            active={activeTab === 'faq'} 
            onClick={() => setActiveTab('faq')}
            icon={<BookOpen size={18} />}
            label="Base de Conocimientos"
          />
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 glass rounded-[2rem] p-8 border border-white/5 min-h-[500px]">
          {activeTab === 'personality' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <MessageCircle className="text-blue-400" /> Tono de Comunicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ToneCard 
                  selected={brain.tone === 'PROFESSIONAL'} 
                  onClick={() => setBrain({...brain, tone: 'PROFESSIONAL'})}
                  title="Profesional" 
                  desc="Corporativo, cortés y muy formal."
                />
                <ToneCard 
                  selected={brain.tone === 'FRIENDLY'} 
                  onClick={() => setBrain({...brain, tone: 'FRIENDLY'})}
                  title="Cercano" 
                  desc="Amigable, empático y servicial."
                />
                <ToneCard 
                  selected={brain.tone === 'SALES'} 
                  onClick={() => setBrain({...brain, tone: 'SALES'})}
                  title="Comercial" 
                  desc="Persuasivo, dinámico y enfocado a ventas."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest text-[10px]">Instrucciones de Respuesta</label>
                <textarea 
                  value={brain.responseRules || ''}
                  onChange={(e) => setBrain({...brain, responseRules: e.target.value})}
                  placeholder="Ej: Saluda siempre con el nombre del cliente. Si preguntan por precios, redirige a una cita..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <ShieldAlert className="text-red-400" /> Políticas de la Inmobiliaria
              </h3>
              <p className="text-gray-400 text-sm italic">Define las 'verdades' de tu negocio que la IA debe respetar estrictamente.</p>
              <textarea 
                value={brain.policies || ''}
                onChange={(e) => setBrain({...brain, policies: e.target.value})}
                placeholder="Ej: No se aceptan mascotas en edificios VIP. El depósito es de 2 meses..."
                className="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-6 focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all text-sm leading-relaxed"
              />
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <BookOpen className="text-green-400" /> Preguntas Frecuentes
                </h3>
                <button 
                  onClick={addFaq}
                  className="flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-all font-mono"
                >
                  <Plus size={14} /> AGREGAR FAQ
                </button>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {brain.faq?.map((item, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative group">
                    <button 
                      onClick={() => removeFaq(index)}
                      className="absolute top-4 right-4 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={item.question}
                        onChange={(e) => updateFaq(index, 'question', e.target.value)}
                        placeholder="Pregunta (ej: ¿Cómo agendo una visita?)"
                        className="w-full bg-transparent border-b border-white/10 pb-2 focus:outline-none focus:border-[var(--color-neon-cyan)]/30 text-white font-medium"
                      />
                      <textarea 
                        value={item.answer}
                        onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                        placeholder="Respuesta de la IA..."
                        className="w-full bg-transparent text-sm text-gray-400 focus:outline-none h-16 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-medium ${
        active 
          ? "bg-[var(--color-neon-cyan)]/10 text-[var(--color-neon-cyan)] border border-[var(--color-neon-cyan)]/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]" 
          : "text-gray-400 hover:bg-white/5 border border-transparent"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ToneCard({ selected, onClick, title, desc }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
        selected 
          ? "bg-[var(--color-neon-cyan)]/5 border-[var(--color-neon-cyan)]/50 shadow-[0_0_15px_rgba(0,255,255,0.1)]" 
          : "bg-white/5 border-white/5 hover:border-white/20"
      }`}
    >
      <p className={`font-bold mb-1 ${selected ? "text-[var(--color-neon-cyan)]" : "text-white"}`}>{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}
