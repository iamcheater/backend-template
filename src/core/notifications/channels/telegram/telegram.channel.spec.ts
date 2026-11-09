import { ConfigService } from '@nestjs/config';
import { TelegramChannel } from './telegram.channel';
import { TelegramService } from './telegram.service';

describe('TelegramChannel', () => {
  let telegramService: { sendMessage: jest.Mock };

  const buildChannel = (adminDashboardUrl?: string): TelegramChannel =>
    new TelegramChannel(
      telegramService as unknown as TelegramService,
      {
        get: jest.fn().mockReturnValue(adminDashboardUrl),
      } as unknown as ConfigService,
    );

  beforeEach(() => {
    telegramService = { sendMessage: jest.fn().mockResolvedValue(undefined) };
  });

  it('formats the title and fields as HTML, escaping every value', async () => {
    await buildChannel().send({
      title: 'New <request>',
      fields: [
        { label: 'Name', value: 'Ann & <b>Bob</b>' },
        { label: 'Phone', value: '+37499000000' },
      ],
    });

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      '<b>New &lt;request&gt;</b>\n<b>Name:</b> Ann &amp; &lt;b&gt;Bob&lt;/b&gt;\n<b>Phone:</b> +37499000000',
      undefined,
    );
  });

  it('adds a View button deep-linking into the admin dashboard', async () => {
    await buildChannel('https://admin.example.com/').send({
      title: 'New request',
      adminPath: '/requests?search=%2357',
    });

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      '<b>New request</b>',
      [
        {
          type: 'url',
          text: 'View',
          url: 'https://admin.example.com/requests?search=%2357',
        },
      ],
    );
  });

  it('sends no button when ADMIN_DASHBOARD_URL is not configured', async () => {
    await buildChannel(undefined).send({
      title: 'New request',
      adminPath: '/requests',
    });

    expect(telegramService.sendMessage).toHaveBeenCalledWith(
      '<b>New request</b>',
      undefined,
    );
  });
});
