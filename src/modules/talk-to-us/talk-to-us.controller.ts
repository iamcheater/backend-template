import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { TalkToUsResponseDto, UpdateTalkToUsDto } from './dtos';
import { TalkToUsSectionEntity } from './entities';
import { TalkToUsService } from './talk-to-us.service';

@ApiTags('talk-to-us')
@Controller('talk-to-us')
export class TalkToUsController {
  constructor(private readonly talkToUsService: TalkToUsService) {}

  @Public()
  @Get('active')
  findPublic(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<TalkToUsResponseDto> {
    return this.talkToUsService.findPublic(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findForAdmin(): Promise<TalkToUsSectionEntity> {
    return this.talkToUsService.findForAdmin();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(@Body() dto: UpdateTalkToUsDto): Promise<TalkToUsSectionEntity> {
    return this.talkToUsService.update(dto);
  }
}
