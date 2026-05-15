import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Listar providers del tenant' })
  findAll(@Req() req: any) {
    return this.providersService.findAll(req['tenantId']);
  }

  @Get(':id')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Detalle de un provider' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.providersService.findOne(id, req['tenantId']);
  }

  @Post()
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Crear provider con contactos opcionales' })
  create(@Req() req: any, @Body() data: CreateProviderDto) {
    return this.providersService.create(req['tenantId'], data);
  }

  @Patch(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Actualizar provider (whitelist DTO — tenantId no mutable)',
  })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateProviderDto,
  ) {
    return this.providersService.update(id, req['tenantId'], data);
  }

  @Delete(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Eliminar provider' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.providersService.remove(id, req['tenantId']);
  }

  @Post(':id/assign-technician/:userId')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Asignar técnico (User) a un provider — ambos del tenant',
  })
  assignTechnician(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.providersService.assignTechnician(id, userId, req['tenantId']);
  }
}
