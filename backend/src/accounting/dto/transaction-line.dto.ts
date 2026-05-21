import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator that enforces XOR semantics on (debit, credit):
 * a line must have ONE side > 0, never both. A line with debit=100
 * and credit=100 is mathematically a no-op but semantically ambiguous
 * — accounting requires the explicit direction.
 *
 * `debit=0 && credit=0` is also rejected (an empty line is noise).
 */
@ValidatorConstraint({ name: 'IsValidDoubleEntryLine', async: false })
class IsValidDoubleEntryLineConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { debit?: number; credit?: number };
    const d = obj.debit ?? 0;
    const c = obj.credit ?? 0;
    if (d <= 0 && c <= 0) return false; // empty line
    if (d > 0 && c > 0) return false; // both sides — ambiguous
    return true;
  }
  defaultMessage(): string {
    return 'Cada línea debe tener exactamente UNO de debit o credit mayor a cero.';
  }
}

export class TransactionLineDto {
  @ApiProperty({ description: 'AccountingAccount.id del tenant' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  accountId!: string;

  @ApiPropertyOptional({ description: 'Monto débito (positivo)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  debit?: number;

  @ApiPropertyOptional({ description: 'Monto crédito (positivo)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  credit?: number;

  @ApiPropertyOptional({ description: 'Tercero (AccountingThirdParty.id)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  thirdPartyId?: string;

  @ApiPropertyOptional({ description: 'Property.id si aplica' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Descripción de la línea' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Synthetic field exclusively for the @Validate decorator. The
   *  custom constraint reads debit/credit from the object. */
  @Validate(IsValidDoubleEntryLineConstraint)
  private readonly __doubleEntryGuard?: never;
}
