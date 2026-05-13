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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { FileUploadService } from '../storage/file-upload.service';

// Ticket attachments (photos/videos) are referenced from WhatsApp notifications
// to clients and from tenant/agent dashboards. Tickets can stay open for days
// or weeks. 7d TTL matches the quotation/contract TTL; Phase 3 will add refresh
// for accessing attachments after URL expiry.
const TICKET_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly fileUpload: FileUploadService,
  ) {}

  @Post()
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER', 'MAINTENANCE')
  @ApiOperation({ summary: 'Reportar nueva novedad de mantenimiento' })
  async create(@Req() req: any, @Body() createTicketDto: CreateTicketDto) {
    createTicketDto.tenantId = req['tenantId'];
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Get()
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER', 'MAINTENANCE')
  @ApiOperation({
    summary: 'Listar todos los tickets por tenant o propietario',
  })
  async findAll(@Req() req: any, @Query('ownerId') ownerId?: string) {
    if (ownerId) {
      return this.ticketsService.findAllByOwner(ownerId);
    }
    return this.ticketsService.findAllByTenant(req['tenantId']);
  }

  @Get('technician/:id')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Ver tickets asignados a un técnico' })
  async findByTechnician(@Param('id') id: string) {
    return this.ticketsService.findAllByTechnician(id);
  }

  @Get(':id')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER', 'MAINTENANCE')
  @ApiOperation({ summary: 'Ver detalle de un ticket' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.findOne(id, req['tenantId']);
  }

  @Patch(':id/status')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'MAINTENANCE')
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
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Cerrar ticket con motivo de resolución y firma' })
  async resolve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { closureReason: string; signature?: string },
  ) {
    try {
      return await this.ticketsService.resolveTicket(
        id,
        req['tenantId'],
        data.closureReason,
        data.signature,
      );
    } catch (e) {
      throw e;
    }
  }

  @Patch(':id/complete-task')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Completar tarea de estado actual y avanzar' })
  async completeTask(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { userId: string; comment: string; attachments?: any[] },
  ) {
    try {
      return await this.ticketsService.completeStateTask(
        id,
        req['tenantId'],
        data.userId,
        data.comment,
        data.attachments,
      );
    } catch (e) {
      throw e;
    }
  }

  @Post('upload')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Sube un archivo de evidencia para un ticket' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|pdf|doc|docx)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(
            new Error(
              'Tipo de archivo no permitido. Solo: jpg, png, gif, webp, mp4, pdf, doc, docx',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) return { error: 'No se subió ningún archivo' };

    let type = 'image';
    if (file.mimetype.startsWith('video')) type = 'video';
    else if (file.mimetype === 'application/pdf') type = 'pdf';
    else if (
      file.mimetype.includes('word') ||
      file.mimetype.includes('officedocument')
    )
      type = 'document';

    const { url, filename } = await this.fileUpload.upload(
      req.tenantId!,
      'tickets',
      file.buffer,
      {
        mimeType: file.mimetype,
        originalName: file.originalname,
        ttlSeconds: TICKET_SIGNED_URL_TTL_SECONDS,
      },
    );

    return {
      url,
      name: file.originalname,
      filename,
      type,
    };
  }

  // ── HMAC helper for survey token validation ──
  private validateSurveyToken(
    ticketId: string,
    token: string | undefined,
  ): boolean {
    if (!token) return false;
    const secret = process.env.JWT_SECRET || 'MISSING';
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(ticketId)
      .digest('hex')
      .substring(0, 16);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  @Public()
  @Get(':id/survey-info')
  @ApiOperation({ summary: 'Obtener info pública del ticket para la encuesta' })
  async getSurveyInfo(@Param('id') id: string, @Query('token') token?: string) {
    if (!this.validateSurveyToken(id, token)) {
      throw new ForbiddenException('Token de encuesta inválido.');
    }
    const ticket = await this.ticketsService
      .findOne(id, undefined as any)
      .catch(() => null);
    if (!ticket) return { title: 'Ticket no encontrado' };
    return { title: ticket.title };
  }

  @Public()
  @Patch(':id/satisfaction')
  @ApiOperation({ summary: 'Actualizar satisfacción del cliente' })
  async updateSatisfaction(
    @Param('id') id: string,
    @Query('token') token: string,
    @Body() data: { stars: number; comment?: string },
  ) {
    if (!this.validateSurveyToken(id, token)) {
      throw new ForbiddenException('Token de encuesta inválido.');
    }
    return this.ticketsService.updateSatisfaction(
      id,
      undefined as any,
      data.stars,
      data.comment,
    );
  }
}
