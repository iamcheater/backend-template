import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { StandardsResponseDto, UpdateStandardsDto } from './dtos';
import { StandardsSectionEntity } from './entities';
import { StandardsService } from './standards.service';

@ApiTags('standards')
@Controller('standards')
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Public()
  @Get('active')
  findPublic(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<StandardsResponseDto> {
    return this.standardsService.findPublic(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findForAdmin(): Promise<StandardsSectionEntity> {
    return this.standardsService.findForAdmin();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(@Body() dto: UpdateStandardsDto): Promise<StandardsSectionEntity> {
    return this.standardsService.update(dto);
  }
}
