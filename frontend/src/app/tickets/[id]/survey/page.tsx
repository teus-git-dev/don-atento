"use client";

import React, { use, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

function SurveyContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ticketId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketTitle, setTicketTitle] = useState<string | null>(null);

  const [stars, setStars] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Falta el token de seguridad en la URL.");
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const res = await apiClient.get<any>(
          `/tickets/${ticketId}/survey-info?token=${token}`
        );
        if (res?.title) {
          setTicketTitle(res.title);
        } else {
          setError("El ticket no fue encontrado o no está disponible para calificación.");
        }
      } catch (err: any) {
        setError(err?.message || "El enlace de la encuesta es inválido o ha expirado.");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [ticketId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) {
      setError("Por favor, selecciona una calificación (1 a 5 estrellas).");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await apiClient.patch<any>(`/tickets/${ticketId}/satisfaction?token=${token}`, {
        stars,
        comment,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al enviar la calificación. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[var(--color-primary)] p-6 text-center">
          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-black text-[var(--color-primary)] tracking-tight">
              DA
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Don Atento</h1>
          <p className="text-white/80 text-sm font-medium">Encuesta de Satisfacción</p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por calificarnos!</h2>
              <p className="text-gray-600 text-sm">
                Hemos registrado tu calificación exitosamente. Tus respuestas nos ayudan a seguir mejorando para ti.
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h2>
              <p className="text-gray-600 text-sm">{error}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {ticketTitle || "Ticket de Mantenimiento"}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  ¿Cómo calificarías el servicio prestado?
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 transition-all hover:scale-110 focus:outline-none"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setStars(star)}
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${
                        star <= (hoveredStar || stars)
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                          : "fill-gray-100 text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cuéntanos más sobre tu experiencia (Opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Hubo algo que el técnico hizo excepcionalmente bien o algo que podamos mejorar?"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all resize-none h-32"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting || stars === 0}
                className="w-full py-3 px-4 bg-[var(--color-primary)] hover:bg-blue-900 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  "Enviar Calificación"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" /></div>}>
      <SurveyContent params={params} />
    </Suspense>
  );
}
