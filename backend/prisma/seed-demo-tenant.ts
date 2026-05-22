process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const tenantName = 'DonAtento Demo Comercial';
  const tenantNit = '901.999.888-7';
  
  console.log(`Starting Demo Data population for ${tenantName}...`);

  // 1. Ensure Subscription Plan
  let plan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Plan Demo' } });
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Plan Demo',
        priceMonthly: 0,
        maxProperties: 100,
        maxUsers: 10
      }
    });
  }

  // 2. Create Tenant
  let tenant = await prisma.tenant.findFirst({ where: { name: tenantName } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        nit: tenantNit,
        status: 'ACTIVE',
        subscriptionPlanId: plan.id,
      }
    });
    console.log(`Created tenant: ${tenant.name}`);
  } else {
    console.log(`Tenant already exists: ${tenant.name}`);
  }

  const passwordHash = await bcrypt.hash('demo123', 10);

  // 3. Create Demo Users
  const usersToCreate = [
    { email: 'demo@donatento.app', firstName: 'Administrador', lastName: 'Demo', role: UserRole.ADMIN_TENANT },
    { email: 'propietario@donatento.app', firstName: 'Juan', lastName: 'Propietario', role: UserRole.OWNER },
    { email: 'inquilino@donatento.app', firstName: 'Maria', lastName: 'Inquilina', role: UserRole.TENANT_USER },
    { email: 'agente@donatento.app', firstName: 'Laura', lastName: 'Comercial', role: UserRole.AGENT },
    { email: 'tecnico@donatento.app', firstName: 'Carlos', lastName: 'Mantenimiento', role: UserRole.TECHNICIAN }
  ];

  const createdUsers: any = {};
  for (const u of usersToCreate) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          tenantId: tenant.id,
          passwordHash,
          isActive: true
        }
      });
      console.log(`Created user: ${user.email} (${user.role})`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });
    }
    createdUsers[u.role] = user;
  }

  // 4. Workflows
  let workflow = await prisma.workflow.findFirst({ where: { tenantId: tenant.id, name: "Flujo Demo Reparaciones" } });
  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        tenantId: tenant.id,
        name: "Flujo Demo Reparaciones",
        description: "Mantenimientos correctivos demo",
        states: {
          create: [
            { name: "Reportado", order: 1, color: "#94a3b8" },
            { name: "Asignado", order: 2, color: "#38bdf8", assignedRole: 'TECHNICIAN' },
            { name: "En Proceso", order: 3, color: "#fbbf24" },
            { name: "Resuelto", order: 5, color: "#22c55e" }
          ]
        }
      }
    });
  }
  const states = await prisma.workflowState.findMany({ where: { workflowId: workflow.id }, orderBy: { order: 'asc' } });

  // 5. Create Properties & Tickets & CRM Prospects
  const propertyCount = await prisma.property.count({ where: { tenantId: tenant.id } });
  if (propertyCount < 10) {
    console.log('Generating 10 Demo Properties...');
    for (let i = 1; i <= 10; i++) {
      const prop = await prisma.property.create({
        data: {
          tenantId: tenant.id,
          propertyType: i % 2 === 0 ? 'APARTMENT' : 'HOUSE',
          title: `Inmueble Demo ${i} - Excelente Ubicación`,
          description: 'Inmueble espectacular con vista panorámica, ideal para demostración.',
          address: `Calle ${100 + i} # ${10 + i} - ${i * 2}`,
          city: 'Bogotá',
          department: 'Cundinamarca',
          country: 'Colombia',
          status: i % 3 === 0 ? 'RENTED' : 'AVAILABLE',
          rentAmount: 2000000 + (i * 150000),
          isActive: true,
          workflowId: workflow.id,
        }
      });

      // Ticket
      await prisma.ticket.create({
        data: {
          tenantId: tenant.id,
          propertyId: prop.id,
          reportedByUserId: createdUsers[UserRole.TENANT_USER].id,
          assignedTechnicianId: createdUsers[UserRole.TECHNICIAN].id,
          workflowId: workflow.id,
          currentStateId: states[i % states.length].id,
          title: `Revisión Demo ${i}`,
          description: `El inquilino reportó un incidente en el inmueble ${i}.`,
          priority: 'MEDIUM',
          severity: 'LOW',
        }
      });
      
      // Prospect
      await prisma.prospect.create({
        data: {
          tenantId: tenant.id,
          firstName: `Prospecto Demo ${i}`,
          email: `prospecto${i}@test.com`,
          status: i % 2 === 0 ? 'NEW' : 'QUALIFIED',
          assignedAgentId: createdUsers[UserRole.AGENT].id,
          sentiment: 'POSITIVE'
        }
      });
    }
    console.log('Properties, Tickets, and Prospects generated.');
  }

  // 6. Generate Providers (Proveedores)
  const providerCount = await prisma.provider.count({ where: { tenantId: tenant.id } });
  if (providerCount === 0) {
    console.log('Generating 5 high-impact Providers...');
    const providersData = [
      {
        name: 'Plomería Eléctrica Express SAS',
        nit: '901.444.333-1',
        email: 'contacto@plomeriaexpress.co',
        phone: '+573105551234',
        address: 'Calle 72 # 13 - 55, Bogotá',
        specialty: 'PLUMBING',
        status: 'ACTIVE',
        rating: 4.8,
        contactName: 'Julio',
        contactLastName: 'Vergara',
        contactId: '79888999',
        contactPhone: '+573105551235',
        legalArl: 'ARL SURA - Certificado Vigente',
        legalSst: true,
        legalPolicyNumber: 'POL-PL-998822',
      },
      {
        name: 'Soluciones Eléctricas e Iluminación S.A.',
        nit: '900.222.111-2',
        email: 'servicio@solucioneselectricas.com',
        phone: '+573154445566',
        address: 'Carrera 15 # 85 - 12, Bogotá',
        specialty: 'ELECTRICAL',
        status: 'ACTIVE',
        rating: 4.9,
        contactName: 'Andrés',
        contactLastName: 'Gómez',
        contactId: '1018222333',
        contactPhone: '+573154445567',
        legalArl: 'ARL Bolívar - Nivel 3',
        legalSst: true,
        legalPolicyNumber: 'POL-EL-112233',
      },
      {
        name: 'Pintores y Acabados de la Sabana',
        nit: '800.111.999-5',
        email: 'sabana.pinturas@gmail.com',
        phone: '+573203332211',
        address: 'Calle 134 # 45 - 67, Bogotá',
        specialty: 'PAINTING',
        status: 'ACTIVE',
        rating: 4.7,
        contactName: 'Mauricio',
        contactLastName: 'Pardo',
        contactId: '80123456',
        contactPhone: '+573203332212',
        legalArl: 'ARL Positiva - Vigente',
        legalSst: true,
        legalPolicyNumber: 'POL-PI-445566',
      },
      {
        name: 'Climatización y Aires Acondicionados Bogotá',
        nit: '901.888.777-3',
        email: 'soporte@climabogota.com',
        phone: '+573129998877',
        address: 'Avenida Eldorado # 69 - 20, Bogotá',
        specialty: 'AC_HEATING',
        status: 'ACTIVE',
        rating: 4.6,
        contactName: 'Diana',
        contactLastName: 'Restrepo',
        contactId: '52999888',
        contactPhone: '+573129998878',
        legalArl: 'ARL SURA - Riesgo 4',
        legalSst: true,
        legalPolicyNumber: 'POL-CL-778899',
      },
      {
        name: 'Mantenimiento General y Obras Civiles SAS',
        nit: '902.111.000-8',
        email: 'gerencia@obrasgenerales.co',
        phone: '+573007776655',
        address: 'Carrera 30 # 45 - 10, Bogotá',
        specialty: 'GENERAL',
        status: 'ACTIVE',
        rating: 4.5,
        contactName: 'Carlos',
        contactLastName: 'Herrera',
        contactId: '79222333',
        contactPhone: '+573007776656',
        legalArl: 'ARL Colpatria - Vigente',
        legalSst: true,
        legalPolicyNumber: 'POL-GEN-102030',
      }
    ];

    for (const prov of providersData) {
      const p = await prisma.provider.create({
        data: {
          tenantId: tenant.id,
          ...prov as any
        }
      });
      console.log(`Created provider: ${p.name}`);
    }
  }

  // 7. Brand Brain (Cerebro de Marca)
  const brandBrainCount = await prisma.brandBrain.count({ where: { tenantId: tenant.id } });
  if (brandBrainCount === 0) {
    console.log('Configuring Brand Brain...');
    await prisma.brandBrain.create({
      data: {
        tenantId: tenant.id,
        tone: 'FRIENDLY',
        policies: 'Nuestra inmobiliaria se rige por la Ley 820 de 2003 de Colombia. Los daños causados por el desgaste natural del inmueble (humedades estructurales, tuberías internas rotas, daños eléctricos generales) son responsabilidad del Propietario. Los daños por mal uso, descuido o mantenimiento preventivo básico (bombillos, empaques de grifería desgastados por el uso diario) son responsabilidad del Inquilino. Todo reporte debe ser validado por la IA antes de asignar un técnico.',
        faq: [
          {
            question: '¿Quién paga los arreglos de plomería?',
            answer: 'Si es una tubería rota interna o humedad estructural, lo asume el propietario. Si es un grifo goteando por empaque desgastado o sifón obstruido por residuos del inquilino, lo asume el inquilino.'
          },
          {
            question: '¿Cuál es el tiempo de respuesta para una urgencia?',
            answer: 'Las emergencias (ej. inundación total, corte total de energía) se atienden en menos de 4 horas. Daños medios se atienden en 24-48 horas.'
          },
          {
            question: '¿Cómo reporto un daño?',
            answer: 'Puedes reportarlo directamente a través de nuestro canal de WhatsApp enviando una foto o video del daño para que nuestra IA lo pre-diagnostique.'
          }
        ],
        responseRules: 'Saludar amablemente usando el nombre del usuario. Ser claro, empático y profesional. Recordar que las decisiones sobre costos de reparación se toman con base en la Ley 820 de 2003. Siempre ofrecer enviar un técnico de nuestra red certificada.'
      }
    });
    console.log('Brand Brain configured.');
  } else {
    // If it exists, update it to make sure the structure is correct
    console.log('Updating existing Brand Brain for frontend compatibility...');
    await prisma.brandBrain.update({
      where: { tenantId: tenant.id },
      data: {
        tone: 'FRIENDLY',
        policies: 'Nuestra inmobiliaria se rige por la Ley 820 de 2003 de Colombia. Los daños causados por el desgaste natural del inmueble (humedades estructurales, tuberías internas rotas, daños eléctricos generales) son responsabilidad del Propietario. Los daños por mal uso, descuido o mantenimiento preventivo básico (bombillos, empaques de grifería desgastados por el uso diario) son responsabilidad del Inquilino. Todo reporte debe ser validado por la IA antes de asignar un técnico.',
        faq: [
          {
            question: '¿Quién paga los arreglos de plomería?',
            answer: 'Si es una tubería rota interna o humedad estructural, lo asume el propietario. Si es un grifo goteando por empaque desgastado o sifón obstruido por residuos del inquilino, lo asume el inquilino.'
          },
          {
            question: '¿Cuál es el tiempo de respuesta para una urgencia?',
            answer: 'Las emergencias (ej. inundación total, corte total de energía) se atienden en menos de 4 horas. Daños medios se atienden en 24-48 horas.'
          },
          {
            question: '¿Cómo reporto un daño?',
            answer: 'Puedes reportarlo directamente a través de nuestro canal de WhatsApp enviando una foto o video del daño para que nuestra IA lo pre-diagnostique.'
          }
        ],
        responseRules: 'Saludar amablemente usando el nombre del usuario. Ser claro, empático y profesional. Recordar que las decisiones sobre costos de reparación se toman con base en la Ley 820 de 2003. Siempre ofrecer enviar un técnico de nuestra red certificada.'
      }
    });
  }

  // 8. Data Import Logs
  const importLogCount = await prisma.dataImportLog.count({ where: { tenantId: tenant.id } });
  if (importLogCount === 0) {
    console.log('Simulating Data Import history...');
    
    // Create a template first
    const template = await prisma.dataImportTemplate.create({
      data: {
        tenantId: tenant.id,
        name: 'Plantilla Excel Inmuebles Standard',
        categoryId: 'PROPERTY',
        mapping: {
          "Dirección": "address",
          "Título": "title",
          "Tipo": "propertyType",
          "Canon": "rentAmount",
          "Descripción": "description",
          "Ciudad": "city"
        }
      }
    });

    await prisma.dataImportLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          templateId: template.id,
          fileName: 'Carga_Inicial_Propiedades_2026.xlsx',
          sourceTag: 'EXCEL_IMPORT_PROPERTIES_DEMO',
          status: 'SUCCESS',
          recordsRead: 10,
          recordsSaved: 10,
          errors: []
        },
        {
          tenantId: tenant.id,
          templateId: null,
          fileName: 'Clientes_Propietarios_Migracion.csv',
          sourceTag: 'CSV_IMPORT_OWNERS_DEMO',
          status: 'PARTIAL',
          recordsRead: 15,
          recordsSaved: 12,
          errors: [
            { row: 4, error: "El correo electrónico ya existe en el sistema." },
            { row: 9, error: "El formato de número de celular no es válido en Colombia." },
            { row: 12, error: "Falta el número de documento de identidad obligatorio." }
          ]
        }
      ]
    });
    console.log('Data Import history simulated.');
  }

  console.log("Demo seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
