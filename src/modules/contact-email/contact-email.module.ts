import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactEmailController } from './contact-email.controller';
import { ContactEmailService } from './contact-email.service';
import { ContactEmailEntity } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([ContactEmailEntity])],
  controllers: [ContactEmailController],
  providers: [ContactEmailService],
})
export class ContactEmailModule {}
