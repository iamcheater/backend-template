import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ADMIN_JWT_EXPIRES_IN } from './constants';
import { AdminEntity } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret'),
        signOptions: { expiresIn: ADMIN_JWT_EXPIRES_IN },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}
