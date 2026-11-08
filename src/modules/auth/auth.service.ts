import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/modules/users/users.service';
import { AuthResponseDto, LoginDto } from './dtos';
import { InvalidCredentialsException } from './exceptions';
import { JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new InvalidCredentialsException();
    }

    return this.buildAuthResponse(user.id, user.email);
  }

  private buildAuthResponse(userId: number, email: string): AuthResponseDto {
    const payload: JwtPayload = { sub: userId, email };
    return new AuthResponseDto(this.jwtService.sign(payload));
  }
}
