import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_CHANNELS } from './constants';
import { Notification, NotificationChannel } from './interfaces';

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[],
  ) {}

  async notify(notification: Notification): Promise<void> {
    await Promise.all(
      this.channels.map(async (channel) => {
        try {
          await channel.send(notification);
        } catch (error) {
          this.logger.error(
            `Notification channel "${channel.name}" failed`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }),
    );
  }
}
