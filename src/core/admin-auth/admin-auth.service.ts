import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminService } from 'src/core/admin/admin.service';
import { AdminAuthResponseDto, AdminLoginDto } from './dtos';
import { AdminInvalidCredentialsException } from './exceptions';
import { AdminJwtPayload } from './interfaces';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    const admin = await this.adminService.findByEmailWithPassword(dto.email);

    if (!admin || !(await bcrypt.compare(dto.password, admin.password))) {
      throw new AdminInvalidCredentialsException();
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    return new AdminAuthResponseDto(this.jwtService.sign(payload));
  }
}
