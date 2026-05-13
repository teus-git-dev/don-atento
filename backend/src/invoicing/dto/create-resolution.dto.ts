import {
  IsDateString,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResolutionDto {
  @IsString()
  @Matches(/^[A-Z0-9]{1,4}$/, {
    message: 'prefix must be 1-4 uppercase alphanumeric chars',
  })
  prefix!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  resolutionNumber!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  startNumber!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  endNumber!: number;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsString()
  @MinLength(1)
  technicalKey!: string;

  @IsString()
  @MinLength(1)
  softwareId!: string;

  @IsString()
  @MinLength(1)
  softwarePin!: string;
}
