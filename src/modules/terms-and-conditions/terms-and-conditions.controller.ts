import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import {
  TermsAndConditionsResponseDto,
  UpdateTermsAndConditionsDto,
} from './dtos';
import { TermsAndConditionsEntity } from './entities';
import { TermsAndConditionsService } from './terms-and-conditions.service';

@ApiTags('terms-and-conditions')
@Controller('terms-and-conditions')
export class TermsAndConditionsController {
  constructor(
    private readonly termsAndConditionsService: TermsAndConditionsService,
  ) {}

  @Public()
  @Get('active')
  findPublic(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<TermsAndConditionsResponseDto> {
    return this.termsAndConditionsService.findPublic(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findForAdmin(): Promise<TermsAndConditionsEntity> {
    return this.termsAndConditionsService.findForAdmin();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(
    @Body() dto: UpdateTermsAndConditionsDto,
  ): Promise<TermsAndConditionsEntity> {
    return this.termsAndConditionsService.update(dto);
  }
}
