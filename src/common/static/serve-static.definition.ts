import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { DynamicModule } from '@nestjs/common';

export const ServeStaticDefinition: DynamicModule = ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', '..', '..', 'public'),
  serveRoot: '/public',
});
