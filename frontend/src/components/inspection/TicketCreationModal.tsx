"use client";

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import { maintenanceService, TicketPriority } from '@/services/maintenanceService';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  spatialPoint: { x: number; y: number; z: number } | null;
  propertyId: string;
  onTicketCreated: (ticket: any) => void;
}

export default function TicketCreationModal({ isOpen, onClose, spatialPoint, propertyId, onTicketCreated }: TicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ticket = maintenanceService.createTicket({
      title,
      description,
      status: 'pending',
      priority,
      propertyId,
      spatialPosition: spatialPoint || undefined,
      aiConfidence: 92, // Simulated
      aiSuggestedCategory: 'Mantenimiento Correctivo'
    });
    onTicketCreated(ticket);
    onClose();
    setTitle('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white shadow-sm border border-gray-200 w-full max-w-lg rounded-3xl border border-gray-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-[#1F2937] flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            Nuevo Pedido de Intervención
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-[#1F2937] transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {spatialPoint && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20">
              <MapPin size={18} className="text-[#10B981]" />
              <div className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider">
                Coordenadas Espaciales: X:{spatialPoint.x.toFixed(2)} Y:{spatialPoint.y.toFixed(2)} Z:{spatialPoint.z.toFixed(2)}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Resumen del Hallazgo</label>
              <input 
                autoFocus
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1F2937] focus:border-[#1E3A8A]/50 focus:outline-none transition-all"
                placeholder="Ej: Humedad detectada en techo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Descripción / Detalles Técnicos</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1F2937] focus:border-[#1E3A8A]/50 focus:outline-none transition-all resize-none"
                placeholder="Describe el estado visual y posible causa..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Prioridad</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1F2937] focus:border-[#1E3A8A]/50 focus:outline-none"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Análisis IA</label>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                  <ShieldCheck size={16} />
                  <span className="text-[10px] font-bold uppercase">Sugerencia: Correctivo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-white shadow-sm border border-gray-200 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#1F2937] border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-[#1E3A8A] text-[#1F2937] py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(0,112,243,0.4)]"
            >
              Confirmar Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
