import Image from "next/image";
import Link from "next/link";
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 sm:p-24 relative overflow-hidden">
      {/* Background Orbs Effect */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-neon-blue)] rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[var(--color-neon-cyan)] rounded-full blur-[100px] opacity-15 pointer-events-none" />

      {/* Main Glass Container */}
      <div className="glass p-10 sm:p-16 rounded-3xl max-w-4xl w-full text-center relative z-10 flex flex-col items-center gap-8">
        
        {/* Hero Image */}
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 drop-shadow-[0_0_30px_rgba(0,112,243,0.5)]">
          <Image src="/hero_brain.png" alt="Cerebro IA - Don IQ" fill className="object-contain" priority />
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
          Don <span className="text-glow-cyan text-[var(--color-neon-cyan)]">IQ</span>
        </h1>
        
        <h2 className="text-xl sm:text-2xl font-medium text-gray-300">
          Arquitectura Cognitiva Inmobiliaria
        </h2>

        {/* Description */}
        <p className="text-gray-400 max-w-2xl text-base sm:text-lg leading-relaxed">
          Plataforma avanzada que fusiona la gestión inmobiliaria tradicional con Inteligencia Artificial,
          visión computacional y modelos predictivos para maximizar el ROI de cada inmueble.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <Link href="/login" className="bg-[var(--color-neon-blue)] text-white px-8 py-3 rounded-full font-medium hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,112,243,0.4)]">
            Ingresar al Sistema
          </Link>
          <Link href="/login-teus" className="glass px-8 py-3 rounded-full font-medium hover:bg-white/5 transition-colors">
            Acceso Teus AI
          </Link>
        </div>
      </div>
    </main>
  );
}
