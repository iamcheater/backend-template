import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminModule } from 'src/core/admin/admin.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminJwtDefaultGuard } from './guards';

@Module({
  imports: [
    AdminModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('adminAuth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<JwtSignOptions['expiresIn']>(
            'adminAuth.jwtExpiresIn',
          ),
        },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    {
      provide: APP_GUARD,
      useClass: AdminJwtDefaultGuard,
    },
  ],
})
export class AdminAuthModule {}
