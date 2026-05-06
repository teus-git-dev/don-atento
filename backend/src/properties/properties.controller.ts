import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { BulkImportService } from './bulk-import.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly bulkImportService: BulkImportService,
  ) {}

  @Post('../inmuebles')
  @ApiOperation({
    summary: 'Alias para creación de inmueble (Plug & Play Connect)',
  })
  @ApiResponse({ status: 201, description: 'Inmueble creado con éxito' })
  async createInmueble(@Req() req: any, @Body() data: CreatePropertyDto) {
    data.tenantId = req['tenantId'];
    return this.propertiesService.create(data);
  }

  @Post('../propietarios')
  @ApiOperation({ summary: 'Alias para registro de propietarios (Simulado)' })
  async createPropietario(@Body() data: any) {
    return { message: 'Propietario endpoint reached (Simulated)', data };
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los inmuebles de un tenant' })
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.propertiesService.findAllByTenant(
      req['tenantId'],
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un inmueble por UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.propertiesService.findOneDetail(id, req['tenantId']);
  }

  @Get('search/:code')
  @ApiOperation({ summary: 'Buscar inmueble por ID Inmueble (propertyCode)' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiParam({
    name: 'code',
    description: 'Código externo del inmueble (ej: INC-99)',
  })
  async findByCode(@Req() req: any, @Param('code') code: string) {
    return this.propertiesService.findByPropertyCode(req['tenantId'], code);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo inmueble' })
  async create(@Req() req: any, @Body() data: CreatePropertyDto) {
    data.tenantId = req['tenantId'];
    return this.propertiesService.create(data);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Importación masiva con Smart Mapper' })
  @ApiBody({
    type: [CreatePropertyDto],
    description: 'Array de objetos de propiedad extraídos de CSV/Excel',
  })
  async bulkImport(@Req() req: any, @Body() data: any[]) {
    return this.bulkImportService.processImport(req['tenantId'], data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activar/Desactivar inmueble' })
  async patchStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.propertiesService.updateStatus(id, req['tenantId'], isActive);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un inmueble' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, req['tenantId'], data);
  }

  @Post(':id/transfer')
  @ApiOperation({
    summary: 'Realizar cesión (transferencia) de titularidad o arrendatario',
  })
  async transfer(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    data: { newOwnerId: string; newTenantId?: string; startDate: string },
  ) {
    return this.propertiesService.transferProperty(id, req['tenantId'], data);
  }
}
