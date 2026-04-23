"use client";

import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Link2Off, Webhook } from "lucide-react";
import { authService } from "@/services/authService";

export default function WhatsAppConfigCard() {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<'unconfigured' | 'configured'>('unconfigured');
  const [currentPhoneId, setCurrentPhoneId] = useState<string | null>(null);
  const [currentTokenMasked, setCurrentTokenMasked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const webhookUrl = `${BACKEND_URL}/whatsapp/webhook`;
  const verifyToken = 'don_atento_verify_2024';

  const fetchStatus = async () => {
    setChecking(true);
    try {
      const token = authService.getToken();
      const res = await fetch(`${BACKEND_URL}/tenants/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.whatsappConfigured) {
          setStatus('configured');
          setCurrentPhoneId(data.whatsappPhoneNumberId);
          setCurrentTokenMasked(data.whatsappAccessTokenMasked);
        } else {
          setStatus('unconfigured');
        }
      }
    } catch {
      setStatus('unconfigured');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSave = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      setFeedback({ type: 'error', msg: 'Ambos campos son obligatorios.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const token = authService.getToken();
      const res = await fetch(`${BACKEND_URL}/tenants/whatsapp-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ whatsappPhoneNumberId: phoneNumberId, whatsappAccessToken: accessToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', msg: '¡WhatsApp conectado exitosamente!' });
        setPhoneNumberId('');
        setAccessToken('');
        await fetchStatus();
      } else {
        setFeedback({ type: 'error', msg: data.message || 'Error al guardar.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Deseas desconectar WhatsApp de esta organización?')) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      await fetch(`${BACKEND_URL}/tenants/whatsapp-disconnect`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus('unconfigured');
      setCurrentPhoneId(null);
      setCurrentTokenMasked(null);
      setFeedback({ type: 'success', msg: 'WhatsApp desconectado.' });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`rounded-2xl border p-6 flex items-center gap-5 ${
        status === 'configured' ? 'bg-green-500/5 border-green-500/20' : 'bg-white/3 border-white/8'
      }`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
          status === 'configured' ? 'bg-green-500/10' : 'bg-[#128C7E]/10'
        }`}>
          <MessageSquare size={28} className={status === 'configured' ? 'text-green-400' : 'text-[#25D366]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">WhatsApp Business</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              status === 'configured'
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
            }`}>
              {status === 'configured' ? '● ACTIVO' : '○ SIN CONECTAR'}
            </span>
          </div>
          {status === 'configured' ? (
            <div className="space-y-0.5">
              <p className="text-xs text-gray-400 truncate">
                Phone Number ID: <span className="text-white font-mono">{currentPhoneId}</span>
              </p>
              <p className="text-xs text-gray-400">
                Token: <span className="text-white font-mono">{currentTokenMasked}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Vincula tu número de WhatsApp Business para activar el agente Don Atento.
            </p>
          )}
        </div>
        {status === 'configured' && (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors shrink-0"
          >
            <Link2Off size={14} /> Desconectar
          </button>
        )}
      </div>

      {/* Form */}
      {status === 'unconfigured' && (
        <div className="bg-black/30 border border-white/8 rounded-2xl p-6 space-y-6">
          <div>
            <h4 className="text-white font-semibold mb-1">Conectar número de WhatsApp Business</h4>
            <p className="text-xs text-gray-500">
              Obtén estos datos en{' '}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer"
                className="text-[var(--color-neon-cyan)] hover:underline">
                developers.facebook.com
              </a>{' '}
              → Tu App → WhatsApp → Configuración de API
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Phone Number ID
              </label>
              <input
                id="wp-phone-number-id"
                type="text"
                placeholder="Ej: 123456789012345"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:border-[var(--color-neon-cyan)]/50 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-600">
                Número de 15 dígitos que identifica tu línea en Meta.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Token de Acceso Permanente
              </label>
              <div className="relative">
                <input
                  id="wp-access-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="EAAxxxxxxx..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm font-mono text-white focus:border-[var(--color-neon-cyan)]/50 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-600">
                Token permanente (no el temporal). Genéralo en Meta Business → Usuarios del Sistema.
              </p>
            </div>
          </div>

          {feedback && (
            <div className={`flex items-center gap-3 p-4 rounded-xl text-sm animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {feedback.msg}
            </div>
          )}

          <button
            id="wp-connect-btn"
            onClick={handleSave}
            disabled={loading || !phoneNumberId || !accessToken}
            className="w-full py-3 bg-[#25D366] text-black font-bold rounded-xl text-sm hover:bg-[#128C7E] hover:text-white transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              : <><MessageSquare size={16} /> Conectar WhatsApp</>}
          </button>
        </div>
      )}

      {/* Webhook Info */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-6 space-y-4">
        <h4 className="text-white font-semibold text-sm flex items-center gap-2">
          <Webhook size={16} className="text-[var(--color-neon-blue)]" />
          Configuración del Webhook en Meta
        </h4>
        <p className="text-xs text-gray-400">
          Pega estos valores en{' '}
          <strong className="text-white">Meta for Developers → Tu App → WhatsApp → Configuración → Webhook</strong>:
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
              URL del Webhook
            </label>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--color-neon-cyan)] font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                {webhookUrl}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="text-xs text-gray-400 hover:text-white px-3 py-2.5 border border-white/10 rounded-xl hover:border-white/20 transition-colors whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
              Token de Verificación
            </label>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[var(--color-neon-cyan)] font-mono">
                {verifyToken}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(verifyToken)}
                className="text-xs text-gray-400 hover:text-white px-3 py-2.5 border border-white/10 rounded-xl hover:border-white/20 transition-colors whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4 text-[11px] text-gray-400 space-y-1.5">
          <p className="font-bold text-white text-xs mb-2">📋 Guía Rápida (5 pasos):</p>
          <p>1. Ve a <span className="text-white font-medium">developers.facebook.com</span> e ingresa a tu App de WhatsApp</p>
          <p>2. En <strong className="text-white">WhatsApp → Configuración de API</strong> copia el <strong className="text-white">Phone Number ID</strong></p>
          <p>3. En <strong className="text-white">Configuración → Usuarios del sistema</strong> genera un <strong className="text-white">token permanente</strong> con permisos <code className="text-[var(--color-neon-cyan)]">whatsapp_business_messaging</code></p>
          <p>4. Pega los datos arriba y haz clic en <strong className="text-white">Conectar WhatsApp</strong></p>
          <p>5. En <strong className="text-white">WhatsApp → Webhook</strong> pega la URL y el token y suscríbete al campo <code className="text-[var(--color-neon-cyan)]">messages</code></p>
        </div>
      </div>
    </div>
  );
}
