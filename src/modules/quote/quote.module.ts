import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleanerModule } from 'src/modules/cleaner/cleaner.module';
import { TelegramModule } from 'src/modules/telegram/telegram.module';
import { QuoteEntity } from './entities';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuoteEntity]),
    TelegramModule,
    CleanerModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
