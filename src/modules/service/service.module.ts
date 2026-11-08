import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningComponentModule } from 'src/modules/cleaning-component/cleaning-component.module';
import { MediaModule } from 'src/modules/media/media.module';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServiceEntity } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceEntity]),
    MediaModule,
    CleaningComponentModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}
