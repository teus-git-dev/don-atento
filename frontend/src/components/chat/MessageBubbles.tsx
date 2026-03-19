"use client";

import { CheckCheck, Bot, User, Frown, Smile, HelpCircle } from "lucide-react";
import { ChatMessage, Sentiment } from "@/services/whatsappOrchestrator";

export const SystemMessage = ({ content }: { content: string }) => (
  <div className="flex justify-center animate-in fade-in duration-500">
    <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl text-xs text-yellow-500/80 border border-yellow-500/20 text-center max-w-[85%] font-mono">
      {content}
    </div>
  </div>
);

export const UserBubble = ({ message }: { message: ChatMessage }) => (
  <div className="flex justify-end animate-in fade-in slide-in-from-right-4 duration-300">
    <div className="bg-[#056162] text-[#E9EDEF] p-2.5 rounded-2xl rounded-tr-none max-w-[80%] shadow-md border border-white/5 relative group">
      <p className="text-[15px] leading-relaxed pr-2">{message.content}</p>
      <div className="flex items-center justify-end gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px]">{message.timestamp}</span>
        <CheckCheck size={14} className="text-blue-400" />
      </div>
    </div>
  </div>
);

export const AssistantBubble = ({ message }: { message: ChatMessage }) => {
  const SentimentIcon = () => {
    switch (message.sentiment) {
      case Sentiment.ANGRY: return <Frown size={14} className="text-red-400" />;
      case Sentiment.HAPPY: return <Smile size={14} className="text-green-400" />;
      default: return <HelpCircle size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="bg-[#202C33] text-[#E9EDEF] p-2.5 rounded-2xl rounded-tl-none max-w-[80%] shadow-md border border-[var(--color-neon-cyan)]/20 relative group">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="p-1 bg-black/20 rounded-md mr-1 flex items-center gap-1">
            <span className="text-[8px] font-mono text-gray-500 uppercase">Sentiment:</span>
            <SentimentIcon />
          </div>
          <span className="text-[10px]">{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export const TypingIndicator = () => (
  <div className="flex justify-start animate-in fade-in duration-300">
    <div className="bg-[#202C33] p-3 rounded-2xl rounded-tl-none border border-[var(--color-neon-cyan)]/30 flex gap-1 items-center">
      <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)]/60 animate-bounce"></div>
      <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)]/60 animate-bounce delay-75"></div>
      <div className="w-2 h-2 rounded-full bg-[var(--color-neon-cyan)]/60 animate-bounce delay-150"></div>
    </div>
  </div>
);
