import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /contracts/upload`.
 *
 * Block A — defensive DTO. `fileUrl` is still body-supplied here
 * (and that's a separate CRÍTICO closed by Block C, which migrates to
 * a multipart upload via FileUploadService and removes the body
 * field entirely). For the transition window between Block A and
 * Block C, we at least enforce shape constraints:
 *  - propertyId is a short string (cuid length).
 *  - fileUrl is a valid HTTPS URL (no `javascript:`, `file:`, etc.).
 *
 * `tenantId` is intentionally NOT in the DTO — the controller reads
 * it from `req['tenantId']` and the global `ValidationPipe`
 * (whitelist + forbidNonWhitelisted) strips any body-supplied
 * tenantId.
 */
export class UploadContractDto {
  @ApiProperty({ description: 'Property.id del tenant' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  propertyId!: string;

  @ApiProperty({
    description:
      'URL del documento (transitorio — Block C migrará a multipart upload vía FileUploadService).',
    example: 'https://storage.supabase.co/...',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  fileUrl!: string;
}
