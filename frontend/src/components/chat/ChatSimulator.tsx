"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Phone, Video, MoreVertical, Bot, AlertCircle, CheckCircle, RefreshCcw } from "lucide-react";
import { processMessage, ChatMessage, Sentiment, getSimulatedState, resetSimulation } from "@/services/whatsappOrchestrator";
import { SystemMessage, UserBubble, AssistantBubble, TypingIndicator } from "./MessageBubbles";
import ChatAnalytics from "./ChatAnalytics";

export default function ChatSimulator() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "system",
      content: "Modo Sandbox Atento-Sim: Simulación de Negociación Cognitiva activa.",
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [ticketStatus, setTicketStatus] = useState(getSimulatedState());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analyticsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (analyticsEndRef.current?.scrollIntoView) {
      analyticsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate network delay
    setTimeout(async () => {
      const aiResponse = await processMessage(inputText, messages);
      setMessages(prev => [...prev, aiResponse]);
      setTicketStatus(getSimulatedState());
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  const handleReset = () => {
    resetSimulation();
    setMessages([{
      id: "init",
      role: "system",
      content: "Simulación reiniciada. Esperando interacción del cliente.",
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);
    setTicketStatus(getSimulatedState());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full gap-6 select-none">
      {/* Phone Simulator Layout */}
      <div className="w-[400px] h-full flex flex-col rounded-[2.5rem] border-[8px] border-black/40 bg-white shadow-sm border border-gray-200 shadow-2xl overflow-hidden relative transition-all duration-500 hover:shadow-[0_0_30px_rgba(0,255,255,0.1)]">
        {/* Dynamic Island / Notch Mock */}
        <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-20">
          <div className="w-24 h-6 bg-black rounded-b-3xl"></div>
        </div>

        {/* WhatsApp Header Area */}
        <div className="bg-[#075E54]/90 backdrop-blur-md pt-10 pb-3 px-4 flex justify-between items-center text-[#1F2937] border-b border-gray-200 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E3A8A] to-[#10B981] flex items-center justify-center border border-gray-300 shadow-lg">
                <Bot size={24} className="text-[#1F2937] drop-shadow-md" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#075E54] rounded-full"></div>
            </div>
            <div>
              <h3 className="font-semibold leading-tight text-sm">Atento-Sim (Simulador)</h3>
              <p className="text-[10px] text-[#1F2937]/70">entorno de pruebas</p>
            </div>
          </div>
          <div className="flex gap-4 opacity-70">
            <RefreshCcw size={18} className="cursor-pointer hover:rotate-180 transition-transform" onClick={handleReset} />
            <MoreVertical size={18} className="cursor-pointer hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="bg-[#0b141a] px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-100 no-scrollbar">
            {[
                { label: "Urgencia", icon: "🔥", text: "¡URGENTE! Mi calentador explotó y hay agua por todos lados. ¡TERRIBLE!" },
                { label: "Consulta", icon: "💬", text: "Hola, ¿podrían decirme cómo va el estado de mi ticket de pintura?" },
                { label: "Gracias", icon: "✅", text: "¡Muchas gracias! El técnico vino y todo quedó perfecto. Excelente servicio." }
            ].map((sc, i) => (
                <button 
                    key={i}
                    onClick={() => setInputText(sc.text)}
                    className="flex-shrink-0 px-3 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-[10px] text-gray-600 transition-colors flex items-center gap-1.5"
                >
                    <span>{sc.icon}</span> {sc.label}
                </button>
            ))}
        </div>

        {/* Cognitive Context Bar */}
        <div className="bg-black/60 px-4 py-1.5 flex justify-between items-center border-b border-gray-100 z-10 shrink-0">
            <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">BPM State:</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    ticketStatus.state === 'IN_PROGRESS' ? 'bg-orange-500/20 text-orange-400' :
                    ticketStatus.state === 'ASSIGNMENT' ? 'bg-blue-500/20 text-blue-400' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                    {ticketStatus.state}
                </span>
            </div>
            {ticketStatus.id && (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#10B981] animate-pulse">
                    <AlertCircle size={10} /> {ticketStatus.id}
                </div>
            )}
        </div>

        {/* Chat Area (WhatsApp background) */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col bg-[#0d1418] relative scrollbar-hide" 
          style={{ 
            backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', 
            backgroundBlendMode: 'overlay', 
            backgroundSize: 'cover' 
          }}
        >
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'system' && <SystemMessage content={msg.content} />}
              {msg.role === 'user' && <UserBubble message={msg} />}
              {msg.role === 'assistant' && <AssistantBubble message={msg} />}
            </div>
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[#202C33] p-2 flex items-center gap-2 mb-1 rounded-b-[2rem] shrink-0 border-t border-gray-100">
          <div className="bg-[#2A3942] flex-1 rounded-full px-4 py-2 flex items-center border border-gray-100 shadow-inner">
            <input 
              type="text" 
              placeholder="Escribe un mensaje aquí..." 
              className="bg-transparent border-none outline-none w-full text-[#1F2937] placeholder:text-gray-500 text-sm py-1" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button 
            className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center hover:bg-[#008f6f] active:scale-95 transition-all shrink-0 shadow-lg text-[#1F2937] disabled:opacity-50"
            onClick={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={18} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      <ChatAnalytics 
        messages={messages} 
        isTyping={isTyping} 
        messagesEndRef={analyticsEndRef} 
        ticketStatus={ticketStatus}
      />
    </div>
  );
}

