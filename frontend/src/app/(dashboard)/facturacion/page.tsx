"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, CheckCircle2, Save, Receipt, Building2, Building, Trash2 } from "lucide-react";
import { invoicingService } from "@/services/invoicingService";
import { accountingService } from "@/services/accountingService";

export default function FacturacionPage() {
  const [activeTab, setActiveTab] = useState<'EMISION' | 'CATALOGO' | 'RESOLUCIONES'>('EMISION');
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ zipKey?: string, message?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data States
  const [billingItems, setBillingItems] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [pucAccounts, setPucAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Forms
  const [newItemForm, setNewItemForm] = useState({ code: '', name: '', taxRate: 19, accountId: '' });
  const [newResForm, setNewResForm] = useState({ prefix: '', resolutionNumber: '', startRange: '', endRange: '', startDate: '', endDate: '', technicalKey: '' });
  
  const [invoiceForm, setInvoiceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    lines: [ { itemId: '', quantity: 1, unitPrice: 0, description: '' } ]
  });

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [items, resols, puc] = await Promise.all([
        invoicingService.getBillingItems().catch(() => []),
        invoicingService.getResolutions().catch(() => []),
        accountingService.getPuc().catch(() => [])
      ]);
      setBillingItems(items);
      setResolutions(resols);
      
      // Flatten PUC for combo boxes
      const flatPuc: any[] = [];
      const flatten = (nodes: any[]) => {
        nodes.forEach(n => {
          flatPuc.push(n);
          if (n.children) flatten(n.children);
        });
      };
      if (puc && Array.isArray(puc)) flatten(puc);
      setPucAccounts(flatPuc);
      
    } catch (error) {
      console.error("Error fetching invoicing data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    if (!newItemForm.code || !newItemForm.name || !newItemForm.accountId) return alert('Completa los campos');
    try {
      await invoicingService.createBillingItem(newItemForm);
      setNewItemForm({ code: '', name: '', taxRate: 19, accountId: '' });
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
       alert(e.message);
    }
  };

  const handleCreateResolution = async () => {
    if (!newResForm.resolutionNumber) return alert('Número requerido');
    try {
      await invoicingService.createResolution({
        ...newResForm,
        startRange: Number(newResForm.startRange) || 0,
        endRange: Number(newResForm.endRange) || 0,
        startDate: new Date(newResForm.startDate).toISOString(),
        endDate: new Date(newResForm.endDate).toISOString()
      });
      setNewResForm({ prefix: '', resolutionNumber: '', startRange: '', endRange: '', startDate: '', endDate: '', technicalKey: '' });
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Invoice helpers
  const addInvoiceLine = () => setInvoiceForm(prev => ({ ...prev, lines: [...prev.lines, { itemId: '', quantity: 1, unitPrice: 0, description: '' }] }));
  const updateInvoiceLine = (index: number, field: string, value: any) => {
    const lines = [...invoiceForm.lines];
    lines[index] = { ...lines[index], [field]: value };
    setInvoiceForm({ ...invoiceForm, lines });
  };
  const removeInvoiceLine = (index: number) => {
    if (invoiceForm.lines.length <= 1) return;
    const lines = [...invoiceForm.lines];
    lines.splice(index, 1);
    setInvoiceForm({ ...invoiceForm, lines });
  };

  // Calculations
  const calcInvoiceTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    invoiceForm.lines.forEach(l => {
      const lineTotal = Number(l.quantity) * Number(l.unitPrice);
      subtotal += lineTotal;
      const item = billingItems.find(i => i.id === l.itemId);
      if (item) {
        taxAmount += lineTotal * (item.taxRate / 100);
      }
    });
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const totals = calcInvoiceTotals();
  const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const handleEmitDraft = async () => {
    if (invoiceForm.lines.some(l => !l.itemId)) return alert("Selecciona un item válido o elimina líneas vacías.");
    if (invoiceForm.lines.length === 0) return alert("Agrega líneas a la factura.");
    
    setIsSubmitting(true);
    try {
      const response = await invoicingService.emitInvoice(invoiceForm);
      setXmlPreview(response.xmlPreview);
      setSuccessInfo({ zipKey: response.zipKey, message: response.message });
      setRefreshTrigger(prev => prev + 1);

      // Reset form
      setInvoiceForm({
        date: new Date().toISOString().split('T')[0],
        clientId: '',
        lines: [ { itemId: '', quantity: 1, unitPrice: 0, description: '' } ]
      });
      alert(`Borrador ${response.sequence} sellado y emitido. Estado: ${response.dianStatus}`);
    } catch (e: any) {
      alert(`Error DIAN: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Receipt className="text-[var(--color-neon-cyan)]" /> Facturación Electrónica DIAN
          </h1>
          <p className="text-gray-400 mt-1">Gestión de Emisión, Maestros y Resoluciones Oficiales</p>
        </div>
        <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex gap-1">
          {['EMISION', 'CATALOGO', 'RESOLUCIONES'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-[var(--color-neon-blue)] text-white shadow-[0_0_10px_rgba(45,185,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-[var(--color-neon-cyan)] animate-pulse">
            Sincronizando con DIAN Muisca...
        </div>
      ) : (
        <>
          {/* TAB: EMISION */}
          {activeTab === 'EMISION' && (
            <div className="glass rounded-[2rem] p-8 border border-white/5 mx-auto max-w-5xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <FileText className="text-purple-400" size={18}/> Borrador de Factura de Venta
                </h3>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-md text-xs font-bold border border-yellow-500/30">ESTADO: DRAFT</span>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="text-xs text-gray-400 font-mono uppercase">Fecha de Emisión</label>
                  <input type="date" value={invoiceForm.date} onChange={e => setInvoiceForm({...invoiceForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[var(--color-neon-cyan)]/50 focus:outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-mono uppercase">ID Cliente (Temporal)</label>
                  <input type="text" placeholder="Ej. Tercero-XYZ" value={invoiceForm.clientId} onChange={e => setInvoiceForm({...invoiceForm, clientId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[var(--color-neon-cyan)]/50 focus:outline-none mt-1" />
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Conceptos de Cobro</h4>
                <div className="space-y-3">
                  {invoiceForm.lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <select value={l.itemId} onChange={e => updateInvoiceLine(i, 'itemId', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none">
                          <option value="">-- Seleccionar Ítem del Catálogo --</option>
                          {billingItems.map(item => (
                            <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input type="number" placeholder="Cant" value={l.quantity} onChange={e => updateInvoiceLine(i, 'quantity', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white text-right" />
                      </div>
                      <div className="w-32">
                        <input type="number" placeholder="Precio Ref" value={l.unitPrice || ''} onChange={e => updateInvoiceLine(i, 'unitPrice', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white text-right" />
                      </div>
                      <button onClick={() => removeInvoiceLine(i)} className="p-3 text-red-500 hover:bg-white/5 rounded-xl transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={addInvoiceLine} className="text-xs text-[var(--color-neon-blue)] font-bold hover:underline py-2">+ Añadir Ítem</button>
                </div>
              </div>

              <div className="bg-black/40 rounded-2xl p-6 border border-white/5 grid grid-cols-2 gap-8">
                <div>
                   <p className="text-gray-400 text-xs mt-2">Los borradores guardarán la transacción sin afectar inventario ni ser enviados a la DIAN. Faltaría la fase de sellado criptográfico.</p>
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-gray-400 text-sm">Subtotal: <span className="text-white ml-2">{formatMoney(totals.subtotal)}</span></p>
                  <p className="text-gray-400 text-sm">Impuestos (IVA): <span className="text-white ml-2">{formatMoney(totals.taxAmount)}</span></p>
                  <p className="text-[var(--color-neon-cyan)] text-xl font-bold border-t border-white/10 pt-2 mt-2">TOTAL: <span className="ml-2">{formatMoney(totals.total)}</span></p>
                </div>
              </div>

               <div className="mt-6 flex justify-end gap-3">
                  <button 
                    onClick={handleEmitDraft} 
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-[var(--color-neon-blue)] text-white font-bold py-3 px-8 rounded-xl text-sm transition-all hover:opacity-80 shadow-[0_0_15px_rgba(45,185,255,0.3)] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Procesando Muisca...' : 'Compilar UBL 2.1 Muisca'} <Save size={16} />
                  </button>
               </div>
            </div>
          )}

          {/* TAB: CATALOGO */}
          {activeTab === 'CATALOGO' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-[2rem] p-6 border border-white/5 h-fit">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <Plus className="text-[var(--color-neon-cyan)]" size={16}/> Nuevo Ítem
                </h3>
                <div className="space-y-4 text-sm">
                   <div>
                      <label className="text-xs text-gray-400">Código</label>
                      <input type="text" value={newItemForm.code} onChange={e => setNewItemForm({...newItemForm, code: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1 uppercase" placeholder="Ej. ARR-01" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Descripción DIAN</label>
                      <input type="text" value={newItemForm.name} onChange={e => setNewItemForm({...newItemForm, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Porcentaje Impuesto (%)</label>
                      <input type="number" value={newItemForm.taxRate} onChange={e => setNewItemForm({...newItemForm, taxRate: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Ancla PUC (Ingreso)</label>
                      <select value={newItemForm.accountId} onChange={e => setNewItemForm({...newItemForm, accountId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1">
                        <option value="">Seleccionar Cuenta...</option>
                        {pucAccounts.map(a => (
                            <option key={a.id} value={a.id} disabled={a.level !== 'CUENTA'}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                   </div>
                   <button onClick={handleCreateItem} className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl border border-white/5 transition-all">Crear Ítem Maestro</button>
                </div>
              </div>

              <div className="md:col-span-2 glass rounded-[2rem] p-6 border border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-mono text-gray-500 uppercase">
                      <th className="pb-3 pl-4">Código</th>
                      <th className="pb-3">Concepto</th>
                      <th className="pb-3 text-right">IVA %</th>
                      <th className="pb-3 text-right pr-4">Ancla Contable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm cursor-pointer">
                    {billingItems.map(item => (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="py-3 pl-4 text-white font-bold">{item.code}</td>
                        <td className="py-3 text-gray-300">{item.name}</td>
                        <td className="py-3 text-right text-[var(--color-neon-cyan)]">{item.taxRate}%</td>
                        <td className="py-3 text-right pr-4 font-mono text-gray-500">{item.accountingAccount?.code || item.accountId.substring(0,6)}</td>
                      </tr>
                    ))}
                    {billingItems.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-6 text-gray-500">No hay ítems registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: RESOLUCIONES */}
          {activeTab === 'RESOLUCIONES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-[2rem] p-6 border border-white/5">
                 <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={16}/> Autorización Numeración
                </h3>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="col-span-2">
                      <label className="text-xs text-gray-400">Número de Resolución</label>
                      <input type="text" value={newResForm.resolutionNumber} onChange={e => setNewResForm({...newResForm, resolutionNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" placeholder="Ej. 18760000001" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Prefijo</label>
                      <input type="text" value={newResForm.prefix} onChange={e => setNewResForm({...newResForm, prefix: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" placeholder="Ej. FEV" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Clave Técnica (Prod/Test)</label>
                      <input type="password" value={newResForm.technicalKey} onChange={e => setNewResForm({...newResForm, technicalKey: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Desde (Min)</label>
                      <input type="number" value={newResForm.startRange} onChange={e => setNewResForm({...newResForm, startRange: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Hasta (Max)</label>
                      <input type="number" value={newResForm.endRange} onChange={e => setNewResForm({...newResForm, endRange: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Vigencia Desde</label>
                      <input type="date" value={newResForm.startDate} onChange={e => setNewResForm({...newResForm, startDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400">Vigencia Hasta</label>
                      <input type="date" value={newResForm.endDate} onChange={e => setNewResForm({...newResForm, endDate: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white mt-1" />
                   </div>
                   <div className="col-span-2 mt-4">
                     <button onClick={handleCreateResolution} className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl border border-emerald-500/30 transition-all flex justify-center items-center gap-2">
                       Añadir Resolución DIAN <CheckCircle2 size={16}/>
                     </button>
                   </div>
                 </div>
              </div>

              <div className="space-y-4">
                {resolutions.map(r => (
                  <div key={r.id} className="bg-black/40 rounded-2xl p-6 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/50"></div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-1">Activa</p>
                    <h4 className="text-xl font-bold text-white mb-2">Res. {r.resolutionNumber}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                      <p>Prefijo: <span className="text-white font-mono">{r.prefix}</span></p>
                      <p>Rango: <span className="text-white font-mono">{r.startRange} - {r.endRange}</span></p>
                      <p>Inicio: <span className="text-white">{new Date(r.startDate).toLocaleDateString()}</span></p>
                      <p>Fin: <span className="text-white">{new Date(r.endDate).toLocaleDateString()}</span></p>
                    </div>
                  </div>
                ))}
                {resolutions.length === 0 && (
                  <div className="text-center p-8 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                    Agrega tu primera resolución para operar
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* XML Preview Modal */}
      {xmlPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in cursor-default" onClick={() => setXmlPreview(null)}>
          <div className="glass rounded-[2rem] w-full max-w-4xl max-h-[80vh] border border-[var(--color-neon-cyan)]/30 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,255,255,0.1)]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 bg-black/60 flex justify-between items-center">
               <h3 className="text-sm font-bold text-[var(--color-neon-cyan)] font-mono uppercase tracking-widest flex items-center gap-2">
                 ⚡ DIAN UBL 2.1 {successInfo?.zipKey ? '(FIRMA XADES Y SOAP COMPLETADOS)' : '(Xades-EPES Pending)'}
               </h3>
               <button onClick={() => setXmlPreview(null)} className="text-gray-500 hover:text-white transition-colors">Cerrar</button>
            </div>
            {successInfo?.zipKey && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-4 text-emerald-400 font-mono text-sm flex justify-between">
                <span>{successInfo.message}</span>
                <span className="font-bold">ZIP_KEY: {successInfo.zipKey}</span>
              </div>
            )}
            <div className="p-6 overflow-y-auto bg-[#0a0f16] flex-1">
               <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                 {xmlPreview}
               </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
