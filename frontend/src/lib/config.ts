/**
 * Configuración global del tenant activo (Incasa NC Group).
 * Cambiar este valor para apuntar a un cliente diferente.
 */
export const TENANT_ID = 'incasa-tenant-id';
export const API_URL = 'http://localhost:3051';

/**
 * ID del usuario admin del tenant activo.
 * Se usa como reportedByUserId en tickets creados manualmente.
 */
export const ADMIN_USER_ID = 'FETCH_ON_LOAD'; // Se obtiene dinámicamente
