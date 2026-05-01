"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Target, Search, Plus, UserPlus, FileText, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Pagination } from "@/components/ui/Pagination";
import { TableRowSkeleton } from "@/components/ui/Skeleton";

export default function ContactosDashboard() {
  const [activeTab, setActiveTab] = useState<'TENANT_USER' | 'OWNER'>('TENANT_USER');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [activeTab, currentPage]);

  const fetchUsers = async (page: number) => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'TENANT_USER' ? '/users/tenants' : '/users/owners';
      const res = await apiClient.get<any>(`${endpoint}?page=${page}&limit=${limit}`);
      setUsers(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalRecords(res.totalRecords || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.governmentId?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="text-[var(--color-neon-cyan)]" /> Contactos
          </h1>
          <p className="text-gray-400 mt-1">
            Gestión de Arrendatarios y Propietarios con contratos activos
          </p>
        </div>
        <div className="flex gap-3">
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex gap-1">
                <button 
                  onClick={() => setActiveTab('TENANT_USER')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'TENANT_USER' ? 'bg-[var(--color-neon-blue)] text-white shadow-[0_0_10px_rgba(45,185,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                >
                  Arrendatarios
                </button>
                <button 
                  onClick={() => setActiveTab('OWNER')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'OWNER' ? 'bg-[var(--color-neon-cyan)] text-black shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                >
                  Propietarios
                </button>
            </div>
            <button 
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-all border border-white/10"
            >
                <Plus size={16} /> Exportar
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Registros" value={users.length.toString()} sub={`En la pestaña activa`} icon={<Users className="text-blue-400" />} />
          <StatCard title="Verificados" value={users.length.toString()} sub="Validación automática" icon={<CheckCircle2 className="text-green-400" />} />
          <StatCard title="Contratos Activos" value={users.length.toString()} sub="Sincronizados" icon={<FileText className="text-purple-400" />} />
      </div>

      <div className="glass rounded-[2rem] p-8 border border-white/5 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm opacity-70">
              Listado de {activeTab === 'TENANT_USER' ? 'Arrendatarios' : 'Propietarios'}
            </h3>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre, cédula o email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-neon-cyan)]/50 transition-all w-72"
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
              <thead>
                  <tr className="border-b border-white/10 text-xs font-mono text-gray-500 uppercase">
                      <th className="pb-4 font-medium pl-4">Cliente</th>
                      <th className="pb-4 font-medium">Documento</th>
                      <th className="pb-4 font-medium">Teléfono</th>
                      <th className="pb-4 font-medium">Origen / Fase</th>
                      <th className="pb-4 font-medium text-right pr-4">Fecha Creación</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <TableRowSkeleton columns={5} />
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-500 font-mono text-xs uppercase tracking-widest opacity-50">
                        No se encontraron registros
                      </td>
                    </tr>
                  ) : filteredUsers.map((user, i) => (
                      <tr key={i} className="group hover:bg-white/5 transition-all text-sm cursor-pointer">
                          <td className="py-4 pl-4 font-medium flex flex-col">
                              <span className="text-white">{user.firstName} {user.lastName}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{user.email}</span>
                          </td>
                          <td className="py-4 text-gray-300 font-mono text-xs">
                              {user.governmentId || 'N/A'}
                          </td>
                          <td className="py-4 text-gray-300 font-mono text-xs">
                              {user.phone || 'Sin número'}
                          </td>
                          <td className="py-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 truncate max-w-[150px] inline-block">
                                  {user.sourceTag || 'Phase: CLIENT'}
                              </span>
                          </td>
                          <td className="py-4 text-right pr-4 text-gray-500 text-xs font-mono">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
          {!loading && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon }: any) {
    return (
        <div className="glass p-6 rounded-2xl border border-white/5 hover:border-[var(--color-neon-cyan)]/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">{icon}</div>
            </div>
            <p className="text-xs text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{sub}</p>
        </div>
    );
}
