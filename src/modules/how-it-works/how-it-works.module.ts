import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from 'src/modules/media/media.module';
import { HowItWorksSectionEntity, HowItWorksStepEntity } from './entities';
import { HowItWorksSectionController } from './how-it-works-section.controller';
import { HowItWorksSectionService } from './how-it-works-section.service';
import { HowItWorksStepController } from './how-it-works-step.controller';
import { HowItWorksStepService } from './how-it-works-step.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HowItWorksSectionEntity, HowItWorksStepEntity]),
    MediaModule,
  ],
  controllers: [HowItWorksSectionController, HowItWorksStepController],
  providers: [HowItWorksSectionService, HowItWorksStepService],
  exports: [HowItWorksSectionService],
})
export class HowItWorksModule {}
