"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import AiChatWidget from "@/components/chat/AiChatWidget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Topbar onCreateTicket={() => setIsCreateModalOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">

          <div className="relative w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <CreateTicketModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          // Optional: trigger a global refresh or toast
        }}
      />
      <AiChatWidget />
    </div>
  );
}
