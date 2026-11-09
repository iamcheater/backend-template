import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../../src/core/admin/admin.module';
import {
  appConfig,
  awsConfig,
  ENV_FILE_PATH,
  mediaConfig,
  shouldLoadEnvFile,
} from '../../src/configurations';
import { configValidationSchema } from '../../src/utils/joi';
import { dataSourceOptions } from '../ormconfig';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE_PATH,
      ignoreEnvFile: !shouldLoadEnvFile(),
      load: [appConfig, awsConfig, mediaConfig],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    EventEmitterModule.forRoot(),
    AdminModule,
  ],
})
export class SeederModule {}
