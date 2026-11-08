import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from 'src/modules/media/media.module';
import { StandardsSectionEntity } from './entities';
import { StandardsController } from './standards.controller';
import { StandardsService } from './standards.service';

@Module({
  imports: [TypeOrmModule.forFeature([StandardsSectionEntity]), MediaModule],
  controllers: [StandardsController],
  providers: [StandardsService],
  exports: [StandardsService],
})
export class StandardsModule {}
