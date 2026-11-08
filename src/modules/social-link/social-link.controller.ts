import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { UpdateSocialLinkDto } from './dtos';
import { SocialLinkEntity } from './entities';
import { SocialPlatform } from './enums';
import { SocialLinkService } from './social-link.service';

@ApiTags('social-link')
@Controller('social-links')
export class SocialLinkController {
  constructor(private readonly socialLinkService: SocialLinkService) {}

  @Public()
  @Get('active')
  findAllActive(): Promise<SocialLinkEntity[]> {
    return this.socialLinkService.findAllActive();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<SocialLinkEntity[]> {
    return this.socialLinkService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':platform')
  update(
    @Param('platform', new ParseEnumPipe(SocialPlatform))
    platform: SocialPlatform,
    @Body() dto: UpdateSocialLinkDto,
  ): Promise<SocialLinkEntity> {
    return this.socialLinkService.updateByPlatform(platform, dto);
  }
}
