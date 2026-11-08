import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;
  let fetchMock: jest.Mock;

  const buildModule = async (
    config: Record<string, string | undefined>,
  ): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    service = module.get(TelegramService);
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips sending and does not call fetch when bot token/chat id are missing', async () => {
    await buildModule({
      'telegram.botToken': undefined,
      'telegram.chatId': undefined,
    });

    await service.sendMessage('hello');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the Telegram API with the chat id and text', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockResolvedValue({ ok: true });

    await service.sendMessage('New quote submitted');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      chat_id: '-100123',
      text: 'New quote submitted',
      parse_mode: 'HTML',
    });
    expect(body.reply_markup).toBeUndefined();
  });

  it('includes an inline URL button in the reply markup when provided', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockResolvedValue({ ok: true });

    await service.sendMessage('New cleaner application', [
      {
        type: 'url',
        text: 'View',
        url: 'https://dashboard.jeenj.com/cleaners/1',
      },
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_markup).toEqual({
      inline_keyboard: [
        [{ text: 'View', url: 'https://dashboard.jeenj.com/cleaners/1' }],
      ],
    });
  });

  it('includes a copy-text button in the reply markup when provided', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockResolvedValue({ ok: true });

    await service.sendMessage('New cleaner application', [
      { type: 'copy', text: 'Copy phone', copyText: '+37455123456' },
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_markup).toEqual({
      inline_keyboard: [
        [{ text: 'Copy phone', copy_text: { text: '+37455123456' } }],
      ],
    });
  });

  it('combines multiple buttons into a single row', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockResolvedValue({ ok: true });

    await service.sendMessage('New cleaner application', [
      {
        type: 'url',
        text: 'View',
        url: 'https://dashboard.jeenj.com/cleaners/1',
      },
      { type: 'copy', text: 'Copy phone', copyText: '+37455123456' },
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_markup.inline_keyboard).toEqual([
      [
        { text: 'View', url: 'https://dashboard.jeenj.com/cleaners/1' },
        { text: 'Copy phone', copy_text: { text: '+37455123456' } },
      ],
    ]);
  });

  it('logs and does not throw when the Telegram API responds with an error status', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request: chat not found'),
    });

    await expect(service.sendMessage('hello')).resolves.toBeUndefined();
  });

  it('logs and does not throw when fetch rejects', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockRejectedValue(new Error('network error'));

    await expect(service.sendMessage('hello')).resolves.toBeUndefined();
  });

  it('logs and does not throw when the request times out', async () => {
    await buildModule({
      'telegram.botToken': 'test-token',
      'telegram.chatId': '-100123',
    });
    fetchMock.mockRejectedValue(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    await expect(service.sendMessage('hello')).resolves.toBeUndefined();
  });
});
