import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import {
  TermsAndConditionsResponseDto,
  UpdateTermsAndConditionsDto,
} from './dtos';
import { TermsAndConditionsEntity } from './entities';
import { TermsAndConditionsNotFoundException } from './exceptions';

@Injectable()
export class TermsAndConditionsService {
  constructor(
    @InjectRepository(TermsAndConditionsEntity)
    private readonly termsAndConditionsRepository: Repository<TermsAndConditionsEntity>,
  ) {}

  async ensureSeeded(): Promise<void> {
    const existing = await this.termsAndConditionsRepository.find({
      take: 1,
    });

    if (existing.length > 0) {
      return;
    }

    await this.termsAndConditionsRepository.save(
      this.termsAndConditionsRepository.create({ content: null }),
    );
  }

  private async getTerms(): Promise<TermsAndConditionsEntity> {
    const [terms] = await this.termsAndConditionsRepository.find({
      take: 1,
    });

    if (!terms) {
      throw new TermsAndConditionsNotFoundException();
    }

    return terms;
  }

  findForAdmin(): Promise<TermsAndConditionsEntity> {
    return this.getTerms();
  }

  async update(
    dto: UpdateTermsAndConditionsDto,
  ): Promise<TermsAndConditionsEntity> {
    const terms = await this.getTerms();

    if (dto.content !== undefined) {
      terms.content = mergeTranslatedText(terms.content, dto.content);
    }

    return this.termsAndConditionsRepository.save(terms);
  }

  async findPublic(
    language: SupportedLanguage,
  ): Promise<TermsAndConditionsResponseDto> {
    const terms = await this.getTerms();

    return new TermsAndConditionsResponseDto({
      content: localize(terms.content, language),
      updatedAt: terms.updatedAt,
    });
  }
}
