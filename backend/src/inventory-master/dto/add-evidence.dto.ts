import { ApiProperty } from '@nestjs/swagger';
import { EvidenceType } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Body field for the multipart `POST /inventory-master/item/:itemId/evidence`
 * endpoint. Block D retired the body-supplied `url`: the file is now
 * uploaded directly (multipart), passes through `FileUploadService`
 * (Supabase Storage + FileAsset row + signed URL), and the resulting
 * URL is generated server-side. The only body field left is
 * `evidenceType`.
 */
export class AddEvidenceDto {
  @ApiProperty({ enum: EvidenceType, example: 'IMAGE' })
  @IsEnum(EvidenceType)
  evidenceType!: EvidenceType;
}
