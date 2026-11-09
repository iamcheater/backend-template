import { Module } from '@nestjs/common';
import { TelegramChannel } from './telegram.channel';
import { TelegramService } from './telegram.service';

@Module({
  providers: [TelegramService, TelegramChannel],
  exports: [TelegramChannel],
})
export class TelegramModule {}
