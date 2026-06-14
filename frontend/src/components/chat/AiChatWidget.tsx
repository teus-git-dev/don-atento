"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { chatService, ChatMessage } from "@/services/chatService";

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll if we are open
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'msg-welcome',
          role: 'ia',
          content: '¡Hola! Soy Don IQ, el Cerebro de Marca de tu inmobiliaria. Tengo acceso a las métricas del CRM, tickets y más. ¿En qué te puedo ayudar hoy?',
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'usuario',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(userMessage.content, messages);
      
      const aiMessage: ChatMessage = {
        id: `msg-ia-${Date.now()}`,
        role: 'ia',
        content: response.reply,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'ia',
        content: 'Ocurrió un error al contactar al Cerebro de Marca. Inténtalo de nuevo más tarde.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-[#1E3A8A] text-[#1F2937] rounded-full shadow-[0_0_20px_rgba(0,112,243,0.5)] hover:scale-105 transition-transform flex items-center justify-center group"
          aria-label="Hablar con Don IQ"
        >
          <Bot size={28} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] h-[600px] max-h-[85vh] bg-white shadow-sm border border-gray-200 rounded-2xl flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5 duration-300 border border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gray-50 backdrop-blur-md p-4 flex justify-between items-center border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1E3A8A]/20 flex items-center justify-center border border-[#1E3A8A]/50">
                <Bot size={20} className="text-[#1E3A8A]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F2937] text-sm">Don IQ IA</h3>
                <p className="text-[10px] text-[#10B981] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block"></span>
                  Conectado al Cerebro
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-500 hover:text-[#1F2937] rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'usuario' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex gap-3 shrink-0 items-center justify-center ${
                  msg.role === 'usuario' ? 'bg-gray-100' : 'bg-[#1E3A8A]/20 text-[#1E3A8A]'
                  }`}
                >
                  {msg.role === 'usuario' ? <User size={14} /> : <Bot size={14} />}
                </div>
                
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'usuario' 
                    ? 'bg-[#1E3A8A] text-[#1F2937] rounded-tr-sm shadow-[0_4px_15px_rgba(0,112,243,0.3)]' 
                    : 'bg-white/15 text-gray-200 rounded-tl-sm border border-gray-200 shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-[#1E3A8A]/20 text-[#1E3A8A]">
                  <Bot size={14} />
                </div>
                <div className="bg-gray-50 text-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#10B981]" />
                  <span className="text-xs text-gray-500">Analizando contexto...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-black/60 backdrop-blur-md border-t border-gray-200">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntame sobre inmuebles o métricas..."
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm text-[#1F2937] focus:outline-none focus:border-[#1E3A8A]/50 transition-colors"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-[#1E3A8A] rounded-full text-[#1F2937] hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-[#1E3A8A] transition-colors"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
