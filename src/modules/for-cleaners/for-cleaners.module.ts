import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from 'src/modules/media/media.module';
import { CleanerExpectationController } from './cleaner-expectation.controller';
import { CleanerExpectationService } from './cleaner-expectation.service';
import { CleanerExpectationEntity, ForCleanersSectionEntity } from './entities';
import { ForCleanersSectionController } from './for-cleaners-section.controller';
import { ForCleanersSectionService } from './for-cleaners-section.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForCleanersSectionEntity,
      CleanerExpectationEntity,
    ]),
    MediaModule,
  ],
  controllers: [ForCleanersSectionController, CleanerExpectationController],
  providers: [ForCleanersSectionService, CleanerExpectationService],
  exports: [ForCleanersSectionService],
})
export class ForCleanersModule {}
