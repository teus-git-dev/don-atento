import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  @ApiOperation({
    summary: 'Listar todos los tickets por tenant o propietario',
  })
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('ownerId') ownerId?: string,
  ) {
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
  async transition(
    @Param('id') id: string,
    @Body() data: { userId: string; newStateId: string },
  ) {
    return this.ticketsService.transitionState(
      id,
      data.userId,
      data.newStateId,
    );
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Cerrar ticket con motivo de resolución y firma' })
  async resolve(
    @Param('id') id: string,
    @Body() data: { closureReason: string; signature?: string },
  ) {
    return this.ticketsService.resolveTicket(
      id,
      data.closureReason,
      data.signature,
    );
  }

  @Patch(':id/complete-task')
  @ApiOperation({ summary: 'Completar tarea de estado actual y avanzar' })
  async completeTask(
    @Param('id') id: string,
    @Body() data: { userId: string; comment: string; attachments?: any[] },
  ) {
    return this.ticketsService.completeStateTask(
      id,
      data.userId,
      data.comment,
      data.attachments,
    );
  }

  @Post('upload')
  @ApiOperation({ summary: 'Sube un archivo de evidencia para un ticket' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `ticket-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: any) {
    let type = 'image';
    if (file.mimetype.startsWith('video')) type = 'video';
    else if (file.mimetype === 'application/pdf') type = 'pdf';
    else if (
      file.mimetype.includes('word') ||
      file.mimetype.includes('officedocument')
    )
      type = 'document';

    return {
      url: `/uploads/${file.filename}`,
      type,
    };
  }

  @Patch(':id/satisfaction')
  @ApiOperation({ summary: 'Actualizar satisfacción del cliente' })
  async updateSatisfaction(
    @Param('id') id: string,
    @Body() data: { stars: number; comment?: string },
  ) {
    return this.ticketsService.updateSatisfaction(id, data.stars, data.comment);
  }
}
