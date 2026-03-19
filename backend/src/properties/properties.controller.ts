import { Controller, Get, Query, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { BulkImportService } from './bulk-import.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly bulkImportService: BulkImportService
  ) {}

  @Post('../inmuebles')
  @ApiOperation({ summary: 'Alias para creación de inmueble (Plug & Play Connect)' })
  @ApiResponse({ status: 201, description: 'Inmueble creado con éxito' })
  async createInmueble(@Body() data: CreatePropertyDto) {
    return this.propertiesService.create(data);
  }

  @Post('../propietarios')
  @ApiOperation({ summary: 'Alias para registro de propietarios (Simulado)' })
  async createPropietario(@Body() data: any) {
    return { message: 'Propietario endpoint reached (Simulated)', data };
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los inmuebles de un tenant' })
  async findAll(@Query('tenantId') tenantId: string) {
    return this.propertiesService.findAllByTenant(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un inmueble por UUID' })
  async findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Get('search/:code')
  @ApiOperation({ summary: 'Buscar inmueble por ID Inmueble (propertyCode)' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiParam({ name: 'code', description: 'Código externo del inmueble (ej: INC-99)' })
  async findByCode(@Query('tenantId') tenantId: string, @Param('code') code: string) {
    return this.propertiesService.findByPropertyCode(tenantId, code);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo inmueble' })
  async create(@Body() data: CreatePropertyDto) {
    return this.propertiesService.create(data);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Importación masiva con Smart Mapper' })
  @ApiBody({ type: [CreatePropertyDto], description: 'Array de objetos de propiedad extraídos de CSV/Excel' })
  async bulkImport(@Query('tenantId') tenantId: string, @Body() data: any[]) {
    return this.bulkImportService.processImport(tenantId, data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activar/Desactivar inmueble' })
  async patchStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.propertiesService.updateStatus(id, isActive);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un inmueble' })
  async update(@Param('id') id: string, @Body() data: UpdatePropertyDto) {
    return this.propertiesService.update(id, data);
  }
}
