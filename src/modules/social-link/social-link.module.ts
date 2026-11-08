import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialLinkEntity } from './entities';
import { SocialLinkController } from './social-link.controller';
import { SocialLinkService } from './social-link.service';

@Module({
  imports: [TypeOrmModule.forFeature([SocialLinkEntity])],
  controllers: [SocialLinkController],
  providers: [SocialLinkService],
  exports: [SocialLinkService],
})
export class SocialLinkModule {}
