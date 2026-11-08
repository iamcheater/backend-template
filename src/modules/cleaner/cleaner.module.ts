import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramModule } from 'src/modules/telegram/telegram.module';
import { CleanerApplicationController } from './cleaner-application.controller';
import { CleanerController } from './cleaner.controller';
import { CleanerService } from './cleaner.service';
import { CleanerEntity } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([CleanerEntity]), TelegramModule],
  controllers: [CleanerController, CleanerApplicationController],
  providers: [CleanerService],
  exports: [CleanerService],
})
export class CleanerModule {}
