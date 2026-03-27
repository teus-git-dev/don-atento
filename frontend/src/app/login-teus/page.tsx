"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";
import { authService } from "@/services/authService";

export default function LoginTeus() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded Teus validation
    if (username === "teus" && password === "teus2024") {
      authService.loginAs("SUPERADMIN");
    } else {
      setError("Credenciales incorrectas. Acceso restringido.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[150px] opacity-20 pointer-events-none" />
      
      <div className="glass p-10 rounded-3xl max-w-md w-full relative z-10 border border-purple-500/20 shadow-[0_0_40px_rgba(168,85,247,0.15)] animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
            <ShieldCheck size={32} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Acceso Exclusivo Teus</h1>
          <p className="text-xs text-purple-400 font-mono uppercase tracking-widest">God Mode Auth</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Usuario Administrativo</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="teus"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Contraseña Maestra</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="••••••••"
              />
              <Lock size={16} className="absolute right-3 top-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs text-center font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-purple-600 text-white rounded-xl py-3 font-bold text-sm tracking-wide hover:bg-purple-500 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] mt-2"
          >
            ENTRAR COMO TEUS
          </button>
        </form>
      </div>
    </div>
  );
}
