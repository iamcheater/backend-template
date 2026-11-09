import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Public, RequestLanguage } from 'src/common/decorators';
import { LocalizedSection } from 'src/common/sections';
import { AdminJwtAuthGuard, RolesGuard } from 'src/core/admin-auth/guards';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { E2eSectionEntity } from './e2e-section.entity';
import { E2eSectionService } from './e2e-section.service';
import { UpdateE2eSectionDto } from './update-e2e-section.dto';

@Controller('e2e-section')
export class E2eSectionController {
  constructor(private readonly e2eSectionService: E2eSectionService) {}

  @Public()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  getForAdmin(): Promise<E2eSectionEntity> {
    return this.e2eSectionService.getForAdmin();
  }

  @Public()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(@Body() dto: UpdateE2eSectionDto): Promise<E2eSectionEntity> {
    return this.e2eSectionService.update(dto);
  }

  @Public()
  @Get('active')
  getActive(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<LocalizedSection<E2eSectionEntity, 'title' | 'subtitle'>> {
    return this.e2eSectionService.getActiveForPublic(language);
  }
}
