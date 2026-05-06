import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketSeverity } from '@prisma/client';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateTicketDto {
  tenantId: string;

  @ApiProperty({ example: 'uuid-property-456' })
  @IsString()
  propertyId: string;

  @ApiProperty({ example: 'uuid-user-789' })
  @IsString()
  reportedByUserId: string;

  @ApiPropertyOptional({ example: 'uuid-workflow-000' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiProperty({ example: 'Fuga de agua en cocina' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Se evidencia goteo constante bajo el lavaplatos.' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, example: 'MEDIUM' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketSeverity, example: 'MEDIUM' })
  @IsOptional()
  @IsEnum(TicketSeverity)
  severity?: TicketSeverity;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  reportedByUserPhone?: string;

  @ApiPropertyOptional({ example: 'uuid-tech-321' })
  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @ApiPropertyOptional({ example: ['https://example.com/photo.jpg'] })
  @IsOptional()
  attachments?: any;
}
