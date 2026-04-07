import React, { useState } from 'react';
import { X, FileText, CheckCircle2, Upload, User, Building2, Calendar, DollarSign, Shield, Info, ArrowRight } from 'lucide-react';
import { API_URL, TENANT_ID } from '@/lib/config';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: any;
  onSuccess: () => void;
}

export default function ContractFormModal({ isOpen, onClose, prospect, onSuccess }: ContractFormModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(prospect.interestedProperties?.[0]?.id || '');
  const [documentFiles, setDocumentFiles] = useState<Record<string, { url: string, name: string }>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Formato Datos v3
    direccionInmueble: prospect.interestedProperties?.[0]?.address || '',
    agenteEncargado: prospect.assignedAgent ? `${prospect.assignedAgent.firstName} ${prospect.assignedAgent.lastName}` : '',
    valorCanonSinAdmon: '',
    valorAdmon: '',
    valorTotal: '',
    abonoSeparacion: 'NO',
    pagoEstudio: 'SI',
    vigenciaContrato: '1 AÑO',
    tipoContrato: 'Vivienda',
    fechaEntrega: '',
    fechaInicioContrato: '',
    fechaMudanza: '',
    nombreResidente: `${prospect.firstName} ${prospect.lastName || ''}`,
    tiempoGracia: 'NO',
    tipoRegimenArrendatario: 'NO',
    objetoSocial: '',
    aumentoCanonIpcPuntos: '',
    retefuenteIncluida: 'NO',
    fechaFirmaContrato: '',
    codigoSimi: '',
    observaciones: '',
    responsableAseo: '',
    captador: '',
    comision: '',
    
    // Lista de Chequeo v3 (Checklist)
    hasCertificadoTradicion: false,
    hasEscrituraPublica: false,
    hasFacturaGases: false,
    hasFacturaServicios: false,
    hasFacturaAdmon: false,
    hasCedulaPropietarios: false,
    hasCertificacionBancaria: false,
  });

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (itemId: string, file: File) => {
    setUploadingDoc(itemId);
    const uploadData = new FormData();
    uploadData.append('file', file);
    
    try {
      const response = await fetch(`${API_URL}/crm/upload`, {
        method: 'POST',
        body: uploadData,
      });
      const data = await response.json();
      if (data.url) {
        setDocumentFiles(prev => ({ ...prev, [itemId]: { url: data.url, name: data.name } }));
        setFormData(prev => ({ ...prev, [itemId]: true }));
      } else {
        alert("Error al subir el archivo.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error de conexión al subir el archivo.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async () => {
    if (!propertyId) {
      alert("Por favor, selecciona un inmueble para continuar.");
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        documents: documentFiles
      };

      const response = await fetch(`${API_URL}/crm/prospects/${prospect.id}/contract?propertyId=${propertyId}&tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) throw new Error('Error al iniciar el proceso de contrato');
      
      const request = await response.json();
      
      // Trigger AI draft generation
      const draftRes = await fetch(`${API_URL}/crm/contracts/${request.id}/generate-draft`, {
        method: 'POST',
      });

      if (draftRes.ok) {
        const updatedRequest = await draftRes.json();
        setGeneratedDraft(updatedRequest.aiDraft);
        setStep(3);
      } else {
        alert("Contrato iniciado, pero hubo un problema generando el borrador automático.");
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4 animate-in slide-in-from-right duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Inmueble</label>
          {!prospect.interestedProperties || prospect.interestedProperties.length === 0 ? (
            <div className="text-[10px] text-amber-500 font-mono bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 italic">
              ❌ Este prospecto aún no tiene inmuebles asignados.
            </div>
          ) : (
            <select 
              name="propertyId" 
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
            >
              <option value="" className="bg-slate-900">Selecciona un inmueble...</option>
              {prospect.interestedProperties?.map((p: any) => (
                <option key={p.id} value={p.id} className="bg-slate-900">{p.title} - {p.propertyCode}</option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Tipo de Contrato</label>
          <select 
            name="tipoContrato" 
            value={formData.tipoContrato}
            onChange={handleInputChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
          >
            <option value="Vivienda" className="bg-slate-900">Vivienda</option>
            <option value="Comercial" className="bg-slate-900">Comercial</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Valor Canon (Sin Admon)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              name="valorCanonSinAdmon" 
              placeholder="4,500,000"
              value={formData.valorCanonSinAdmon}
              onChange={handleInputChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Inicia Contrato</label>
          <input 
            type="date"
            name="fechaInicioContrato" 
            value={formData.fechaInicioContrato}
            onChange={handleInputChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-gray-400">Nombre del Residente</label>
        <input 
          name="nombreResidente" 
          value={formData.nombreResidente}
          onChange={handleInputChange}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-gray-400">Observaciones (Alistamiento/Empalme)</label>
        <textarea 
          name="observaciones"
          rows={3}
          value={formData.observaciones}
          onChange={handleInputChange}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition-all resize-none"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-in slide-in-from-right duration-300">
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 text-cyan-400 mb-2">
          <Shield size={18} />
          <h4 className="text-sm font-bold uppercase tracking-wider">Lista de Chequeo V3</h4>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-mono">
          Verifica que se hayan recolectado todos los documentos para el ingreso a facturación en SIMI.
        </p>
      </div>

      <div className="space-y-2">
        {[
          { id: 'hasCertificadoTradicion', label: 'Certificado de Libertad y Tradición' },
          { id: 'hasEscrituraPublica', label: 'Escritura Pública' },
          { id: 'hasFacturaGases', label: 'Factura Gases de Occidente' },
          { id: 'hasFacturaServicios', label: 'Factura Servicios Públicos' },
          { id: 'hasFacturaAdmon', label: 'Factura Administración' },
          { id: 'hasCedulaPropietarios', label: 'Cédula de Propietarios' },
          { id: 'hasCertificacionBancaria', label: 'Certificación Bancaria' },
        ].map((item) => (
          <div key={item.id} className="relative group">
            <label 
              htmlFor={item.id}
              className={`flex items-center justify-between p-4 bg-white/5 border ${documentFiles[item.id] ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5'} rounded-2xl hover:bg-white/10 transition-all cursor-pointer`}
            >
              <div className="flex flex-col">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${documentFiles[item.id] ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {item.label}
                </span>
                {documentFiles[item.id] && (
                  <span className="text-[9px] text-gray-500 font-mono mt-1">
                    {documentFiles[item.id].name}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {uploadingDoc === item.id ? (
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                ) : documentFiles[item.id] ? (
                  <div className="w-6 h-6 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                    <CheckCircle2 size={14} />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-white transition-all">
                    <Upload size={14} />
                  </div>
                )}
                
                <input 
                  id={item.id}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(item.id, file);
                  }}
                />
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4 animate-in slide-in-from-right duration-300">
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 text-emerald-400 mb-2">
          <CheckCircle2 size={18} />
          <h4 className="text-sm font-bold uppercase tracking-wider">Borrador Generado Exitosamente</h4>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-mono">
          Este documento ha sido redactado por la AI bajo los parámetros legales V3. Revísalo antes de finalizar.
        </p>
      </div>

      <div className="relative group">
        <textarea 
          readOnly
          value={generatedDraft || ''}
          rows={12}
          className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none custom-scrollbar whitespace-pre-wrap"
        />
        <button 
          onClick={() => {
            if (generatedDraft) {
              navigator.clipboard.writeText(generatedDraft);
              alert("Copiado al portapapeles");
            }
          }}
          className="absolute right-4 top-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        >
          <FileText size={14} />
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return renderStep1();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="glass w-full max-w-xl border border-white/10 rounded-[2.5rem] overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-300 transition-all">
        <div className="p-8 border-b border-white/5 relative">
          <button 
            onClick={onClose}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Fábrica de Contratos</h2>
              <p className="text-xs text-gray-400 font-mono">PROCESO V3 • NATALIA TORO / ADRIANA LÓPEZ</p>
            </div>
          </div>
        </div>

        <div className="p-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className={`flex flex-col items-center gap-2 ${step === 1 ? 'text-cyan-400' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${step === 1 ? 'border-cyan-400' : 'border-gray-800'}`}>1</div>
              <span className="text-[10px] font-black uppercase tracking-widest">Datos V3</span>
            </div>
            <div className="w-12 h-px bg-gray-800" />
            <div className={`flex flex-col items-center gap-2 ${step === 2 ? 'text-cyan-400' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${step === 2 ? 'border-cyan-400' : 'border-gray-800'}`}>2</div>
              <span className="text-[10px] font-black uppercase tracking-widest">Chequeo</span>
            </div>
            <div className="w-12 h-px bg-gray-800" />
            <div className={`flex flex-col items-center gap-2 ${step === 3 ? 'text-emerald-400' : 'text-gray-600'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${step === 3 ? 'border-emerald-400' : 'border-gray-800'}`}>3</div>
              <span className="text-[10px] font-black uppercase tracking-widest">Borrador</span>
            </div>
          </div>

          {renderCurrentStep()}
        </div>

        <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
          {(step === 2) && (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 px-6 py-3 border border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-widest text-white rounded-2xl transition-all"
            >
              Atrás
            </button>
          )}
          
          {step === 1 && (
            <button 
              onClick={() => {
                if (!propertyId) { alert("Selecciona un inmueble"); return; }
                setStep(2);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/80 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_15px_rgba(45,185,255,0.2)]"
            >
              Siguiente <ArrowRight size={14} />
            </button>
          )}

          {step === 2 && (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(103,232,249,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generando...' : 'Borrar contrato'} <CheckCircle2 size={16} />
            </button>
          )}

          {step === 3 && (
            <button 
              onClick={() => { onSuccess(); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Finalizar Proceso <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
