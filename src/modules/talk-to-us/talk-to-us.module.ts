import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from 'src/modules/media/media.module';
import { TalkToUsSectionEntity } from './entities';
import { TalkToUsController } from './talk-to-us.controller';
import { TalkToUsService } from './talk-to-us.service';

@Module({
  imports: [TypeOrmModule.forFeature([TalkToUsSectionEntity]), MediaModule],
  controllers: [TalkToUsController],
  providers: [TalkToUsService],
  exports: [TalkToUsService],
})
export class TalkToUsModule {}
