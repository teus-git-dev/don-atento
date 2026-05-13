import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferPropertyDto {
  @ApiProperty({
    description: 'User ID of the new owner (must belong to caller tenant)',
  })
  @IsString()
  @MinLength(1)
  newOwnerId!: string;

  @ApiPropertyOptional({
    description: 'User ID of the new tenant/arrendatario (optional)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  newTenantId?: string;

  @ApiProperty({
    description: 'Effective date of the transfer (ISO 8601)',
    example: '2026-06-01T00:00:00Z',
  })
  @IsDateString()
  startDate!: string;
}
