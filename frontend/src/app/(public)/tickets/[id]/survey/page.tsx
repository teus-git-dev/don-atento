"use client";

import { useState, useEffect } from "react";
import { Star, CheckCircle2, Send, Loader2 } from "lucide-react";
import { API_URL, TENANT_ID } from "@/lib/config";
import { useParams } from "next/navigation";

export default function TicketSurveyPage() {
  const { id } = useParams();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    // Fetch basic ticket info to show what they are rating
    fetch(`${API_URL}/tickets/${id}?tenantId=${TENANT_ID}`)
      .then(res => res.json())
      .then(data => setTicket(data))
      .catch(err => console.error(err));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tickets/${id}/satisfaction`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Survey submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0b10] flex items-center justify-center p-6">
        <div className="glass max-w-md w-full p-12 rounded-[3rem] text-center border border-white/10 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 size={40} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Muchas Gracias!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tu opinión es fundamental para que Don Atento siga mejorando la experiencia en tu hogar.
          </p>
          <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Teus Intelligence System</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b10] flex items-center justify-center p-6">
      <div className="glass max-w-lg w-full p-8 md:p-12 rounded-[3.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10 text-center">
          <div className="inline-block px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">
            Encuesta de Satisfacción
          </div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight leading-tight">
            ¿Cómo fue tu experiencia con <span className="text-[var(--color-neon-blue)]">Don Atento</span>?
          </h1>
          <p className="text-gray-400 text-sm mb-12 max-w-sm mx-auto leading-relaxed">
            {ticket ? `Califica la resolución de: "${ticket.title}"` : "Tu opinión nos ayuda a brindarte un mejor servicio."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Star Rating */}
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStars(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-all transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    size={42}
                    className={`transition-colors duration-300 ${
                      (hover || stars) >= star 
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                        : "text-gray-700 fill-transparent"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment Area */}
            <div className="space-y-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black block text-left pl-2">Comentarios Adicionales</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntanos más sobre cómo podemos mejorar..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all min-h-[120px] resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={stars === 0 || loading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 ${
                stars === 0 
                  ? "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5" 
                  : "bg-[var(--color-neon-blue)] text-white hover:bg-blue-600 shadow-[0_0_30px_rgba(0,112,243,0.3)] active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={18} /> Enviar Calificación
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
