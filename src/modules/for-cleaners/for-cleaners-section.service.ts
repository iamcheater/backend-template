import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaStatus } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import { CleanerExpectationService } from './cleaner-expectation.service';
import { ForCleanersResponseDto, UpdateForCleanersSectionDto } from './dtos';
import { ForCleanersSectionEntity } from './entities';
import { ForCleanersNotFoundException } from './exceptions';

@Injectable()
export class ForCleanersSectionService {
  constructor(
    @InjectRepository(ForCleanersSectionEntity)
    private readonly sectionRepository: Repository<ForCleanersSectionEntity>,
    private readonly mediaService: MediaService,
    private readonly expectationService: CleanerExpectationService,
  ) {}

  async ensureSeeded(): Promise<void> {
    const existing = await this.sectionRepository.find({ take: 1 });

    if (existing.length > 0) {
      return;
    }

    await this.sectionRepository.save(
      this.sectionRepository.create({
        title: null,
        description: null,
        mediaAssetId: null,
      }),
    );
  }

  private async getSection(): Promise<ForCleanersSectionEntity> {
    const [section] = await this.sectionRepository.find({
      relations: ['mediaAsset'],
      take: 1,
    });

    if (!section) {
      throw new ForCleanersNotFoundException();
    }

    return section;
  }

  findForAdmin(): Promise<ForCleanersSectionEntity> {
    return this.getSection();
  }

  async update(
    dto: UpdateForCleanersSectionDto,
  ): Promise<ForCleanersSectionEntity> {
    const section = await this.getSection();

    if (Boolean(dto.key) !== Boolean(dto.purpose)) {
      throw new InvalidUploadRequestException();
    }

    if (dto.key && dto.purpose) {
      const mediaAsset = await this.mediaService.attachFromKey(
        dto.key,
        dto.purpose,
      );
      section.mediaAssetId = mediaAsset.id;
      section.mediaAsset = mediaAsset;
    }

    if (dto.title !== undefined) {
      section.title = mergeTranslatedText(section.title, dto.title);
    }

    if (dto.description !== undefined) {
      section.description = mergeTranslatedText(
        section.description,
        dto.description,
      );
    }

    return this.sectionRepository.save(section);
  }

  async findPublic(
    language: SupportedLanguage,
  ): Promise<ForCleanersResponseDto> {
    const section = await this.getSection();
    const expectations = await this.expectationService.findAllPublic(language);

    let media: ResolvedMediaUrls | null = null;
    let mediaType = section.mediaAsset?.type ?? null;

    if (section.mediaAsset?.status === MediaStatus.READY) {
      media = this.mediaService.resolveMediaUrls(section.mediaAsset);
    } else {
      mediaType = null;
    }

    return new ForCleanersResponseDto({
      title: localize(section.title, language),
      description: localize(section.description, language),
      mediaType,
      media,
      expectations,
    });
  }
}
