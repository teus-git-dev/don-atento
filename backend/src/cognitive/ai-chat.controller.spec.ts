import { Test, TestingModule } from '@nestjs/testing';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import type { Request } from 'express';
import { AiChatDto } from './dto/ai-chat.dto';

describe('AiChatController', () => {
  let controller: AiChatController;
  const mockService = {
    processChat: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiChatController],
      providers: [{ provide: AiChatService, useValue: mockService }],
    }).compile();
    controller = module.get<AiChatController>(AiChatController);
  });

  const fakeReq = (
    tenantId = 't1',
    userId = 'u1',
  ): Request =>
    ({ tenantId, user: { id: userId } }) as unknown as Request;

  it('passes tenantId from JWT (not from body) to the service', async () => {
    mockService.processChat.mockResolvedValue({ reply: 'hello' });
    const dto: AiChatDto = {
      tenantId: 'ATTACKER_TENANT',
      userId: 'fake-user',
      message: 'hola',
      history: [],
    };

    await controller.chat(fakeReq('victim-tenant', 'victim-user'), dto);

    expect(mockService.processChat).toHaveBeenCalledWith(
      'victim-tenant', // from JWT
      'victim-user', // from JWT
      'hola',
      [],
    );
    // Body-supplied tenantId/userId are ignored.
    expect(mockService.processChat).not.toHaveBeenCalledWith(
      'ATTACKER_TENANT',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('falls back to userId="unknown" when JWT lacks user.id', async () => {
    mockService.processChat.mockResolvedValue({ reply: 'ok' });
    const reqNoUser = { tenantId: 't1' } as unknown as Request;
    const dto: AiChatDto = { message: 'm' };

    await controller.chat(reqNoUser, dto);

    expect(mockService.processChat).toHaveBeenCalledWith(
      't1',
      'unknown',
      'm',
      [],
    );
  });

  it('defaults history to empty array when not provided', async () => {
    mockService.processChat.mockResolvedValue({ reply: 'ok' });
    const dto: AiChatDto = { message: 'hi' };

    await controller.chat(fakeReq(), dto);

    expect(mockService.processChat).toHaveBeenCalledWith(
      't1',
      'u1',
      'hi',
      [],
    );
  });

  it('forwards history when provided', async () => {
    mockService.processChat.mockResolvedValue({ reply: 'ok' });
    const history = [{ role: 'user', content: 'prev' }];
    const dto: AiChatDto = { message: 'follow-up', history };

    await controller.chat(fakeReq(), dto);

    expect(mockService.processChat).toHaveBeenCalledWith(
      't1',
      'u1',
      'follow-up',
      history,
    );
  });
});
