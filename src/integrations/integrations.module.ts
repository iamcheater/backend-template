import { Module } from '@nestjs/common';
import { RevalidationModule } from 'src/core/revalidation/revalidation.module';
import { WebsiteRevalidationListener } from './website-revalidation.listener';

@Module({
  imports: [RevalidationModule],
  providers: [WebsiteRevalidationListener],
})
export class IntegrationsModule {}
