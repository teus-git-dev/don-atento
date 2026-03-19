"use client";

import { useState } from "react";
import TicketBoard from "@/components/tickets/TicketBoard";
import PredictiveDashboard from "@/components/tickets/PredictiveDashboard";
import TechnicianView from "@/components/tickets/TechnicianView";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import { LayoutGrid, Zap, Wrench, Plus } from "lucide-react";

export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState<'board' | 'predictive' | 'technician'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión Operativa Cognitiva</h1>
          <p className="text-gray-400 mt-1">Gestión del ciclo de vida y mantenimiento predictivo proactivo</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-neon-blue)] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,112,243,0.4)] flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Nuevo Ticket
        </button>
      </div>

      <CreateTicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setIsModalOpen(false);
        }} 
      />

      {/* Navigation Tabs */}
      <div className="flex p-1.5 glass rounded-2xl border border-white/10 w-fit">
        {[
          { id: 'board', label: 'Tablero Operativo', icon: <LayoutGrid size={16} /> },
          { id: 'predictive', label: 'Dashboard Predictivo', icon: <Zap size={16} /> },
          { id: 'technician', label: 'Vista de Campo', icon: <Wrench size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id 
                ? 'bg-[var(--color-neon-blue)] text-white shadow-lg' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'board' && <TicketBoard refreshTrigger={refreshTrigger} />}
        {activeTab === 'predictive' && <PredictiveDashboard />}
        {activeTab === 'technician' && <TechnicianView />}
      </div>
    </div>
  );
}
