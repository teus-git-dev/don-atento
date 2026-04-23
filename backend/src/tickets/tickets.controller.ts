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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Reportar nueva novedad de mantenimiento' })
  async create(@Req() req: any, @Body() createTicketDto: CreateTicketDto) {
    createTicketDto.tenantId = req['tenantId'];
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos los tickets por tenant o propietario',
  })
  async findAll(
    @Req() req: any,
    @Query('ownerId') ownerId?: string,
  ) {
    if (ownerId) {
      return this.ticketsService.findAllByOwner(ownerId);
    }
    return this.ticketsService.findAllByTenant(req['tenantId']);
  }

  @Get('technician/:id')
  @ApiOperation({ summary: 'Ver tickets asignados a un técnico' })
  async findByTechnician(@Param('id') id: string) {
    return this.ticketsService.findAllByTechnician(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un ticket' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.findOne(id, req['tenantId']);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transición de estado y cálculo automático de ANS' })
  async transition(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { userId: string; newStateId: string },
  ) {
    return this.ticketsService.transitionState(
      id,
      req['tenantId'],
      data.userId,
      data.newStateId,
    );
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Cerrar ticket con motivo de resolución y firma' })
  async resolve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { closureReason: string; signature?: string },
  ) {
    return this.ticketsService.resolveTicket(
      id,
      req['tenantId'],
      data.closureReason,
      data.signature,
    );
  }

  @Patch(':id/complete-task')
  @ApiOperation({ summary: 'Completar tarea de estado actual y avanzar' })
  async completeTask(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { userId: string; comment: string; attachments?: any[] },
  ) {
    return this.ticketsService.completeStateTask(
      id,
      req['tenantId'],
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
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { stars: number; comment?: string },
  ) {
    return this.ticketsService.updateSatisfaction(id, req['tenantId'], data.stars, data.comment);
  }
}
