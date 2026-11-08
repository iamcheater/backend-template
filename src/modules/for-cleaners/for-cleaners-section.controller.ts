import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { ForCleanersResponseDto, UpdateForCleanersSectionDto } from './dtos';
import { ForCleanersSectionEntity } from './entities';
import { ForCleanersSectionService } from './for-cleaners-section.service';

@ApiTags('for-cleaners')
@Controller('for-cleaners')
export class ForCleanersSectionController {
  constructor(
    private readonly forCleanersSectionService: ForCleanersSectionService,
  ) {}

  @Public()
  @Get('active')
  findPublic(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<ForCleanersResponseDto> {
    return this.forCleanersSectionService.findPublic(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findForAdmin(): Promise<ForCleanersSectionEntity> {
    return this.forCleanersSectionService.findForAdmin();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(
    @Body() dto: UpdateForCleanersSectionDto,
  ): Promise<ForCleanersSectionEntity> {
    return this.forCleanersSectionService.update(dto);
  }
}
