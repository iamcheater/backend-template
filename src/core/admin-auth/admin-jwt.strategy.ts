import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminService } from 'src/core/admin/admin.service';
import { AdminEntity } from 'src/core/admin/entities';
import { AdminNotFoundException } from 'src/core/admin/exceptions';
import { AdminUnauthorizedException } from './exceptions';
import { AdminJwtPayload } from './interfaces';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('adminAuth.jwtSecret'),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminEntity> {
    if (payload.type !== 'admin') {
      throw new AdminUnauthorizedException();
    }

    try {
      return await this.adminService.findById(payload.sub);
    } catch (error) {
      if (error instanceof AdminNotFoundException) {
        throw new AdminUnauthorizedException();
      }

      throw error;
    }
  }
}
