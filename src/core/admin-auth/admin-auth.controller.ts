import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginThrottle, Public } from 'src/common/decorators';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthResponseDto, AdminLoginDto } from './dtos';

@ApiTags('admin-auth')
@Controller('admin')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @LoginThrottle()
  @Post('login')
  login(@Body() dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    return this.adminAuthService.login(dto);
  }
}
