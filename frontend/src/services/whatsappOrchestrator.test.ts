import { processMessage, detectIntent, Intent, resetLog, orchestrationLog } from './whatsappOrchestrator';

describe('whatsappOrchestrator', () => {
  beforeEach(() => {
    resetLog();
  });

  describe('detectIntent', () => {
    test('should detect GREETING intent', () => {
      expect(detectIntent('Hola Don Atento')).toBe(Intent.GREETING);
      expect(detectIntent('Buenos días')).toBe(Intent.GREETING);
    });

    test('should detect MAINTENANCE_REQUEST intent', () => {
      expect(detectIntent('El calentador no funciona')).toBe(Intent.MAINTENANCE_REQUEST);
      expect(detectIntent('Tengo un daño en la cocina')).toBe(Intent.MAINTENANCE_REQUEST);
    });

    test('should detect PHOTO_SUBMISSION intent', () => {
      expect(detectIntent('Aquí te envío la foto')).toBe(Intent.PHOTO_SUBMISSION);
      expect(detectIntent('Te mando un video')).toBe(Intent.PHOTO_SUBMISSION);
    });

    test('should detect CONFIRMATION intent', () => {
      expect(detectIntent('Sí, perfecto')).toBe(Intent.CONFIRMATION);
      expect(detectIntent('Claro que sí')).toBe(Intent.CONFIRMATION);
    });

    test('should detect GOODBYE intent', () => {
      expect(detectIntent('No, gracias')).toBe(Intent.GOODBYE);
    });

    test('should return UNKNOWN for unrecognized input', () => {
      expect(detectIntent('¿Cómo estás?')).toBe(Intent.UNKNOWN);
    });
  });

  describe('processMessage', () => {
    test('should return a greeting response', async () => {
      const response = await processMessage('Hola', []);
      expect(response.content).toContain('Soy Don Atento');
      expect(response.role).toBe('assistant');
    });

    test('should log messages in orchestrationLog', async () => {
      await processMessage('Hola', []);
      // Should have 2 messages: 1 user, 1 assistant
      expect(orchestrationLog.length).toBe(2);
      expect(orchestrationLog[0].role).toBe('user');
      expect(orchestrationLog[1].role).toBe('assistant');
    });

    test('should return maintenance request response', async () => {
        const response = await processMessage('El calentador está roto', []);
        expect(response.content).toContain('He detectado un reporte de falla');
    });
  });
});
