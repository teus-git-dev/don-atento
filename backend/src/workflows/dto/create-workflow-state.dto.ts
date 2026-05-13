import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { WorkflowStateDto } from './workflow-state.dto';

/**
 * Body for `POST /workflows/states`. Extends `WorkflowStateDto` with the
 * required `workflowId` reference; the controller forwards the
 * caller's `tenantId` separately to the service for the cross-tenant
 * ownership check.
 */
export class CreateWorkflowStateDto extends WorkflowStateDto {
  @ApiProperty({ example: 'cuid-workflow-123' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  workflowId!: string;
}
