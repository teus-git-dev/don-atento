import { brainService } from "./brainService";
import { tenantService } from "./tenantService";

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
  sentiment?: Sentiment;
  ticketState?: string;
};

export enum Sentiment {
  ANGRY = "ANGRY",
  NEUTRAL = "NEUTRAL",
  HAPPY = "HAPPY"
}

export enum Intent {
  GREETING = "GREETING",
  MAINTENANCE_REQUEST = "MAINTENANCE_REQUEST",
  PHOTO_SUBMISSION = "PHOTO_SUBMISSION",
  CONFIRMATION = "CONFIRMATION",
  GOODBYE = "GOODBYE",
  STATUS_QUERY = "STATUS_QUERY",
  UNKNOWN = "UNKNOWN"
}

// Stateful simulation store
let simulatedTicketId: string | null = null;
let currentBpmState = "TRIAGE"; // TRIAGE, ASSIGNMENT, IN_PROGRESS, RESOLVED

export let orchestrationLog: ChatMessage[] = [];

export function resetLog() {
  orchestrationLog = [];
}

export function getSimulatedState() {
  return { id: simulatedTicketId, state: currentBpmState };
}

export function resetSimulation() {
  simulatedTicketId = null;
  currentBpmState = "TRIAGE";
}

export function detectSentiment(input: string): Sentiment {
  const normalized = input.toLowerCase();
  const negativeWords = ["mal", "terrible", "peor", "enojado", "falla", "urgente", "ayuda", "malo", "pesimo", "cansado"];
  const positiveWords = ["gracias", "perfecto", "bueno", "excelente", "lindo", "bien", "genial", "vale"];
  
  let score = 0;
  negativeWords.forEach(w => { if (normalized.includes(w)) score--; });
  positiveWords.forEach(w => { if (normalized.includes(w)) score++; });

  if (score < 0) return Sentiment.ANGRY;
  if (score > 0) return Sentiment.HAPPY;
  return Sentiment.NEUTRAL;
}

export function detectIntent(input: string): Intent {
  const normalized = input.toLowerCase();
  if (normalized.includes("hola") || normalized.includes("buenos")) return Intent.GREETING;
  
  // keywords for maintenance/damage
  const maintenanceKeywords = [
    "calentador", "daño", "roto", "falla", "rotura", "fuga", "gotera", 
    "problema", "humedad", "corto", "electricidad", "agua", "inundacion",
    "incendio", "llave", "chapata", "vidrio"
  ];
  if (maintenanceKeywords.some(k => normalized.includes(k))) return Intent.MAINTENANCE_REQUEST;

  if (normalized.includes("foto") || normalized.includes("video") || normalized.includes("aqui esta"))
    return Intent.PHOTO_SUBMISSION;
  if (normalized.includes("como va") || normalized.includes("estado")) return Intent.STATUS_QUERY;
  if (normalized.includes("si") || normalized.includes("claro") || normalized.includes("perfecto") || normalized.includes("dale")) return Intent.CONFIRMATION;
  if (normalized.includes("no") || normalized.includes("gracias") || normalized.includes("adios")) return Intent.GOODBYE;
  return Intent.UNKNOWN;
}

