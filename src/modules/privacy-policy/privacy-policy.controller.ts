import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { PrivacyPolicyResponseDto, UpdatePrivacyPolicyDto } from './dtos';
import { PrivacyPolicyEntity } from './entities';
import { PrivacyPolicyService } from './privacy-policy.service';

@ApiTags('privacy-policy')
@Controller('privacy-policy')
export class PrivacyPolicyController {
  constructor(private readonly privacyPolicyService: PrivacyPolicyService) {}

  @Public()
  @Get('active')
  findPublic(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<PrivacyPolicyResponseDto> {
    return this.privacyPolicyService.findPublic(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findForAdmin(): Promise<PrivacyPolicyEntity> {
    return this.privacyPolicyService.findForAdmin();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch()
  update(@Body() dto: UpdatePrivacyPolicyDto): Promise<PrivacyPolicyEntity> {
    return this.privacyPolicyService.update(dto);
  }
}
