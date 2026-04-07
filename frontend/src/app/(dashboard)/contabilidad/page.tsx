"use client";

import { useState, useEffect } from "react";
import { BookOpen, Search, CheckCircle2, ChevronRight, ChevronDown, Plus, AlertCircle, Save } from "lucide-react";
import { accountingService } from "@/services/accountingService";

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState<'DIARIO' | 'PUC' | 'NUEVO'>('DIARIO');
  const [entries, setEntries] = useState<any[]>([]);
  const [puc, setPuc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form State
  const [newLineForm, setNewLineForm] = useState({
    date: new Date().toISOString().split('T')[0],
    documentType: 'RC',
    documentNumber: '',
    description: '',
    lines: [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, pucRes] = await Promise.all([
        accountingService.getJournalEntries(),
        accountingService.getPuc()
      ]);
      setEntries(entriesRes);
      // Construct Tree for PUC
      const buildTree = (accounts: any[], parentId: string | null = null): any[] => {
        return accounts
          .filter(a => a.parentId === parentId)
          .map(a => ({ ...a, children: buildTree(accounts, a.id) }));
      };
      setPuc(buildTree(pucRes));
    } catch (error) {
      console.error("Error fetching accounting data", error);
    } finally {
      setLoading(false);
    }
  };

  // Form Helpers
  const addLine = () => {
    setNewLineForm(prev => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', debit: 0, credit: 0, description: '' }]
    }));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...newLineForm.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setNewLineForm({ ...newLineForm, lines: newLines });
  };

  const removeLine = (index: number) => {
    if (newLineForm.lines.length <= 2) return;
    const newLines = [...newLineForm.lines];
    newLines.splice(index, 1);
    setNewLineForm({ ...newLineForm, lines: newLines });
  };

  const totalDebit = newLineForm.lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = newLineForm.lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isValidForm = difference === 0 && totalDebit > 0 && newLineForm.description && newLineForm.lines.every(l => l.accountId);

  const formatMoney = (val: string | number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val));
  };

  const handleSubmit = async () => {
    if (!isValidForm) return;
    setIsSubmitting(true);
    try {
      await accountingService.createJournalEntry({
        ...newLineForm,
        isAutomated: false // Always draft for manual entries
      });
      alert('Borrador creado exitosamente');
      setNewLineForm({
        date: new Date().toISOString().split('T')[0],
        documentType: 'RC',
        documentNumber: '',
        description: '',
        lines: [
          { accountId: '', debit: 0, credit: 0, description: '' },
          { accountId: '', debit: 0, credit: 0, description: '' }
        ]
      });
      setRefreshTrigger(prev => prev + 1);
      setActiveTab('DIARIO');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async (id: string) => {
    try {
      await accountingService.postJournalEntry(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      alert(`Error al registrar asiento: ${e.message}`);
    }
  };

  // Flatten PUC for Dropdowns
  const flatPuc: any[] = [];
  const flatten = (nodes: any[]) => {
    nodes.forEach(n => {
      flatPuc.push(n);
      if (n.children) flatten(n.children);
    });
  };
  flatten(puc);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="text-[var(--color-neon-cyan)]" /> Libros Contables
          </h1>
          <p className="text-gray-400 mt-1">Gestión del PUC y Partida Doble</p>
        </div>
        <div className="flex gap-3">
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex gap-1">
                <button 
                  onClick={() => setActiveTab('DIARIO')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'DIARIO' ? 'bg-[var(--color-neon-blue)] text-white shadow-[0_0_10px_rgba(45,185,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                >
                  Libro Diario
                </button>
                <button 
                  onClick={() => setActiveTab('PUC')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'PUC' ? 'bg-[var(--color-neon-blue)] text-white shadow-[0_0_10px_rgba(45,185,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                >
                  Plan de Cuentas
                </button>
            </div>
            <button 
                onClick={() => setActiveTab('NUEVO')}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-neon-cyan)] hover:bg-[var(--color-neon-cyan)]/80 text-black font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
            >
                <Plus size={16} /> Nuevo Asiento
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-[var(--color-neon-cyan)] animate-pulse">
            Cargando módulos contables...
        </div>
      ) : (
        <>
          {activeTab === 'DIARIO' && (
            <div className="glass rounded-[2rem] p-8 border border-white/5 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm opacity-70">Últimos Comprobantes</h3>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-mono text-gray-500 uppercase">
                      <th className="pb-4 font-medium pl-4">Fecha</th>
                      <th className="pb-4 font-medium">Documento</th>
                      <th className="pb-4 font-medium">Descripción</th>
                      <th className="pb-4 font-medium">Estado</th>
                      <th className="pb-4 font-medium text-right pr-4">Creado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {entries.map((entry: any) => (
                      <EntryRow key={entry.id} entry={entry} formatMoney={formatMoney} onPost={() => handlePost(entry.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'PUC' && (
            <div className="glass rounded-[2rem] p-8 border border-white/5 overflow-hidden">
                <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm opacity-70 mb-6">Estructura Jerárquica</h3>
                <div className="space-y-1">
                  {puc.map((node: any) => (
                    <PucNode key={node.id} node={node} level={0} />
                  ))}
                </div>
            </div>
          )}

          {activeTab === 'NUEVO' && (
            <div className="glass rounded-[2rem] p-8 border border-white/5 mx-auto max-w-4xl">
              <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm mb-6 border-b border-white/10 pb-4">📝 Borrador de Asiento</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div>
                  <label className="text-xs text-gray-400 font-mono">Fecha</label>
                  <input type="date" value={newLineForm.date} onChange={e => setNewLineForm({...newLineForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-mono">Tipo Documento</label>
                  <select value={newLineForm.documentType} onChange={e => setNewLineForm({...newLineForm, documentType: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 mt-1">
                    <option value="RC">Recibo de Caja</option>
                    <option value="CE">Comprobante Egreso</option>
                    <option value="FC">Factura Venta</option>
                    <option value="NC">Nota Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-mono">Consecutivo Ref (Opcional)</label>
                  <input type="text" value={newLineForm.documentNumber} onChange={e => setNewLineForm({...newLineForm, documentNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 mt-1" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-gray-400 font-mono">Descripción General</label>
                  <input type="text" value={newLineForm.description} onChange={e => setNewLineForm({...newLineForm, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[var(--color-neon-blue)]/50 mt-1" placeholder="Ej: Pago arriendo Inmueble-431" />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Líneas Contables (Partida Doble)</h4>
                </div>
                <div className="space-y-3">
                  {newLineForm.lines.map((l, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <select value={l.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none">
                          <option value="">-- Seleccionar Cuenta PUC --</option>
                          {flatPuc.map(acc => (
                            <option key={acc.id} value={acc.id} disabled={acc.level !== 'CUENTA' && acc.level !== 'AUXILIAR'}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input type="number" placeholder="Débito" value={l.debit || ''} onChange={e => updateLine(i, 'debit', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white text-right" />
                      </div>
                      <div className="w-32">
                        <input type="number" placeholder="Crédito" value={l.credit || ''} onChange={e => updateLine(i, 'credit', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white text-right" />
                      </div>
                      <button onClick={() => removeLine(i)} className="p-3 text-red-500 hover:bg-white/5 rounded-xl border border-transparent transition-colors">
                        X
                      </button>
                    </div>
                  ))}
                  <button onClick={addLine} className="text-xs text-cyan-400 font-bold hover:underline py-2">+ Añadir otra línea</button>
                </div>
              </div>

              <div className="bg-black/30 rounded-2xl p-6 flex items-center justify-between border border-white/5">
                <div>
                  <h4 className="text-xs text-gray-500 font-mono uppercase">Control de Diferencia</h4>
                  <div className="flex gap-8 mt-2">
                    <p className="text-sm font-bold text-gray-300">Total Débitos: <span className="text-green-400">{formatMoney(totalDebit)}</span></p>
                    <p className="text-sm font-bold text-gray-300">Total Créditos: <span className="text-blue-400">{formatMoney(totalCredit)}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {difference !== 0 ? (
                    <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                      <AlertCircle size={16} /> Descuadre: {formatMoney(difference)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 size={16} /> Asiento Cuadrado
                    </div>
                  )}
                  <button 
                    onClick={handleSubmit}
                    disabled={!isValidForm || isSubmitting}
                    className="flex items-center gap-2 bg-[var(--color-neon-blue)] hover:bg-[var(--color-neon-blue)]/80 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(45,185,255,0.2)]"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Borrador'} <Save size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EntryRow({ entry, formatMoney, onPost }: { entry: any, formatMoney: any, onPost: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  // Calculate specific entry totals for display
  const entryTotal = entry.lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);

  return (
    <>
      <tr className="group hover:bg-white/5 transition-all text-sm cursor-pointer border-b border-white/5" onClick={() => setExpanded(!expanded)}>
        <td className="py-4 pl-4 font-mono text-gray-400 text-xs">
          {new Date(entry.date).toLocaleDateString()}
        </td>
        <td className="py-4">
          <span className="font-bold text-white bg-white/10 px-2 py-1 rounded-md text-xs">{entry.documentType}-{entry.documentNumber || entry.id.substring(0,4)}</span>
        </td>
        <td className="py-4 text-gray-300 max-w-xs truncate">{entry.description}</td>
        <td className="py-4">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${entry.status === 'POSTED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'}`}>
            {entry.status}
          </span>
        </td>
        <td className="py-4 text-right pr-4 text-gray-500 text-xs flex items-center justify-end gap-3">
          {entry.createdBy?.firstName || 'Sistema'}
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-black/20">
          <td colSpan={5} className="p-6">
            <div className="rounded-xl border border-white/5 bg-black/40 p-4">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5">
                    <th className="pb-2 text-left">Cuenta</th>
                    <th className="pb-2 text-left">Descripción Línea</th>
                    <th className="pb-2 text-right">Débitos</th>
                    <th className="pb-2 text-right">Créditos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {entry.lines.map((l: any, i: number) => (
                    <tr key={i} className="text-gray-300">
                      <td className="py-2"><span className="text-cyan-400 mr-2">{l.account?.code}</span>{l.account?.name}</td>
                      <td className="py-2">{l.description || '-'}</td>
                      <td className="py-2 text-right text-green-400/80">{Number(l.debit) > 0 ? formatMoney(l.debit) : ''}</td>
                      <td className="py-2 text-right text-blue-400/80">{Number(l.credit) > 0 ? formatMoney(l.credit) : ''}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-white/10 text-white">
                    <td colSpan={2} className="py-2 text-right text-gray-500">SUMAS IGUALES:</td>
                    <td className="py-2 text-right">{formatMoney(entryTotal)}</td>
                    <td className="py-2 text-right">{formatMoney(entryTotal)}</td>
                  </tr>
                </tbody>
              </table>

              {entry.status === 'DRAFT' && (
                <div className="mt-4 flex justify-end">
                  <button onClick={(e) => { e.stopPropagation(); onPost(); }} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                    Fijar Asiento (POST)
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PucNode({ node, level }: { node: any, level: number }) {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div className="text-sm">
      <div 
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${level === 0 ? 'bg-white/5 font-bold mt-2' : ''}`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-4 flex justify-center">
          {hasChildren && (expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />)}
        </span>
        <span className="text-[var(--color-neon-cyan)] font-mono">{node.code}</span>
        <span className="text-gray-200">{node.name}</span>
        <span className="ml-auto flex gap-2">
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500 uppercase">{node.level}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${node.nature === 'DEBIT' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10'}`}>{node.nature}</span>
        </span>
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-white/5 ml-4">
          {node.children.map((child: any) => (
            <PucNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
