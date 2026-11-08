import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramInlineButton } from './interfaces';

const TELEGRAM_REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken?: string;
  private readonly chatId?: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken');
    this.chatId = this.configService.get<string>('telegram.chatId');
  }

  async sendMessage(
    text: string,
    buttons?: TelegramInlineButton[],
  ): Promise<void> {
    if (!this.botToken || !this.chatId) {
      this.logger.warn(
        'Telegram bot is not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID); skipping notification',
      );
      return;
    }

    const body: Record<string, unknown> = {
      chat_id: this.chatId,
      text,
      parse_mode: 'HTML',
    };

    if (buttons?.length) {
      body.reply_markup = {
        inline_keyboard: [
          buttons.map((button) => this.toTelegramButton(button)),
        ],
      };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Telegram sendMessage failed with status ${response.status}: ${errorBody}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Telegram sendMessage threw an error',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private toTelegramButton(
    button: TelegramInlineButton,
  ): Record<string, unknown> {
    if (button.type === 'url') {
      return { text: button.text, url: button.url };
    }

    return { text: button.text, copy_text: { text: button.copyText } };
  }
}
