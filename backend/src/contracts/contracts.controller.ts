import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { UploadContractDto } from './dto/upload-contract.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Contracts surface — legally binding documents per Ley 820 de 2003.
 *
 * Block A authorization matrix:
 *  - reads (`getDocuments`)         → AGENT, ADMIN_TENANT, SUPERADMIN
 *  - writes (`uploadContract`)      → ADMIN_TENANT, SUPERADMIN only
 *
 * Pre-Block-A there was no RolesGuard registered at all — any
 * TENANT_USER could list and create contract documents.
 */
@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('upload')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary:
      'Registrar URL de documento contractual (Block C migrará a multipart)',
  })
  async uploadContract(@Req() req: any, @Body() body: UploadContractDto) {
    const tenantId = req['tenantId'];
    return this.contractsService.createDocumentRecord(
      tenantId,
      body.propertyId,
      body.fileUrl,
    );
  }

  @Get('property/:propertyId')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Listar documentos contractuales de una propiedad' })
  async getDocuments(
    @Req() req: any,
    @Param('propertyId') propertyId: string,
  ) {
    const tenantId = req['tenantId'];
    return this.contractsService.getDocumentsByProperty(tenantId, propertyId);
  }
}