export async function processMessage(input: string, history: ChatMessage[]): Promise<ChatMessage> {
  const currentTenant = tenantService.getCurrentTenant();
  let brain = { tone: 'DEFAULT', policies: '', responseRules: '' };
  
  try {
    if (currentTenant) {
      const data = await brainService.getBrain(currentTenant.id);
      if (data) brain = data as any;
    }
  } catch (e) {
    console.warn("Using default brain for simulation");
  }

  const intent = detectIntent(input);
  const sentiment = detectSentiment(input);

  let responsePrefix = "";
  if (brain.tone === 'PROFESSIONAL') responsePrefix = "Estimado cliente, ";
  if (brain.tone === 'FRIENDLY') responsePrefix = "¡Hola! ";
  if (brain.tone === 'SALES') responsePrefix = "¡Excelente oportunidad! ";

  const tenantName = currentTenant?.name || "Don IQ";
  let responseText = `${responsePrefix}Soy Don Atento, el cerebro digital de ${tenantName}. Estoy analizando su solicitud con prioridad bajo nuestras políticas vigentes.`;
  
  const statusAssurance = brain.tone === 'PROFESSIONAL' 
    ? " Permítanos asegurarle que estamos monitoreando los tiempos de respuesta para cumplir con nuestros estándares de excelencia."
    : " No te preocupes, estoy siguiendo tu caso muy de cerca para que todo salga perfecto.";

  switch (intent) {
    case Intent.GREETING:
      if (brain.tone === 'SALES') {
          responseText = "¡Qué gusto saludarte! En Inmobiliaria Horizonte estamos listos para ayudarte a encontrar el hogar de tus sueños o resolver cualquier duda técnica con la mejor actitud. ¿Cómo podemos brillar hoy?";
      } else {
          responseText = sentiment === Sentiment.ANGRY 
            ? `${responsePrefix}Lamento profundamente que estés pasando por este inconveniente. Como asistente de ${tenantName}, mi prioridad es darle una solución inmediata.` 
            : `${responsePrefix}Soy Don Atento, tu asistente inteligente. Es un gusto saludarte. ¿En qué puedo colaborar con tu inmueble hoy?`;
      }
      break;

    case Intent.MAINTENANCE_REQUEST:
      currentBpmState = "TRIAGE";
      simulatedTicketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
      const urgency = (input.toLowerCase().includes("urgente") || input.toLowerCase().includes("rotura") || input.toLowerCase().includes("inundacion")) ? "ALTA" : "MEDIA";
      const caseTitle = input.length > 30 ? input.substring(0, 27) + "..." : input;
      
      const policyMention = brain.policies ? ` (Siguiendo nuestras políticas: ${brain.policies.substring(0, 50)}...)` : "";
      
      responseText = `He detectado un reporte de falla. Don Atento ha procedido a la creación automática de este caso:\n\n` +
                     `📄 **Ticket:** #${simulatedTicketId}\n` +
                     `👤 **Cliente:** Juan Pérez (Inquilino)\n` +
                     `📌 **Caso:** ${caseTitle}\n` +
                     `⚖️ **Urgencia:** ${urgency}\n\n` +
                     `Lamentamos el inconveniente.${policyMention} Para que Atento-Vision procese el diagnóstico, **por favor envíame una foto o video del daño ahora mismo.**`;
      break;

    case Intent.PHOTO_SUBMISSION:
      simulatedTicketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
      currentBpmState = "ASSIGNMENT";
      responseText = `¡Evidencia recibida! He generado el Ticket #${simulatedTicketId}. Basado en mi análisis Atento-Vision, ya tenemos un diagnóstico preliminar. El cerebro de ${tenantName} ya está orquestando la solución.`;
      break;

    case Intent.STATUS_QUERY:
      if (simulatedTicketId) {
        responseText = `Tu ticket #${simulatedTicketId} se encuentra actualmente en estado: **${currentBpmState}**. El cerebro de marca está supervisando que todo fluya correctamente.${statusAssurance}`;
      } else {
        responseText = "He revisado tu historial y no encuentro tickets abiertos en este momento. Sin embargo, dímelo y lo gestionaremos de inmediato.";
      }
      break;

    case Intent.CONFIRMATION:
      if (currentBpmState === "ASSIGNMENT") {
        currentBpmState = "IN_PROGRESS";
        responseText = `¡Excelente! Todo confirmado por el cerebro Atento. El técnico ya ha sido notificado.`;
      } else {
        responseText = "¡Perfecto! Quedo a tu disposición para cualquier otra gestión.";
      }
      break;

    case Intent.GOODBYE:
      responseText = "¡Ha sido un placer asistirte! Don Atento seguirá aquí para cuando lo necesites.";
      break;

    default:
      responseText = brain.responseRules 
        ? `He captado tu mensaje. Siguiendo mis instrucciones personalizadas: ${brain.responseRules.substring(0, 100)}...`
        : "Disculpa, no logré captar tu solicitud exacta. ¿Deseas reportar una falla o consultar un ticket?";
  }

  const assistantMessage: ChatMessage = {
    id: Date.now().toString(),
    role: "assistant",
    content: responseText,
    timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    sentiment,
    ticketState: currentBpmState
  };

  orchestrationLog.push({
    id: (Date.now() - 1).toString(),
    role: "user",
    content: input,
    timestamp: new Date().toLocaleTimeString()
  });
  
  orchestrationLog.push(assistantMessage);

  return assistantMessage;
}

