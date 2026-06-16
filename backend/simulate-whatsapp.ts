import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import { WhatsappService } from './src/whatsapp/whatsapp.service';
import { RelationType } from '@prisma/client';

// ── Colores para consola ──────────────────────────────────────────────────────
const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  blue:  (s: string) => `\x1b[34m${s}\x1b[0m`,
  yellow:(s: string) => `\x1b[33m${s}\x1b[0m`,
  red:   (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan:  (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:  (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const capturedResponses: string[] = [];

async function bootstrap() {
  console.log(C.bold('\n🚀 ═══════════════════════════════════════════════════'));
  console.log(C.bold('   SIMULADOR E2E WhatsApp + AI (Baileys) — Incasa'));
  console.log(C.bold('═══════════════════════════════════════════════════\n'));

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'], // Silenciar logs de NestJS para output más limpio
  });
  
  const prisma = app.get(PrismaService);
  const whatsappService = app.get(WhatsappService);

  // ── Interceptar sendMessage para capturar respuestas del AI ──────────────
  const originalSendMessage = whatsappService.sendMessage.bind(whatsappService);
  whatsappService.sendMessage = async (to: string, text: string, tenantId?: string) => {
    capturedResponses.push(text);
    console.log(C.cyan('\n🤖 [Daniel AI — Respuesta WhatsApp]:'));
    console.log(C.cyan('┌─────────────────────────────────────────────────────'));
    text.split('\n').forEach(line => console.log(C.cyan(`│  ${line}`)));
    console.log(C.cyan('└─────────────────────────────────────────────────────\n'));
    // No enviar por Baileys/Meta en el simulador
  };

  try {
    // ── 1. Localizar Tenant Incasa ────────────────────────────────────────────
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error('No hay ningún tenant en la BD');
    console.log(C.green(`✅ Tenant: ${tenant.name} (${tenant.id})`));

    // ── 2. Crear/verificar usuario arrendatario de prueba ─────────────────────
    const testPhone = '573001112233';
    const testEmail = `arrendatario.sim.${Date.now()}@test.local`;

    let user = await prisma.user.findFirst({
      where: { phone: testPhone, tenantId: tenant.id }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: testEmail,
          passwordHash: 'SIM_HASH_NOT_REAL',
          firstName: 'Juliana',
          lastName: 'Arrendataria',
          phone: testPhone,
          role: 'TENANT_USER',
          tenantId: tenant.id
        }
      });
      console.log(C.green(`✅ Usuario creado: ${user.firstName} ${user.lastName} | ${testPhone}`));
    } else {
      console.log(C.green(`✅ Usuario existente: ${user.firstName} ${user.lastName} | ${testPhone}`));
    }

    // ── 3. Verificar propiedad y relación activa ──────────────────────────────
    let property = await prisma.property.findFirst({
      where: { tenantId: tenant.id }
    });
    if (!property) throw new Error('No hay propiedades en la BD. Crea una primero.');
    console.log(C.green(`✅ Propiedad: "${property.title || property.address}"`));

    let relation = await prisma.propertyRelation.findFirst({
      where: { propertyId: property.id, userId: user.id, status: 'ACTIVE' }
    });
    if (!relation) {
      relation = await prisma.propertyRelation.create({
        data: {
          propertyId: property.id,
          userId: user.id,
          relationType: RelationType.TENANT,
          startDate: new Date(),
          status: 'ACTIVE'
        }
      });
      console.log(C.green(`✅ Relación TENANT creada entre usuario y propiedad`));
    } else {
      console.log(C.green(`✅ Relación activa existente`));
    }

    // ── 4. Verificar workflow (requerido para crear tickets) ───────────────────
    let workflow = await prisma.workflow.findFirst({ where: { tenantId: tenant.id } });
    if (!workflow) {
      console.log(C.yellow('⚠️  No hay workflow. Creando uno básico...'));
      workflow = await prisma.workflow.create({
        data: { tenantId: tenant.id, name: 'Flujo Simulación WA' }
      });
    }
    console.log(C.green(`✅ Workflow: "${workflow.name}"`));

    // ═══════════════════════════════════════════════════════════════════════════
    // ESCENARIO 1 — Arrendatario saluda y reporta múltiples daños
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n' + C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(C.bold('  📱 ESCENARIO 1: Reporte de daño vía WhatsApp'));
    console.log(C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    const msg1 = 'Hola Incasa! Soy Juliana del apto 502. Tengo un problema urgente: se me rompió un tubo en la cocina que está botando agua, y además la ventana de la sala no cierra bien desde ayer.';
    console.log(C.blue(`\n🧑 [Juliana → Incasa]:`));
    console.log(C.blue(`   "${msg1}"`));

    await whatsappService.processIncomingMessage(testPhone, msg1, undefined, undefined, tenant.id);
    await delay(5000); // Respetar Rate Limit de Gemini (15 RPM free-tier)

    // Verificar tickets creados
    const ticketsE1 = await prisma.ticket.findMany({
      where: { reportedByUserId: user.id, tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: { subTickets: true }
    });
    if (ticketsE1.length > 0) {
      console.log(C.green(`\n📊 VALIDACIÓN BD — Tickets generados: ${ticketsE1.length}`));
      ticketsE1.forEach(t => {
        const tipo = t.parentTicketId ? '   └─ [Sub-Ticket]' : '   [Ticket Padre]';
        console.log(C.green(`${tipo} "${t.title}" | Estado: ${t.severity}`));
      });
    } else {
      console.log(C.yellow(`\n⚠️  Sin tickets en BD. El AI puede haber pedido confirmación (flujo de desambiguación).`));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ESCENARIO 1B — Confirmar creación del ticket (si el AI preguntó "¿Es un caso nuevo?")
    // ═══════════════════════════════════════════════════════════════════════════
    const lastResponse1 = capturedResponses[capturedResponses.length - 1] || '';
    if (lastResponse1.includes('0') && (lastResponse1.includes('nuevo') || lastResponse1.includes('activo'))) {
      console.log('\n' + C.bold('  📱 ESCENARIO 1B: Confirmando caso nuevo (respuesta "0")'));
      const msg1b = '0';
      console.log(C.blue(`\n🧑 [Juliana → Incasa]: "${msg1b}" (Caso nuevo)`));
      await whatsappService.processIncomingMessage(testPhone, msg1b, undefined, undefined, tenant.id);
      await delay(2000);
      const ticketsE1b = await prisma.ticket.findMany({
        where: { reportedByUserId: user.id, tenantId: tenant.id },
        orderBy: { createdAt: 'desc' }
      });
      console.log(C.green(`\n📊 Tickets tras confirmación: ${ticketsE1b.length}`));
      ticketsE1b.forEach(t => {
        const tipo = t.parentTicketId ? '   └─ [Sub-Ticket]' : '   [Ticket Padre]';
        console.log(C.green(`${tipo} "${t.title}"`));
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ESCENARIO 2 — Arrendatario consulta el estado de su caso
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n' + C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(C.bold('  📱 ESCENARIO 2: Consulta de estado de caso'));
    console.log(C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    const msg2 = '¿Cómo va mi caso del tubo? ¿Ya lo van a arreglar?';
    console.log(C.blue(`\n🧑 [Juliana → Incasa]:`));
    console.log(C.blue(`   "${msg2}"`));
    await whatsappService.processIncomingMessage(testPhone, msg2, undefined, undefined, tenant.id);
    await delay(5000); // Respetar Rate Limit de Gemini

    // ═══════════════════════════════════════════════════════════════════════════
    // ESCENARIO 3 — Despedida
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n' + C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(C.bold('  📱 ESCENARIO 3: Despedida cortés'));
    console.log(C.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    const msg3 = 'Muchas gracias Daniel. Espero que lo solucionen pronto. Que tengas buen día.';
    console.log(C.blue(`\n🧑 [Juliana → Incasa]:`));
    console.log(C.blue(`   "${msg3}"`));
    await whatsappService.processIncomingMessage(testPhone, msg3, undefined, undefined, tenant.id);
    await delay(5000); // Respetar Rate Limit de Gemini

    // ═══════════════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n' + C.bold('═══════════════════════════════════════════════════'));
    console.log(C.bold('   📋 RESUMEN DE SIMULACIÓN'));
    console.log(C.bold('═══════════════════════════════════════════════════'));

    const allTickets = await prisma.ticket.findMany({
      where: { reportedByUserId: user.id, tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    });
    const allInteractions = await prisma.ticketInteraction.findMany({
      where: { tenantId: tenant.id, userId: user.id }
    });

    console.log(C.green(`\n✅ Total mensajes AI capturados: ${capturedResponses.length}`));
    console.log(C.green(`✅ Total tickets en BD: ${allTickets.length}`));
    console.log(C.green(`✅ Total interacciones registradas: ${allInteractions.length}`));

    if (capturedResponses.length === 0) {
      console.log(C.yellow('\n⚠️  ADVERTENCIA: No se capturaron respuestas del AI.'));
      console.log(C.yellow('   Posibles causas:'));
      console.log(C.yellow('   1. El API key de OpenAI/Anthropic no está configurado en .env'));
      console.log(C.yellow('   2. El usuario no fue encontrado por búsqueda de teléfono'));
      console.log(C.yellow('   3. No hay relación activa con una propiedad'));
    }

    if (allTickets.length > 0) {
      console.log(C.bold('\n📁 Tickets creados:'));
      allTickets.forEach(t => {
        const tipo = t.parentTicketId ? '  └─ Sub-Ticket:' : '  🎫 Padre:';
        console.log(`${tipo} "${t.title}"`);
      });
      console.log(C.green('\n✅ PRUEBA SUPERADA: El flujo de creación de tickets via WhatsApp funciona.'));
    } else {
      console.log(C.yellow('\n⚠️  No se crearon tickets. Revisa los logs arriba.'));
    }

    console.log(C.bold('\n═══════════════════════════════════════════════════\n'));

  } catch (error) {
    console.error(C.red('\n❌ Error en simulación:'), error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
