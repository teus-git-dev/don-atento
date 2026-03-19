import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService } from './whatsapp.service';
import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CognitiveService } from '../cognitive/cognitive.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const mockPrismaService = {};
  const mockHttpService = {};
  const mockTicketsService = {};
  const mockCognitiveService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: CognitiveService, useValue: mockCognitiveService },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
