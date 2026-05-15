import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SaveWhatsappConfigDto {
  @ApiProperty({ description: 'Meta WhatsApp Phone Number ID' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  whatsappPhoneNumberId!: string;

  @ApiProperty({
    description:
      'Meta WhatsApp Access Token (encriptado AES-256-GCM al persistir)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  whatsappAccessToken!: string;
}
