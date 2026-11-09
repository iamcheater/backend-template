import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationChannel } from '../../interfaces';
import { TelegramInlineButton } from './interfaces';
import { TelegramService } from './telegram.service';
import { escapeTelegramHtml } from './utils';

@Injectable()
export class TelegramChannel implements NotificationChannel {
  readonly name = 'telegram';
  private readonly adminDashboardUrl?: string;

  constructor(
    private readonly telegramService: TelegramService,
    configService: ConfigService,
  ) {
    this.adminDashboardUrl = configService
      .get<string>('app.adminDashboardUrl')
      ?.replace(/\/+$/, '');
  }

  send(notification: Notification): Promise<void> {
    return this.telegramService.sendMessage(
      this.format(notification),
      this.buttonsFor(notification),
    );
  }

  private format(notification: Notification): string {
    const lines = [`<b>${escapeTelegramHtml(notification.title)}</b>`];

    for (const field of notification.fields ?? []) {
      lines.push(
        `<b>${escapeTelegramHtml(field.label)}:</b> ${escapeTelegramHtml(field.value)}`,
      );
    }

    return lines.join('\n');
  }

  private buttonsFor(
    notification: Notification,
  ): TelegramInlineButton[] | undefined {
    if (!notification.adminPath || !this.adminDashboardUrl) {
      return undefined;
    }

    const path = notification.adminPath.replace(/^\/+/, '');

    return [
      { type: 'url', text: 'View', url: `${this.adminDashboardUrl}/${path}` },
    ];
  }
}
