import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleanerEntity } from 'src/modules/cleaner/entities';
import { QuoteEntity } from 'src/modules/quote/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuoteEntity, CleanerEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
