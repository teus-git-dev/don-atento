import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: { filename: string; [key: string]: unknown }[],
  ) {
    // In a real scenario, this would use nodemailer or a service like SendGrid/SES
    console.log(`[Email Service] Sending to ${to}...`);
    console.log(`[Subject] ${subject}`);
    console.log(`[Body Snippet] ${body.substring(0, 100)}...`);

    if (attachments && attachments.length > 0) {
      console.log(
        `[Attachments] ${attachments.map((a) => a.filename).join(', ')}`,
      );
    }

    return { success: true, messageId: `mock-msg-${Date.now()}` };
  }

  async sendFormalReport(
    to: string,
    propertyTitle: string,
    reportContent: string,
  ) {
    const subject = `Reporte de Estado de Propiedad: ${propertyTitle}`;
    const formalBody = `
      ESTIMADO PROPIETARIO,
      
      Don Atento Intelligence ha generado un nuevo reporte para su inmueble "${propertyTitle}".
      
      --- DETALLES DEL REPORTE ---
      ${reportContent}
      
      ---
      Este es un mensaje automático generado por el sistema de gestión predictiva Teus.
      Para más detalles, consulte su panel de propietario en la plataforma.
      
      Cordialmente,
      Don Atento Brand Brain
    `;

    return this.sendEmail(to, subject, formalBody);
  }

  async sendSurveyRequest(to: string, ticketTitle: string, surveyLink: string) {
    const subject = `Encuesta de Satisfacción: ${ticketTitle}`;
    const body = `
      Hola,
      
      Tu requerimiento "${ticketTitle}" ha sido resuelto. Para nosotros es muy importante conocer tu opinión.
      
      Por favor, califica nuestro servicio en el siguiente enlace:
      ${surveyLink}
      
      ¡Gracias por confiar en Don Atento!
    `;
    return this.sendEmail(to, subject, body);
  }
}
