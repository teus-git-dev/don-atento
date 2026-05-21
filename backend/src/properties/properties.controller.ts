import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { BulkImportService } from './bulk-import.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { TransferPropertyDto } from './dto/transfer-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Server-side cap on synchronous bulk-import payload size. Past this the
 * caller should batch via a background job (out of v1 scope) — anything
 * larger creates a runaway transaction storm that locks the connection pool.
 */
const MAX_BULK_IMPORT_ITEMS = 100;

/**
 * Server-side cap on `?limit=` for paginated property list. Prevents a
 * single request from exfiltrating the whole tenant or DoS-ing the DB.
 */
const MAX_PAGE_LIMIT = 100;

@ApiTags('properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly bulkImportService: BulkImportService,
  ) {}

  @Get()
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER')
  @ApiOperation({ summary: 'Obtener todos los inmuebles de un tenant' })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const requestedLimit = limit ? parseInt(limit, 10) : 10;
    const limitNum = Math.min(
      Math.max(1, isNaN(requestedLimit) ? 10 : requestedLimit),
      MAX_PAGE_LIMIT,
    );
    return this.propertiesService.findAllByTenant(
      req.tenantId!,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER')
  @ApiOperation({ summary: 'Obtener detalle de un inmueble por UUID' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.propertiesService.findOne(id, req.tenantId!);
  }

  @Get('search/:code')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER')
  @ApiOperation({ summary: 'Buscar inmueble por ID Inmueble (propertyCode)' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiParam({
    name: 'code',
    description: 'Código externo del inmueble (ej: INC-99)',
  })
  async findByCode(@Req() req: Request, @Param('code') code: string) {
    return this.propertiesService.findByPropertyCode(req.tenantId!, code);
  }

  @Post()
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Crear nuevo inmueble' })
  async create(@Req() req: Request, @Body() data: CreatePropertyDto) {
    data.tenantId = req.tenantId!;
    return this.propertiesService.create(data);
  }

  @Post('bulk')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Importación masiva con Smart Mapper' })
  @ApiBody({
    type: [CreatePropertyDto],
    description: 'Array de objetos de propiedad extraídos de CSV/Excel',
  })
  async bulkImport(
    @Req() req: Request,
    @Body() data: Record<string, unknown>[],
  ) {
    if (!Array.isArray(data)) {
      throw new BadRequestException(
        'El body debe ser un array de propiedades.',
      );
    }
    if (data.length > MAX_BULK_IMPORT_ITEMS) {
      throw new BadRequestException(
        `Importación masiva limitada a ${MAX_BULK_IMPORT_ITEMS} items por request. Use un job en background para volúmenes mayores.`,
      );
    }
    return this.bulkImportService.processImport(req.tenantId!, data);
  }

  @Patch(':id/status')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Activar/Desactivar inmueble' })
  async patchStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.propertiesService.updateStatus(id, req.tenantId!, isActive);
  }

  @Patch(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Actualizar datos de un inmueble' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, req.tenantId!, data);
  }

  @Post(':id/transfer')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Realizar cesión (transferencia) de titularidad o arrendatario',
  })
  async transfer(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: TransferPropertyDto,
  ) {
    return this.propertiesService.transferProperty(id, req.tenantId!, data);
  }
}
