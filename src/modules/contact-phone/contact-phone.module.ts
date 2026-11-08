import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactPhoneController } from './contact-phone.controller';
import { ContactPhoneService } from './contact-phone.service';
import { ContactPhoneEntity } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([ContactPhoneEntity])],
  controllers: [ContactPhoneController],
  providers: [ContactPhoneService],
})
export class ContactPhoneModule {}
