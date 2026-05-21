import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveTemplateDto {
  @ApiProperty({ example: 'Mapping Maestro Incasa' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description: 'OWNER | TENANT | PROPERTY (validado en service-layer)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  categoryId!: string;

  @ApiProperty({
    description:
      'Mapping de columnas Excel → campos DB. Validación de shape per-template queda como carryover post-v1.',
  })
  @IsObject()
  mapping!: Record<string, string>;
}
