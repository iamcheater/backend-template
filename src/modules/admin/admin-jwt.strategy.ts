import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminService } from './admin.service';
import { AdminEntity } from './entities';
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
      secretOrKey: configService.get<string>('app.jwtSecret'),
    });
  }

  validate(payload: AdminJwtPayload): Promise<AdminEntity> {
    if (payload.type !== 'admin') {
      throw new AdminUnauthorizedException();
    }

    return this.adminService.findById(payload.sub);
  }
}
