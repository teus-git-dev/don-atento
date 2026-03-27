import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import PDFDocument = require('pdfkit');

@Injectable()
export class InventoryReportService {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
  ) {}

  async generateInventoryPDF(propertyId: string): Promise<Buffer> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        relations: {
          include: { user: true }
        },
        zones: {
          include: { items: true }
        },
        meterReadings: true,
        accessItems: true
      }
    });

    if (!property) {
      throw new Error('Property not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header - Branding
      doc.rect(0, 0, 612, 100).fill('#000000');
      doc.fillColor('#FFFFFF').fontSize(24).text('DON IQ', 50, 40);
      doc.fontSize(10).text('REPORTE DE INVENTARIO AUTÓNOMO - CICLO DE VIDA', 50, 70);
      doc.fontSize(10).text(`FECHA: ${new Date().toLocaleDateString()}`, 450, 40);
      doc.text(`REF: ${property.propertyCode}`, 450, 55);

      doc.moveDown(4);

      // Property Info
      doc.fillColor('#0070F3').fontSize(14).text('DATOS DEL INMUEBLE', 50);
      doc.rect(50, doc.y + 2, 512, 1).fill('#0070F3');
      doc.moveDown();
      
      doc.fillColor('#333333').fontSize(10);
      doc.text(`Referencia: ${property.propertyCode}`, 60);
      doc.text(`Título: ${property.title}`, 60);
      doc.text(`Dirección: ${property.address}`, 60);
      doc.text(`Ciudad: ${property.city}`, 60);
      
      doc.moveDown();

      // Titular Info
      const owner = property.relations.find((r: any) => r.relationType === 'OWNER')?.user;
      const tenant = property.relations.find((r: any) => r.relationType === 'TENANT')?.user;

      if (owner) {
        doc.fillColor('#0070F3').fontSize(12).text('PROPIETARIO', 50);
        doc.fillColor('#333333').fontSize(10).text(`Nombre: ${owner.firstName} ${owner.lastName || ''}`, 60);
        doc.text(`Documento: ${owner.governmentId || 'N/A'}`, 60);
        doc.moveDown(0.5);
      }

      if (tenant) {
        doc.fillColor('#0070F3').fontSize(12).text('ARRENDATARIO', 50);
        doc.fillColor('#333333').fontSize(10).text(`Nombre: ${tenant.firstName} ${tenant.lastName || ''}`, 60);
        doc.text(`Documento: ${tenant.governmentId || 'N/A'}`, 60);
        doc.moveDown(0.5);
      }

      doc.moveDown();

      // Inventory Content
      doc.fillColor('#0070F3').fontSize(14).text('DETALLE DE INVENTARIO', 50);
      doc.rect(50, doc.y + 2, 512, 1).fill('#0070F3');
      doc.moveDown();

      // Zones and Items
        for (const zone of property.zones) {
          doc.fillColor('#000000').fontSize(11).text(zone.name.toUpperCase(), 50, undefined, { underline: true });
          doc.moveDown(0.5);

          for (const item of zone.items as any[]) {
            doc.fillColor('#333333').fontSize(9).text(`${item.name} (${item.quantity || 1} ${item.material || ''}): `, 70, undefined, { continued: true });
            
            let condColor = '#666666';
            if (item.condition === 'EXCELLENT') condColor = '#10B981';
            if (item.condition === 'GOOD') condColor = '#3B82F6';
            if (item.condition === 'REGULAR') condColor = '#F59E0B';
            if (item.condition === 'BAD') condColor = '#EF4444';
            
            doc.fillColor(condColor).text(item.condition);
            doc.fillColor('#666666').fontSize(8).text(`Notas: ${item.comments || item.description || 'Sin novedad'}`, 80);
            doc.moveDown(0.5);
          }
          doc.moveDown();
        }

      // Footer - Disclaimer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fillColor('#999999').fontSize(8).text(
          'Este documento fue generado automáticamente por el sistema Don Atento IA. La firma digital vinculada a este reporte tiene validez contractual.',
          50, 750, { align: 'center', width: 512 }
        );
      }

      doc.end();
    });
  }

  async sendInventoryReport(propertyId: string, type: 'CHECK_IN' | 'CHECK_OUT') {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        relations: { include: { user: true } }
      }
    });

    if (!property) return;

    const owner = property.relations.find((r: any) => r.relationType === 'OWNER')?.user;
    const tenant = property.relations.find((r: any) => r.relationType === 'TENANT')?.user;
    
    if (type === 'CHECK_IN' || (type as any) === 'DELIVERY') {
      if (owner?.phone) {
        await this.whatsapp.sendMessage(owner.phone, `✨ Don IQ: Tu reporte de inventario (${type}) para ${property.address} ya está listo.`);
      }
      if (tenant?.phone) {
        await this.whatsapp.sendMessage(tenant.phone, `✨ Don IQ: Tu reporte de inventario (${type}) para ${property.address} ya está listo.`);
      }
    } else {
      console.log('Notifying Incasa of Check-out PDF (Internal Only)');
    }
  }
}
