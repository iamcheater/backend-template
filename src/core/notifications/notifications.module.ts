import { Module } from '@nestjs/common';
import { TelegramChannel } from './channels/telegram/telegram.channel';
import { TelegramModule } from './channels/telegram/telegram.module';
import { NOTIFICATION_CHANNELS } from './constants';
import { NotificationChannel } from './interfaces';
import { NotifierService } from './notifier.service';

@Module({
  imports: [TelegramModule],
  providers: [
    NotifierService,
    {
      provide: NOTIFICATION_CHANNELS,
      inject: [TelegramChannel],
      useFactory: (...channels: NotificationChannel[]) => channels,
    },
  ],
  exports: [NotifierService],
})
export class NotificationsModule {}
