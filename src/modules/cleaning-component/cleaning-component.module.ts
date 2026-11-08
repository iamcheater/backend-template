import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningComponentController } from './cleaning-component.controller';
import { CleaningComponentService } from './cleaning-component.service';
import { CleaningComponentEntity } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([CleaningComponentEntity])],
  controllers: [CleaningComponentController],
  providers: [CleaningComponentService],
  exports: [CleaningComponentService],
})
export class CleaningComponentModule {}
