import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { HowItWorksResponseDto, UpdateHowItWorksSectionDto } from './dtos';
import { HowItWorksSectionEntity } from './entities';
import { HowItWorksSectionService } from './how-it-works-section.service';

@ApiTags('how-it-works')
@Controller('how-it-works')
export class HowItWorksSectionController {
  constructor(
    private readonly howItWorksSectionService: HowItWorksSectionService,
  ) {}

  @Public()
  @Get('active')
  findPublic(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<HowItWorksResponseDto> {
    return this.howItWorksSectionService.findPublic(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findForAdmin(): Promise<HowItWorksSectionEntity> {
    return this.howItWorksSectionService.findForAdmin();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(
    @Body() dto: UpdateHowItWorksSectionDto,
  ): Promise<HowItWorksSectionEntity> {
    return this.howItWorksSectionService.update(dto);
  }
}
