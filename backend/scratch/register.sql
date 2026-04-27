INSERT INTO User (id, email, passwordHash, firstName, lastName, phone, tenantId, role, isActive, createdAt)
VALUES ('usr_john_demo', 'john.carvajal@demo.com', 'dummy', 'John', 'Carvajal', '3011900962', 'teus-tenant-id', 'OWNER', 1, CURRENT_TIMESTAMP)
ON CONFLICT(email) DO UPDATE SET phone='3011900962', firstName='John', lastName='Carvajal';

INSERT INTO Property (id, tenantId, propertyType, title, address, city, department, country, status, isActive, createdAt)
VALUES ('prop_demo_maestro', 'teus-tenant-id', 'APARTMENT', 'Apartamento Demo - Maestro', 'Carrera 7 # 100-20', 'Bogotá', 'Cundinamarca', 'Colombia', 'AVAILABLE', 1, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO NOTHING;

INSERT INTO PropertyRelation (id, propertyId, userId, relationType, startDate, status)
VALUES ('rel_john_demo', 'prop_demo_maestro', 'usr_john_demo', 'OWNER', CURRENT_TIMESTAMP, 'ACTIVE')
ON CONFLICT(id) DO UPDATE SET status='ACTIVE';
