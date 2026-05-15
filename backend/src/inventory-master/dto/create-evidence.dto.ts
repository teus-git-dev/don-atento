import { ApiProperty } from '@nestjs/swagger';
import { EvidenceType } from '@prisma/client';
import { IsEnum, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Nested evidence shape inside `CreateInventoryItemDto.evidences` and
 * the body of `POST /inventory-master/item/:itemId/evidence`.
 *
 * `url` is HTTPS-only as a defensive transitional measure for
 * Block B. Block D migrates the standalone `addEvidence` endpoint
 * to a multipart upload (FileUploadService) and the inline-in-item
 * flow continues to accept URLs since they're already produced by
 * the `/upload` endpoint, also via FileUploadService.
 */
export class CreateEvidenceDto {
  @ApiProperty({ enum: EvidenceType, example: 'IMAGE' })
  @IsEnum(EvidenceType)
  type!: EvidenceType;

  @ApiProperty({ example: 'https://storage.supabase.co/...' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}
