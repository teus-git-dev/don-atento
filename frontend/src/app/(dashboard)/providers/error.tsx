"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ProvidersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Providers] Runtime error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
      <div className="glass p-10 rounded-[2rem] border border-red-500/20 max-w-lg w-full text-center">
        <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
        <h2 className="text-xl font-bold text-white mb-2">Error al cargar Proveedores</h2>
        <p className="text-sm text-gray-400 mb-6 font-mono break-all">
          {error.message || "Error inesperado en el cliente"}
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-[var(--color-neon-cyan)] text-black font-bold rounded-xl hover:opacity-90 transition-all"
        >
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    </div>
  );
}
