import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Nested state shape used inside `CreateWorkflowDto.states`. Also used
 * (without `order` validation across siblings) as the body of
 * `POST /workflows/states`.
 *
 * SLA bounds: 1h..168h (1 week). Anything else either makes no sense
 * (zero / negative ⇒ retroactive deadline in SlaMatrixService) or
 * exceeds what the dashboard ageing logic was designed around.
 */
export class WorkflowStateDto {
  @ApiProperty({ example: 'Diagnóstico' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'Position in the workflow (1-based)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  order!: number;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Role expected to act on the ticket while in this state',
  })
  @IsOptional()
  @IsEnum(UserRole)
  assignedRole?: UserRole;

  @ApiPropertyOptional({ description: 'Specific user ID assigned to the state' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assignedUserId?: string;

  @ApiPropertyOptional({
    description:
      'LLM instructions for state-specific assistant behavior (max 4000 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  aiInstructions?: string;

  @ApiPropertyOptional({
    description: 'SLA in hours (1..168). Drives SlaMatrixService deadlines.',
    example: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  slaHours?: number;

  @ApiPropertyOptional({
    description:
      'Color for dashboard badges: either a hex (#RRGGBB) or one of the Tailwind palette keywords used by the configuracion UI (cyan, blue, green, ...). Max 32 chars.',
    example: '#FF8800',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^(#[0-9A-Fa-f]{6}|[a-z]{1,32})$/, {
    message:
      'color debe ser un hex de 6 dígitos (#RRGGBB) o un keyword en minúsculas.',
  })
  color?: string;
}
