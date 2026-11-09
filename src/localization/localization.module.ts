import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configureLanguages } from './language-settings';
import { LocalizationService } from './localization.service';

@Module({
  providers: [LocalizationService],
  exports: [LocalizationService],
})
export class LocalizationModule {
  constructor(configService: ConfigService) {
    configureLanguages(
      configService.get<string[]>('language.supported') ?? [],
      configService.get<string>('language.default') ?? '',
    );
  }
}
