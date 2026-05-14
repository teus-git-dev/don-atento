import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /accounting/journal-entries/:id/annul`. The reason
 * is required because annulments are themselves audit-trail events —
 * an asiento que se anula sin motivo registrado pierde la justificación
 * legal de la operación. Mirror del patrón "approveContract requires
 * approval reason" en CRM.
 */
export class AnnulJournalEntryDto {
  @ApiProperty({
    description: 'Motivo de la anulación (requerido para audit trail)',
    example: 'Asiento duplicado por error de digitación.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
