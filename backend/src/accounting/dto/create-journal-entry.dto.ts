import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TransactionLineDto } from './transaction-line.dto';

/**
 * Body for `POST /accounting/journal-entries`.
 *
 * `tenantId`, `createdByUserId`, `status` are intentionally NOT
 * accepted from the body — the controller injects tenantId / userId
 * from the JWT, and Block A forces status = DRAFT regardless of
 * input. `whitelist: true` strips any of those if a stale client
 * still sends them.
 *
 * `isAutomated` is also gone — Block A removed the POSTED-from-body
 * bypass.
 */
export class CreateJournalEntryDto {
  @ApiPropertyOptional({
    description: 'Fecha del asiento (ISO-8601). Default: now()',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Tipo de documento (Comprobante de Egreso, Factura, etc.)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  documentType!: string;

  @ApiPropertyOptional({ description: 'Número del documento soporte' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  documentNumber?: string;

  @ApiProperty({ description: 'Descripción del asiento' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    type: [TransactionLineDto],
    description:
      'Líneas del asiento (mínimo 2 — doble partida; máximo 50 por asiento)',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TransactionLineDto)
  lines!: TransactionLineDto[];
}
