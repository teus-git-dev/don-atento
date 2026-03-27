import { Controller, Get, Post, Body, Query, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Reportar nueva novedad de mantenimiento' })
  async create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los tickets por tenant o propietario' })
  async findAll(@Query('tenantId') tenantId: string, @Query('ownerId') ownerId?: string) {
    if (ownerId) {
      return this.ticketsService.findAllByOwner(ownerId);
    }
    return this.ticketsService.findAllByTenant(tenantId);
  }

  @Get('technician/:id')
  @ApiOperation({ summary: 'Ver tickets asignados a un técnico' })
  async findByTechnician(@Param('id') id: string) {
    return this.ticketsService.findAllByTechnician(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un ticket' })
  async findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transición de estado y cálculo automático de ANS' })
  async transition(@Param('id') id: string, @Body() data: { userId: string; newStateId: string }) {
    return this.ticketsService.transitionState(id, data.userId, data.newStateId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Cerrar ticket con motivo de resolución' })
  async resolve(@Param('id') id: string, @Body() data: { closureReason: string }) {
    return this.ticketsService.resolveTicket(id, data.closureReason);
  }

  @Patch(':id/complete-task')
  @ApiOperation({ summary: 'Completar tarea de estado actual y avanzar' })
  async completeTask(
    @Param('id') id: string, 
    @Body() data: { userId: string; comment: string }
  ) {
    return this.ticketsService.completeStateTask(id, data.userId, data.comment);
  }

  @Patch(':id/satisfaction')
  @ApiOperation({ summary: 'Actualizar satisfacción del cliente' })
  async updateSatisfaction(@Param('id') id: string, @Body() data: { stars: number, comment?: string }) {
    return this.ticketsService.updateSatisfaction(id, data.stars, data.comment);
  }
}
