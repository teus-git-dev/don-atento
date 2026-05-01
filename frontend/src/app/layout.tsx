import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import ClientMountWrapper from "@/components/layout/ClientMountWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Don IQ | Arquitectura Cognitiva Inmobiliaria",
  description: "Plataforma SaaS Inmobiliaria potenciada con IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${montserrat.variable} dark`}>
      <body className="antialiased min-h-screen">
        <ClientMountWrapper>
          {children}
        </ClientMountWrapper>
      </body>
    </html>
  );
}
