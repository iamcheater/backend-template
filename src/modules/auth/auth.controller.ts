import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoginThrottle, Public } from 'src/common/decorators';
import { UserEntity } from 'src/modules/users/entities';
import { AuthService } from './auth.service';
import { AuthUser } from './decorators';
import { AuthResponseDto, LoginDto } from './dtos';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @LoginThrottle()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  getProfile(@AuthUser() user: UserEntity): UserEntity {
    return user;
  }
}
