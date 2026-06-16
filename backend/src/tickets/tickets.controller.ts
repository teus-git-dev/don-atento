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
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TicketsService } from './tickets.service';
import { SurveyTokenService } from './survey-token.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TransitionStateDto } from './dto/transition-state.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
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
  private readonly logger = new Logger(TicketsController.name);

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly fileUpload: FileUploadService,
    private readonly surveyToken: SurveyTokenService,
  ) {}

  /**
   * Parse `?page=` and `?limit=` into a sanitized pagination opts
   * object. Page defaults to 1; limit defaults to 20 and is hard-capped
   * at 100 (matches crm.controller.ts convention). Used by both `findAll`
   * and `findByTechnician` during P0.3 Phase 1.
   */
  private parsePagination(
    pageStr?: string,
    limitStr?: string,
  ): { page: number; limit: number } {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const requestedLimit = parseInt(limitStr ?? '20', 10) || 20;
    const limit = Math.min(Math.max(1, requestedLimit), 100);
    return { page, limit };
  }

  @Post()
  @Roles(
    'AGENT',
    'ADMIN_TENANT',
    'COORDINATOR',
    'SUPERADMIN',
    'OWNER',
    'MAINTENANCE',
  )
  @ApiOperation({ summary: 'Reportar nueva novedad de mantenimiento' })
  async create(@Req() req: Request, @Body() createTicketDto: CreateTicketDto) {
    createTicketDto.tenantId = req.tenantId!;
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Get()
  @Roles(
    'AGENT',
    'ADMIN_TENANT',
    'COORDINATOR',
    'SUPERADMIN',
    'OWNER',
    'MAINTENANCE',
  )
  @ApiOperation({
    summary: 'Listar todos los tickets por tenant o propietario (paginado)',
  })
  async findAll(
    @Req() req: Request,
    @Query('ownerId') ownerId?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = req.tenantId!;
    const wantsPaginated = pageStr !== undefined || limitStr !== undefined;

    if (!wantsPaginated) {
      // P0.3 Phase 1 — preserve the legacy array shape so the current
      // frontend keeps working unchanged. The deprecation warn surfaces
      // remaining callers in Render logs (`tenant=X ownerId=Y`); when
      // those drop to zero, Phase 2 removes this branch.
      this.logger.warn(
        `[deprecation] GET /tickets without pagination — tenant=${tenantId} ownerId=${ownerId ?? '-'}`,
      );
      return ownerId
        ? this.ticketsService.findAllByOwner(
            ownerId,
            tenantId,
            undefined,
            search,
          )
        : this.ticketsService.findAllByTenant(tenantId, undefined, search);
    }

    const opts = this.parsePagination(pageStr, limitStr);
    return ownerId
      ? this.ticketsService.findAllByOwner(ownerId, tenantId, opts, search)
      : this.ticketsService.findAllByTenant(tenantId, opts, search);
  }

  @Get('technician/:id')
  @Roles('AGENT', 'ADMIN_TENANT', 'COORDINATOR', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Ver tickets asignados a un técnico (paginado)' })
  async findByTechnician(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = req.tenantId!;
    const wantsPaginated = pageStr !== undefined || limitStr !== undefined;

    if (!wantsPaginated) {
      // P0.3 Phase 1 — see findAll for the rationale.
      this.logger.warn(
        `[deprecation] GET /tickets/technician/:id without pagination — tenant=${tenantId} technicianId=${id}`,
      );
      return this.ticketsService.findAllByTechnician(
        id,
        tenantId,
        undefined,
        search,
      );
    }

    const opts = this.parsePagination(pageStr, limitStr);
    return this.ticketsService.findAllByTechnician(id, tenantId, opts, search);
  }

  @Get(':id')
  @Roles(
    'AGENT',
    'ADMIN_TENANT',
    'COORDINATOR',
    'SUPERADMIN',
    'OWNER',
    'MAINTENANCE',
  )
  @ApiOperation({ summary: 'Ver detalle de un ticket' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.ticketsService.findOne(id, req.tenantId!);
  }

  @Patch(':id/status')
  @Roles('AGENT', 'ADMIN_TENANT', 'COORDINATOR', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Transición de estado y cálculo automático de ANS' })
  async transition(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: TransitionStateDto,
  ) {
    return this.ticketsService.transitionState(
      id,
      req.tenantId!,
      req.user!.id,
      data.newStateId,
    );
  }

  @Patch(':id/resolve')
  @Roles('AGENT', 'ADMIN_TENANT', 'COORDINATOR', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Cerrar ticket con motivo de resolución y firma' })
  async resolve(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: ResolveTicketDto,
  ) {
    return this.ticketsService.resolveTicket(
      id,
      req.tenantId!,
      data.closureReason,
      data.signature,
    );
  }

  @Patch(':id/complete-task')
  @Roles('AGENT', 'ADMIN_TENANT', 'COORDINATOR', 'SUPERADMIN', 'MAINTENANCE')
  @ApiOperation({ summary: 'Completar tarea de estado actual y avanzar' })
  async completeTask(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: CompleteTaskDto,
  ) {
    return this.ticketsService.completeStateTask(
      id,
      req.tenantId!,
      req.user!.id,
      data.comment,
      data.attachments,
    );
  }

  @Post('upload')
  @Roles('AGENT', 'ADMIN_TENANT', 'COORDINATOR', 'SUPERADMIN', 'MAINTENANCE')
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

  @Public()
  @Get(':id/survey-info')
  @ApiOperation({ summary: 'Obtener info pública del ticket para la encuesta' })
  async getSurveyInfo(@Param('id') id: string, @Query('token') token?: string) {
    if (!this.surveyToken.verify(id, token)) {
      throw new ForbiddenException('Token de encuesta inválido.');
    }
    const ticket = await this.ticketsService.findOnePublicForSurvey(id);
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
    if (!this.surveyToken.verify(id, token)) {
      throw new ForbiddenException('Token de encuesta inválido.');
    }
    return this.ticketsService.updateSatisfactionPublic(
      id,
      data.stars,
      data.comment,
    );
  }
}
