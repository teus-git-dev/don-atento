"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  Link2Off, 
  Webhook, 
  QrCode, 
  ShieldCheck, 
  Activity, 
  Info,
  Clock
} from "lucide-react";
import { authService } from "@/services/authService";
import { QRCodeSVG } from "qrcode.react";

type ProviderType = 'meta' | 'baileys';

interface HealthMetrics {
  messagesLastHour: number;
  messagesLast24h: number;
  uniqueContactsToday: number;
  hourUsagePercent: number;
  dayUsagePercent: number;
  warningLevel: 'GREEN' | 'YELLOW' | 'RED';
  limits: {
    MAX_MESSAGES_PER_HOUR: number;
    MAX_MESSAGES_PER_DAY: number;
    MAX_NEW_CONTACTS_PER_DAY: number;
  };
}

export default function WhatsAppConfigCard() {
  const [activeTab, setActiveTab] = useState<ProviderType>('meta');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  
  // Meta State
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [metaStatus, setMetaStatus] = useState<'unconfigured' | 'configured'>('unconfigured');
  const [currentPhoneId, setCurrentPhoneId] = useState<string | null>(null);
  const [currentTokenMasked, setCurrentTokenMasked] = useState<string | null>(null);

  // Baileys State
  const [baileysStatus, setBaileysStatus] = useState<'connected' | 'disconnected' | 'qr_required' | 'connecting'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [polling, setPolling] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const webhookUrl = `${BACKEND_URL}/whatsapp/webhook`;
  // Webhook verification token — configured in Meta Dashboard (not a secret).
  // Set NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN in your .env.local to override.
  const webhookVerifyToken = process.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN ?? 'don-atento-webhook';

  const fetchStatus = useCallback(async () => {
    try {
      const token = authService.getToken();
      const res = await fetch(`${BACKEND_URL}/tenants/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        
        // Meta Config
        if (data.whatsappConfigured) {
          setMetaStatus('configured');
          setCurrentPhoneId(data.whatsappPhoneNumberId);
          setCurrentTokenMasked(data.whatsappAccessTokenMasked);
        } else {
          setMetaStatus('unconfigured');
        }

        // Provider preference
        if (data.whatsappProvider) {
          setActiveTab(data.whatsappProvider as ProviderType);
        }

        // Fetch Baileys status if preferred or check anyway
        await fetchBaileysStatus();
      }
    } catch (err) {
      console.error("Error fetching tenant status:", err);
    } finally {
      setChecking(false);
    }
  }, [BACKEND_URL]);

  const fetchBaileysStatus = async () => {
    try {
      const token = authService.getToken();
      const res = await fetch(`${BACKEND_URL}/baileys/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBaileysStatus(data.status);
        setQrCode(data.qr);
        setHealth(data.health);
        
        // Start polling if qr_required or connecting
        if (data.status === 'qr_required' || data.status === 'connecting') {
          setPolling(true);
        } else {
          setPolling(false);
        }
      }
    } catch (err) {
      console.error("Error fetching Baileys status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (polling) {
      interval = setInterval(fetchBaileysStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [polling]);

  // --- Handlers Meta ---
  const handleSaveMeta = async () => {
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
        setFeedback({ type: 'success', msg: '¡WhatsApp (Meta) conectado exitosamente!' });
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

  const handleDisconnectMeta = async () => {
    if (!confirm('¿Deseas desconectar WhatsApp de Meta?')) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      await fetch(`${BACKEND_URL}/tenants/whatsapp-disconnect`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetaStatus('unconfigured');
      setCurrentPhoneId(null);
      setCurrentTokenMasked(null);
      setFeedback({ type: 'success', msg: 'WhatsApp Meta desconectado.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers Baileys ---
  const handleConnectBaileys = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const token = authService.getToken();
      const res = await fetch(`${BACKEND_URL}/baileys/connect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setBaileysStatus(data.status);
        if (data.qr) setQrCode(data.qr);
        setPolling(true);
      } else {
        setFeedback({ type: 'error', msg: data.message || 'Error al conectar Baileys.' });
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Error de conexión con Baileys.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectBaileys = async () => {
    if (!confirm('¿Deseas desconectar la sesión de Baileys?')) return;
    setLoading(true);
    try {
      const token = authService.getToken();
      await fetch(`${BACKEND_URL}/baileys/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setBaileysStatus('disconnected');
      setQrCode(null);
      setPolling(false);
      setFeedback({ type: 'success', msg: 'Sesión de Baileys cerrada.' });
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

  const isConfigured = activeTab === 'meta' ? metaStatus === 'configured' : baileysStatus === 'connected';

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConfigured ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Proveedor de WhatsApp</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Configuración del Agente</p>
          </div>
        </div>

        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('meta')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'meta' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Webhook size={14} /> Oficial (Meta)
          </button>
          <button
            onClick={() => setActiveTab('baileys')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'baileys' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <QrCode size={14} /> Gratuito (Baileys)
          </button>
        </div>
      </div>

      {/* Meta Tab Content */}
      {activeTab === 'meta' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {metaStatus === 'configured' ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Meta API Conectada</h4>
                  <div className="flex flex-col text-xs text-gray-400 mt-0.5">
                    <span>Phone ID: <code className="text-gray-300">{currentPhoneId}</code></span>
                    <span>Token: <code className="text-gray-300">{currentTokenMasked}</code></span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnectMeta}
                disabled={loading}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <Link2Off size={14} /> Desconectar
              </button>
            </div>
          ) : (
            <div className="bg-black/30 border border-white/8 rounded-2xl p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Configuración Meta Cloud API</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Ideal para inmobiliarias con alto volumen que requieren estabilidad total de Meta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Phone Number ID</label>
                  <input
                    type="text"
                    placeholder="Ej: 1234567890..."
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Permanent Access Token</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      placeholder="EAA..."
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                    />
                    <button onClick={() => setShowToken(!showToken)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveMeta}
                disabled={loading || !phoneNumberId || !accessToken}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Guardar Configuración Meta
              </button>
            </div>
          )}

          {/* Webhook Settings (only for Meta) */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-white font-semibold text-xs flex items-center gap-2 uppercase tracking-widest">
              <Activity size={14} className="text-blue-400" /> Webhook Endpoints
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Callback URL</span>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 bg-black/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-blue-300 font-mono overflow-hidden text-ellipsis whitespace-nowrap">{webhookUrl}</code>
                  <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-400">Copiar</button>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Verify Token</span>
                <div className="flex gap-2 mt-1">
                  <code className="flex-1 bg-black/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-blue-300 font-mono">{webhookVerifyToken}</code>
                  <button onClick={() => navigator.clipboard.writeText(webhookVerifyToken)} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-400">Copiar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Baileys Tab Content */}
      {activeTab === 'baileys' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {baileysStatus === 'connected' ? (
            <div className="space-y-6">
              {/* Connected Header */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">WhatsApp Baileys Activo</h4>
                    <p className="text-xs text-gray-400">Sesión vinculada correctamente y protegida.</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectBaileys}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Link2Off size={14} /> Cerrar Sesión
                </button>
              </div>

              {/* Anti-Ban Health Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <ShieldCheck size={18} className="text-blue-400" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      health?.warningLevel === 'GREEN' ? 'bg-green-500/10 text-green-400' : 
                      health?.warningLevel === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {health?.warningLevel || 'GREEN'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nivel de Seguridad</p>
                    <h5 className="text-lg text-white font-bold mt-1">Protocolo Activo</h5>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[9px] text-gray-600">Simulación de typing y jitter gaussiano activados para evitar bloqueos.</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Activity size={18} className="text-purple-400" />
                    <span className="text-[10px] text-gray-400 font-bold">{health?.messagesLastHour || 0}/{health?.limits?.MAX_MESSAGES_PER_HOUR || 25}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Mensajes / Hora</p>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${health?.hourUsagePercent || 0}%` }}></div>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-600">Uso actual de la cuota de seguridad horaria.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Clock size={18} className="text-orange-400" />
                    <span className="text-[10px] text-gray-400 font-bold">{health?.messagesLast24h || 0}/{health?.limits?.MAX_MESSAGES_PER_DAY || 250}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Mensajes / 24h</p>
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${health?.dayUsagePercent || 0}%` }}></div>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-600">Uso acumulado diario de envíos permitidos.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 border border-white/8 rounded-2xl p-8 flex flex-col items-center text-center space-y-6">
              {baileysStatus === 'qr_required' && qrCode ? (
                <>
                  <div className="relative">
                    <div className="absolute -inset-4 bg-white/5 blur-xl rounded-full"></div>
                    <div className="relative bg-white p-4 rounded-3xl shadow-2xl">
                      <QRCodeSVG value={qrCode} size={200} level="H" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-white font-bold text-lg">Escanea el código QR</h4>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Abre WhatsApp en tu teléfono → Configuración → Dispositivos vinculados → Vincular un dispositivo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Esperando vinculación...</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-[#25D366]/10 rounded-3xl flex items-center justify-center text-[#25D366]">
                    <QrCode size={40} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-white font-bold text-lg">Vincular vía Baileys (Gratis)</h4>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                      Utiliza tu propia línea de WhatsApp escaneando un QR. Sin costos de Meta, pero requiere mayor precaución.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectBaileys}
                    disabled={loading}
                    className="px-8 py-3 bg-[#25D366] hover:bg-[#128C7E] text-black font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)] flex items-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                    Generar Código QR
                  </button>
                  <p className="text-[10px] text-gray-600 italic">
                    * Al vincular, aceptas que Don Atento operará bajo el protocolo de WA Web.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Baileys Instructions */}
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-white font-semibold text-xs flex items-center gap-2 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-orange-400" /> Consejos Anti-Baneo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-gray-400">
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-orange-500/10 rounded flex items-center justify-center text-orange-400 shrink-0 font-bold">1</div>
                <p>Usa un número con al menos 15 días de antigüedad y uso manual previo.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-orange-500/10 rounded flex items-center justify-center text-orange-400 shrink-0 font-bold">2</div>
                <p>No realices envíos masivos proactivos a personas que no te han escrito.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-orange-500/10 rounded flex items-center justify-center text-orange-400 shrink-0 font-bold">3</div>
                <p>Si el bot alcanza el límite diario, se pausará automáticamente para protegerte.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 bg-orange-500/10 rounded flex items-center justify-center text-orange-400 shrink-0 font-bold">4</div>
                <p>Responde siempre a los inquilinos desde el mismo hilo de conversación.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Feedback */}
      {feedback && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2 ${
          feedback.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
