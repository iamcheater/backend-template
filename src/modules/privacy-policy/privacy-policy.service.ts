import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import { PrivacyPolicyResponseDto, UpdatePrivacyPolicyDto } from './dtos';
import { PrivacyPolicyEntity } from './entities';
import { PrivacyPolicyNotFoundException } from './exceptions';

@Injectable()
export class PrivacyPolicyService {
  constructor(
    @InjectRepository(PrivacyPolicyEntity)
    private readonly privacyPolicyRepository: Repository<PrivacyPolicyEntity>,
  ) {}

  async ensureSeeded(): Promise<void> {
    const existing = await this.privacyPolicyRepository.find({ take: 1 });

    if (existing.length > 0) {
      return;
    }

    await this.privacyPolicyRepository.save(
      this.privacyPolicyRepository.create({ content: null }),
    );
  }

  private async getPolicy(): Promise<PrivacyPolicyEntity> {
    const [policy] = await this.privacyPolicyRepository.find({ take: 1 });

    if (!policy) {
      throw new PrivacyPolicyNotFoundException();
    }

    return policy;
  }

  findForAdmin(): Promise<PrivacyPolicyEntity> {
    return this.getPolicy();
  }

  async update(dto: UpdatePrivacyPolicyDto): Promise<PrivacyPolicyEntity> {
    const policy = await this.getPolicy();

    if (dto.content !== undefined) {
      policy.content = mergeTranslatedText(policy.content, dto.content);
    }

    return this.privacyPolicyRepository.save(policy);
  }

  async findPublic(
    language: SupportedLanguage,
  ): Promise<PrivacyPolicyResponseDto> {
    const policy = await this.getPolicy();

    return new PrivacyPolicyResponseDto({
      content: localize(policy.content, language),
      updatedAt: policy.updatedAt,
    });
  }
}
