import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from 'src/modules/media/media.module';
import { HeroSlideEntity } from './entities';
import { HeroSectionController } from './hero-section.controller';
import { HeroSectionService } from './hero-section.service';

@Module({
  imports: [TypeOrmModule.forFeature([HeroSlideEntity]), MediaModule],
  controllers: [HeroSectionController],
  providers: [HeroSectionService],
})
export class HeroSectionModule {}
