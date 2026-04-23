import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Configuración Multi-Tenant de WhatsApp ---');

  // Busca el Tenant principal (o puedes especificar un ID concreto)
  const tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.error('❌ No se encontró ningún Tenant en la base de datos.');
    return;
  }

  // ⚠️ REEMPLAZA CON LOS VALORES REALES OBTENIDOS DE META FOR DEVELOPERS
  const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1234567890';
  const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'EAXXXXX...';

  try {
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        whatsappPhoneNumberId,
        whatsappAccessToken,
      },
    });

    console.log(`✅ ¡Éxito! Credenciales de WhatsApp asociadas al Tenant: ${updatedTenant.name}`);
    console.log(`Phone ID: ${updatedTenant.whatsappPhoneNumberId}`);
    console.log(`Token configurado correctamente.`);
  } catch (error) {
    console.error('❌ Error al actualizar el Tenant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
