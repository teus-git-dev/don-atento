"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
let EmailService = class EmailService {
    async sendEmail(to, subject, body, attachments) {
        console.log(`[Email Service] Sending to ${to}...`);
        console.log(`[Subject] ${subject}`);
        console.log(`[Body Snippet] ${body.substring(0, 100)}...`);
        if (attachments && attachments.length > 0) {
            console.log(`[Attachments] ${attachments.map((a) => a.filename).join(', ')}`);
        }
        return { success: true, messageId: `mock-msg-${Date.now()}` };
    }
    async sendFormalReport(to, propertyTitle, reportContent) {
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
    async sendSurveyRequest(to, ticketTitle, surveyLink) {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)()
], EmailService);
//# sourceMappingURL=email.service.js.map