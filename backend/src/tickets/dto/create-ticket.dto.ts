import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { TicketPriority, TicketSeverity } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTicketDto {
  /**
   * Injected by the controller from `req['tenantId']`. The field exists
   * in the DTO so that the global ValidationPipe doesn't strip it
   * before the controller overwrites it, but the API contract treats
   * it as server-set — clients sending it are ignored (and rejected
   * with 400 if `forbidNonWhitelisted` flags an unknown field shape).
   */
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({ example: 'uuid-property-456' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  propertyId!: string;

  @ApiProperty({ example: 'uuid-user-789' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  reportedByUserId!: string;

  @ApiPropertyOptional({ example: 'uuid-workflow-000' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  workflowId?: string;

  @ApiProperty({ example: 'Fuga de agua en cocina' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Se evidencia goteo constante bajo el lavaplatos.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

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
  @MaxLength(32)
  reportedByUserPhone?: string;

  @ApiPropertyOptional({ example: 'uuid-tech-321' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedTechnicianId?: string;

  // `attachments` accepts heterogeneous payloads from vision pipelines,
  // file-upload responses and bulk imports. Element-level shape is
  // validated at the service layer when the data is consumed (e.g.
  // `addAttachment` enforces an https-only URL allowlist). DTO-level
  // we cap to 20 items max to bound payload size.
  @ApiPropertyOptional({ example: ['https://example.com/photo.jpg'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  attachments?: any;
}
