import ChatSimulator from "@/components/chat/ChatSimulator";

export default function IAChatPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simulador de Agente IA (WhatsApp)</h1>
          <p className="text-gray-400 mt-1">Monitoreo y pruebas de negociación autónoma cognitiva</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)] animate-pulse shadow-[0_0_8px_rgba(0,255,255,0.8)]"></div>
          <span className="text-xs font-mono text-gray-300">Orquestador en línea</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatSimulator />
      </div>
    </div>
  );
}
