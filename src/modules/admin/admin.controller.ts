import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageDto } from 'src/common/dtos';
import { LoginThrottle, Public } from 'src/common/decorators';
import { AdminService } from './admin.service';
import { AdminUser, Roles } from './decorators';
import {
  AdminAuthResponseDto,
  AdminLoginDto,
  AdminPageOptionsDto,
  ChangeAdminPasswordDto,
  CreateAdminDto,
  UpdateAdminDto,
} from './dtos';
import { AdminEntity } from './entities';
import { AdminRole } from './enums';
import { AdminJwtAuthGuard, RolesGuard } from './guards';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @LoginThrottle()
  @Post('login')
  login(@Body() dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    return this.adminService.login(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get('me')
  getProfile(@AdminUser() admin: AdminEntity): AdminEntity {
    return admin;
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch('me')
  updateProfile(
    @AdminUser() admin: AdminEntity,
    @Body() dto: UpdateAdminDto,
  ): Promise<AdminEntity> {
    return this.adminService.update(admin.id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch('me/password')
  changePassword(
    @AdminUser() admin: AdminEntity,
    @Body() dto: ChangeAdminPasswordDto,
  ): Promise<void> {
    return this.adminService.changePassword(admin.id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateAdminDto): Promise<AdminEntity> {
    return this.adminService.createAdmin(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @Get()
  findAll(
    @Query() pageOptionsDto: AdminPageOptionsDto,
  ): Promise<PageDto<AdminEntity>> {
    return this.adminService.findAll(pageOptionsDto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<AdminEntity> {
    return this.adminService.findById(id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @AdminUser() currentAdmin: AdminEntity,
  ): Promise<void> {
    return this.adminService.remove(id, currentAdmin.id);
  }
}
