import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { E2eSectionController } from './e2e-section.controller';
import { E2eSectionEntity } from './e2e-section.entity';
import { E2eSectionService } from './e2e-section.service';

@Module({
  imports: [TypeOrmModule.forFeature([E2eSectionEntity])],
  controllers: [E2eSectionController],
  providers: [E2eSectionService],
})
export class E2eSectionModule {}
