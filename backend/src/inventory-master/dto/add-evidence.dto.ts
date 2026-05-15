import { CreateEvidenceDto } from './create-evidence.dto';

/**
 * Body for `POST /inventory-master/item/:itemId/evidence`.
 *
 * Same shape as `CreateEvidenceDto` — re-exported with an
 * inventory-master-aware name so the controller signature reads
 * cleanly. Block D may replace this with a multipart upload that
 * bypasses the URL field entirely.
 */
export class AddEvidenceDto extends CreateEvidenceDto {}
