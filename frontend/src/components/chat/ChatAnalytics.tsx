import { ChatMessage, Intent, Sentiment, detectIntent } from "@/services/whatsappOrchestrator";
import { Smile, Frown, HelpCircle, Activity, ShieldCheck, Cog, RefreshCcw } from "lucide-react";

interface ChatAnalyticsProps {
  messages: ChatMessage[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  ticketStatus: { id: string | null; state: string };
}

export default function ChatAnalytics({ messages, isTyping, messagesEndRef, ticketStatus }: ChatAnalyticsProps) {
  const currentSentiment = messages[messages.length - 1]?.sentiment || Sentiment.NEUTRAL;

  const SentimentLabel = () => {
    switch (currentSentiment) {
      case Sentiment.HAPPY: return { label: "Positivo / Colaborativo", color: "text-green-400", icon: <Smile size={18} /> };
      case Sentiment.ANGRY: return { label: "Negativo / Frustrado", color: "text-red-400", icon: <Frown size={18} /> };
      default: return { label: "Neutral / Objetivo", color: "text-blue-400", icon: <HelpCircle size={18} /> };
    }
  };

  const statusInfo = SentimentLabel();

  return (
    <div className="flex-1 glass rounded-2xl p-6 border border-white/5 flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-medium mb-1">Centro de Mando Cognitivo</h2>
          <p className="text-sm text-gray-400">Análisis neuro-simbólico en tiempo real</p>
        </div>
        <div className="px-3 py-1 bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/20 rounded-lg">
            <span className="text-[10px] font-bold text-[var(--color-neon-blue)] uppercase tracking-tighter">Sandbox Active</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-2">
            <Activity size={12} /> Análisis de Sentimiento
          </p>
          <div className={`flex items-center gap-2 ${statusInfo.color} font-medium text-sm`}>
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </div>
        </div>
        <div className="bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
          <p className="text-xs text-gray-400 mb-2 flex items-center gap-2">
            <ShieldCheck size={12} /> Estado del Proceso (BPM)
          </p>
          <div className="flex items-center gap-2 text-white font-mono text-sm">
            <div className={`w-2 h-2 rounded-full ${ticketStatus.id ? 'bg-[var(--color-neon-cyan)] animate-pulse' : 'bg-gray-500'}`}></div>
            <span>{ticketStatus.state}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-black/30 rounded-xl border border-white/5 p-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-3 opacity-20">
            <Cog className="animate-spin-slow" size={40} />
        </div>
        <p className="text-xs font-mono text-gray-400 uppercase tracking-wider border-b border-white/10 pb-2 mb-4">
          [ Cognitive Orchestration Log ]
        </p>
        <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px] pr-2 scrollbar-hide">
          {messages.map((m, i) => {
             if (m.role === 'system') return null;
             const intent = detectIntent(m.content);
             return (
               <div key={`log-${m.id}`} className="space-y-1 border-l border-white/10 pl-3 ml-1 py-1">
                 <p className="text-gray-500">[{m.timestamp}] {m.role === 'user' ? 'INPUT_STREAM' : 'IA_OUTPUT'}: "{m.content.substring(0, 40)}{m.content.length > 40 ? '...' : ''}"</p>
                 {m.role === 'assistant' && (
                     <>
                        <p className="text-[var(--color-neon-purple)]">└─ Intent: {intent}</p>
                        <p className="text-[var(--color-neon-blue)]">└─ Sentiment_Metric: {m.sentiment}</p>
                        {m.ticketState && <p className="text-[var(--color-neon-cyan)]">└─ Sync_BPM_State: {m.ticketState}</p>}
                     </>
                 )}
               </div>
             );
          })}
          {isTyping && (
            <div className="flex items-center gap-2 text-[var(--color-neon-cyan)] animate-pulse ml-1 py-2">
                <RefreshCcw size={10} className="animate-spin" />
                <span>Thinking... (Orchestrating RAG + Neural Model)</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
