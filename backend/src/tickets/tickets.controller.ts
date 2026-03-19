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
  @ApiOperation({ summary: 'Listar todos los tickets por tenant' })
  async findAll(@Query('tenantId') tenantId: string) {
    return this.ticketsService.findAllByTenant(tenantId);
  }

  @Get('technician/:id')
  @ApiOperation({ summary: 'Ver tickets asignados a un técnico' })
  async findByTechnician(@Param('id') id: string) {
    return this.ticketsService.findAllByTechnician(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transición de estado y cálculo automático de ANS' })
  async transition(@Param('id') id: string, @Body() data: { userId: string; newStateId: string }) {
    return this.ticketsService.transitionState(id, data.userId, data.newStateId);
  }
}
