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
import { StandardsResponseDto, UpdateStandardsDto } from './dtos';
import { StandardsSectionEntity } from './entities';
import { StandardsNotFoundException } from './exceptions';

@Injectable()
export class StandardsService {
  constructor(
    @InjectRepository(StandardsSectionEntity)
    private readonly standardsRepository: Repository<StandardsSectionEntity>,
    private readonly mediaService: MediaService,
  ) {}

  async ensureSeeded(): Promise<void> {
    const existing = await this.standardsRepository.find({ take: 1 });

    if (existing.length > 0) {
      return;
    }

    await this.standardsRepository.save(
      this.standardsRepository.create({ text: null, mediaAssetId: null }),
    );
  }

  private async getSection(): Promise<StandardsSectionEntity> {
    const [section] = await this.standardsRepository.find({
      relations: ['mediaAsset'],
      take: 1,
    });

    if (!section) {
      throw new StandardsNotFoundException();
    }

    return section;
  }

  findForAdmin(): Promise<StandardsSectionEntity> {
    return this.getSection();
  }

  async update(dto: UpdateStandardsDto): Promise<StandardsSectionEntity> {
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

    if (dto.text !== undefined) {
      section.text = mergeTranslatedText(section.text, dto.text);
    }

    return this.standardsRepository.save(section);
  }

  async findPublic(language: SupportedLanguage): Promise<StandardsResponseDto> {
    const section = await this.getSection();

    let media: ResolvedMediaUrls | null = null;
    let mediaType = section.mediaAsset?.type ?? null;

    if (section.mediaAsset?.status === MediaStatus.READY) {
      media = this.mediaService.resolveMediaUrls(section.mediaAsset);
    } else {
      mediaType = null;
    }

    return new StandardsResponseDto({
      text: localize(section.text, language),
      mediaType,
      media,
    });
  }
}
