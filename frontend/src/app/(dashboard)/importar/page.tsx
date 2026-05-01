'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, ArrowRight, Save, Play } from 'lucide-react';
import axios from 'axios';
import { TENANT_ID, API_URL } from '@/lib/config';

export default function DataImportWizard() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState('PROPERTY');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);

  // Mock Target Fields for Mapping based on Don IQ Schema
  const targetFields = {
    PROPERTY: ['property_id', 'reference_code', 'address', 'city', 'financials.canon', 'financials.admin', 'insurance_company'],
    OWNER: ['contact_id', 'full_name', 'emails', 'phones', 'tax_regime', 'financial_config'],
    TENANT: ['contact_id', 'full_name', 'emails', 'phones', 'tax_regime', 'financial_config'],
    CONTRACT: ['contract_id', 'property_id', 'tenant_id', 'owner_id', 'start_date', 'end_date']
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // HARDCODED tenantId for demo purposes
      formData.append('tenantId', '11111111-1111-1111-1111-111111111111');
      formData.append('categoryId', categoryId);

      const response = await axios.post(`${API_URL}/data-import/upload`, formData);
      // Filter out null/empty headers from Excel (e.g. merged cells)
      const cleanHeaders = (response.data.headers as (string | null)[]).filter((h): h is string => !!h);
      setHeaders(cleanHeaders);
      setPreviewData(response.data.previewData);
      
      // Auto-mapping logic (basic)
      const autoMap: Record<string, string> = {};
      cleanHeaders.forEach((h: string) => {
        const lowerH = h.toLowerCase();
        if (lowerH.includes('cedula') || lowerH.includes('nit') || lowerH.includes('identificacion')) autoMap[h] = 'contact_id';
        if (lowerH.includes('email') || lowerH.includes('correo')) autoMap[h] = 'emails';
        if (lowerH.includes('canon') || lowerH.includes('arriendo')) autoMap[h] = 'financials.canon';
        if (lowerH.includes('inmueble') || lowerH.includes('codigo') || lowerH.includes('codigo')) autoMap[h] = 'property_id';
        if (lowerH.includes('nombre') || lowerH.includes('arrendatario') || lowerH.includes('propietario')) autoMap[h] = 'full_name';
        if (lowerH.includes('celular') || lowerH.includes('telefono')) autoMap[h] = 'phones';
        if (lowerH.includes('ciudad') || lowerH.includes('city')) autoMap[h] = 'city';
        if (lowerH.includes('direccion') || lowerH.includes('address')) autoMap[h] = 'address';
      });
      setMapping(autoMap);
      
      setStep(2);
    } catch (error: any) {
      console.error('Upload error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Error al cargar archivo: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    try {
      // Step 1: Save the mapping as a reusable template
      const templateRes = await axios.post(`${API_URL}/data-import/templates`, {
        tenantId: TENANT_ID,
        name: `Plantilla ${categoryId} - ${new Date().toLocaleDateString('es-CO')}`,
        categoryId,
        mapping,
      });

      // Step 2: Send file as multipart/form-data — NO Base64, NO 413 error
      const formData = new FormData();
      formData.append('file', file!);
      formData.append('tenantId', TENANT_ID);
      formData.append('templateId', templateRes.data.id);
      formData.append('categoryId', categoryId);
      formData.append('mapping', JSON.stringify(mapping)); // inline override

      const res = await axios.post(`${API_URL}/data-import/execute`, formData);

      setImportStatus(res.data);
      setStep(4);
    } catch (error: any) {
      console.error('Execute error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Error en importación: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Asistente de Importación Don IQ</h1>

      {/* Stepper */}
      <div className="flex items-center mb-8 gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s}
            </div>
            <span className={`font-semibold ${step >= s ? 'text-indigo-600' : 'text-gray-400'}`}>
              {s === 1 ? 'Subir Archivo' : s === 2 ? 'Mapeo' : s === 3 ? 'Validación' : 'Resultado'}
            </span>
            {s !== 4 && <ArrowRight className="w-4 h-4 text-gray-300 ml-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Datos a Importar</label>
            <select 
              value={categoryId} 
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="PROPERTY">Inmuebles</option>
              <option value="OWNER">Propietarios</option>
              <option value="TENANT">Arrendatarios</option>
              <option value="CONTRACT">Contratos</option>
            </select>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:bg-gray-50 transition-colors">
            <UploadCloud className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Arrastra tu archivo .xls o .csv aquí o haz clic para buscar</p>
            <input 
              type="file" 
              accept=".xls,.xlsx,.csv" 
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleUpload} 
              disabled={!file || isLoading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Cargando...' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Mapeo de Columnas</h2>
          <p className="text-gray-500 mb-6">Asocia las columnas de tu Excel con los campos requeridos por Don IQ.</p>
          
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border-b border-gray-200">Columna de Excel</th>
                  <th className="p-3 border-b border-gray-200">Campo Don IQ</th>
                  <th className="p-3 border-b border-gray-200">Estado</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="p-3 font-medium text-gray-700">{h}</td>
                    <td className="p-3">
                      <select 
                        value={mapping[h] || ''}
                        onChange={(e) => setMapping({...mapping, [h]: e.target.value})}
                        className="w-full p-2 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Ignorar columna --</option>
                        {targetFields[categoryId as keyof typeof targetFields].map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      {mapping[h] ? (
                        <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="w-4 h-4" /> Mapeado</span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-gray-400">Ignorado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="text-gray-500 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg">Atrás</button>
            <button 
              onClick={() => setStep(3)} 
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              Continuar a Validación <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Vista Previa de Validación</h2>
          <p className="text-gray-500 mb-6">Revisa cómo se verán los primeros registros importados.</p>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {Object.values(mapping).filter(v => v).map((m, idx) => (
                    <th key={idx} className="p-3 border-b border-gray-200">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    {Object.entries(mapping).filter(([_, v]) => v).map(([sourceKey, targetField], i) => (
                      <td key={i} className="p-3">{String(row[sourceKey] || '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3">
            <Save className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold">Guardar Plantilla</h4>
              <p className="text-sm opacity-90 mt-1">Este mapeo se guardará como plantilla para futuros archivos con la misma estructura.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(2)} className="text-gray-500 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg">Atrás</button>
            <button 
              onClick={handleExecute} 
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Importando...' : 'Ejecutar Importación'} <Play className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && importStatus && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Importación Exitosa</h2>
          <p className="text-gray-600 mb-8">Se han procesado y guardado {importStatus.recordsSaved} registros en Don IQ.</p>
          
          <button 
            onClick={() => { setStep(1); setFile(null); }} 
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700"
          >
            Nueva Importación
          </button>
        </div>
      )}

    </div>
  );
}
