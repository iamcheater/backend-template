import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { NotifierService } from 'src/core/notifications';
import { overrideEnv } from './helpers';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let notifier: NotifierService;
  let restoreEnv: () => void;
  let fetchMock: jest.SpyInstance;

  beforeAll(async () => {
    restoreEnv = overrideEnv({
      TELEGRAM_BOT_TOKEN: 'e2e-bot-token',
      TELEGRAM_CHAT_ID: '-1001234',
      ADMIN_DASHBOARD_URL: 'https://admin.example.com/',
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    notifier = app.get(NotifierService);
  });

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    restoreEnv();
  });

  const sentBody = (): Record<string, unknown> => {
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return JSON.parse(init.body as string) as Record<string, unknown>;
  };

  it('delivers a notification through the Telegram channel as escaped HTML', async () => {
    await notifier.notify({
      title: 'New request <urgent>',
      fields: [
        { label: 'Name', value: '<script>alert(1)</script>' },
        { label: 'Message', value: 'Tom & Jerry' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.telegram.org/bote2e-bot-token/sendMessage',
    );
    expect(sentBody()).toEqual({
      chat_id: '-1001234',
      parse_mode: 'HTML',
      text: [
        '<b>New request &lt;urgent&gt;</b>',
        '<b>Name:</b> &lt;script&gt;alert(1)&lt;/script&gt;',
        '<b>Message:</b> Tom &amp; Jerry',
      ].join('\n'),
    });
  });

  it('adds a View button deep-linking into the admin dashboard', async () => {
    await notifier.notify({
      title: 'New request',
      adminPath: '/requests?search=%2357',
    });

    expect(sentBody().reply_markup).toEqual({
      inline_keyboard: [
        [
          {
            text: 'View',
            url: 'https://admin.example.com/requests?search=%2357',
          },
        ],
      ],
    });
  });

  it('never fails the caller when Telegram rejects the message', async () => {
    fetchMock.mockResolvedValue(
      new Response('chat not found', { status: 400 }),
    );

    await expect(
      notifier.notify({ title: 'New request' }),
    ).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('never fails the caller when Telegram is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(
      notifier.notify({ title: 'New request' }),
    ).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
