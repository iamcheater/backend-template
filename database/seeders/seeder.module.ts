import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '../../src/core/admin/admin.module';
import { appConfig, awsConfig, mediaConfig } from '../../src/configurations';
import { configValidationSchema } from '../../src/utils/joi';
import { dataSourceOptions } from '../ormconfig';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, awsConfig, mediaConfig],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AdminModule,
  ],
})
export class SeederModule {}
