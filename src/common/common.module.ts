import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LocalizedExceptionFilter } from '../localization/localized-exception.filter';
import { AppThrottlerGuard, createThrottlerOptions } from './guards';
import { TransformInterceptor } from './interceptors';
import { createAppValidationPipe } from './pipes';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createThrottlerOptions,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_PIPE,
      useValue: createAppValidationPipe(),
    },
    {
      provide: APP_FILTER,
      useClass: LocalizedExceptionFilter,
    },
  ],
})
export class CommonModule {}
