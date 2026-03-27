import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketSeverity } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'uuid-tenant-123' })
  tenantId: string;

  @ApiProperty({ example: 'uuid-property-456' })
  propertyId: string;

  @ApiProperty({ example: 'uuid-user-789' })
  reportedByUserId: string;

  @ApiPropertyOptional({ example: 'uuid-workflow-000' })
  workflowId?: string;

  @ApiProperty({ example: 'Fuga de agua en cocina' })
  title: string;

  @ApiProperty({ example: 'Se evidencia goteo constante bajo el lavaplatos.' })
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, example: 'MEDIUM' })
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketSeverity, example: 'MEDIUM' })
  severity?: TicketSeverity;

  @ApiPropertyOptional({ example: '+573001234567' })
  reportedByUserPhone?: string;

  @ApiPropertyOptional({ example: 'uuid-tech-321' })
  assignedTechnicianId?: string;

  @ApiPropertyOptional({ example: ['https://example.com/photo.jpg'] })
  attachments?: any;
}
