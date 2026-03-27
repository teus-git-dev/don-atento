"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus, Users, Key, Plus, X, Trash2 } from "lucide-react";

type Permission = 'crm' | 'tickets' | 'inmuebles' | 'analitica' | 'configuracion';

interface RoleDef {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export default function RolesManager() {
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'users'>('roles');
  
  // Mock Data
  const [customRoles, setCustomRoles] = useState<RoleDef[]>([
    { id: '1', name: 'Administrador (Por Defecto)', description: 'Acceso total a la agencia', permissions: ['crm', 'tickets', 'inmuebles', 'analitica', 'configuracion'] },
    { id: '2', name: 'Asesor Comercial', description: 'Atención a prospectos y gestión de ventas', permissions: ['crm', 'inmuebles'] },
    { id: '3', name: 'Agente Mantenimiento', description: 'Revisión y despacho de reparaciones', permissions: ['tickets', 'inmuebles'] },
  ]);

  const [users, setUsers] = useState([
    { id: '1', name: 'Admin Principal', email: 'admin@inmobiliaria.com', roleId: '1' },
    { id: '2', name: 'Laura Gómez', email: 'laura@inmobiliaria.com', roleId: '2' },
  ]);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<{name: string, description: string, permissions: Permission[]}>({ name: '', description: '', permissions: [] });

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', roleId: '2' });

  const togglePermission = (perm: Permission) => {
    if (newRole.permissions.includes(perm)) {
      setNewRole({ ...newRole, permissions: newRole.permissions.filter(p => p !== perm) });
    } else {
      setNewRole({ ...newRole, permissions: [...newRole.permissions, perm] });
    }
  };

  const saveRole = () => {
    setCustomRoles([...customRoles, { ...newRole, id: Date.now().toString() }]);
    setShowRoleModal(false);
    setNewRole({ name: '', description: '', permissions: [] });
  };

  const saveUser = () => {
    setUsers([...users, { ...newUser, id: Date.now().toString() }]);
    setShowUserModal(false);
    setNewUser({ name: '', email: '', roleId: '2' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-warning/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-white mb-1 flex items-center gap-2">
            <ShieldCheck className="text-[var(--color-neon-cyan)]" size={24} />
            Control de Accesos y Equipo
          </h2>
          <p className="text-sm text-gray-400">Jerarquía corporativa, creación de usuarios y permisos modulares.</p>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 shrink-0 border border-white/10">
          <button 
            onClick={() => setActiveSubTab('roles')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${activeSubTab === 'roles' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            <Key size={14} /> Roles
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${activeSubTab === 'users' ? 'bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] shadow-sm' : 'text-gray-400 hover:text-[var(--color-neon-blue)]'}`}
          >
            <Users size={14} /> Equipo
          </button>
        </div>
      </div>

      {activeSubTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-end">
             <button 
               onClick={() => setShowRoleModal(true)}
               className="bg-[var(--color-neon-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-[0_0_15px_rgba(0,112,243,0.3)] flex items-center gap-2"
             >
                <Plus size={14} /> Nuevo Rol Dinámico
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map(role => (
              <div key={role.id} className="glass p-5 rounded-2xl border border-white/5 flex flex-col group">
                <h3 className="text-white font-bold mb-1 group-hover:text-[var(--color-neon-cyan)] transition-colors">{role.name}</h3>
                <p className="text-xs text-gray-400 mb-4 h-8">{role.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-white/5">
                  {role.permissions.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] uppercase font-mono text-gray-300 tracking-wider">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-sm font-medium text-gray-300">Usuarios Invitados en el Tenant</h3>
             <button 
               onClick={() => setShowUserModal(true)}
               className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-500 transition-all flex items-center gap-2"
             >
                <UserPlus size={14} /> Nuevo Usuario
             </button>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-gray-400 font-mono text-[10px] uppercase tracking-widest border-b border-white/5">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Email de Acceso</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => {
                  const role = customRoles.find(r => r.id === u.roleId);
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                      <td className="py-3 px-4 text-gray-400">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-lg bg-[var(--color-neon-blue)]/10 text-[var(--color-neon-blue)] text-[10px] font-bold uppercase">
                          {role?.name || 'Desconocido'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Creation Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-3xl p-6 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-bold text-white mb-4">Constructor de Roles Dinámicos</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre del Rol</label>
                <input value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--color-neon-cyan)] outline-none" placeholder="Ej. Analista Reclamos" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Descripción</label>
                <input value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})} type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[var(--color-neon-cyan)] outline-none" placeholder="Propósito de este rol..." />
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Permisos de Módulos (Habilitar)</label>
                <div className="space-y-2">
                  {[
                    { id: 'crm', label: 'CRM (Prospectos y Negociaciones)' },
                    { id: 'tickets', label: 'Mantenimiento y Tickets Ope.' },
                    { id: 'inmuebles', label: 'Maestro de Inmuebles' },
                    { id: 'analitica', label: 'Analítica y Rendimiento Financiero' },
                    { id: 'configuracion', label: 'Configuración Administrativa' }
                  ].map(perm => (
                    <label key={perm.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-white/5 border-white/5">
                      <input 
                        type="checkbox" 
                        checked={newRole.permissions.includes(perm.id as Permission)} 
                        onChange={() => togglePermission(perm.id as Permission)}
                        className="w-4 h-4 rounded text-[var(--color-neon-cyan)] focus:ring-[var(--color-neon-cyan)] bg-black/40 border-white/20"
                      />
                      <span className="text-sm font-medium text-gray-200">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
                <button onClick={saveRole} className="px-6 py-2 bg-[var(--color-neon-cyan)] text-black rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,255,255,0.4)]">Crear Rol</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Creation Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-bold text-white mb-4">Invitar Miembro del Equipo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nombre Completo</label>
                <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500" placeholder="Ej. Camila M." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Correo Electrónico</label>
                <input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} type="email" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500" placeholder="camila@agencia.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Asignar Rol</label>
                <select value={newUser.roleId} onChange={e => setNewUser({...newUser, roleId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500 appearance-none">
                  {customRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
                <button onClick={saveUser} className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.4)]">Invitar Empleado</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
