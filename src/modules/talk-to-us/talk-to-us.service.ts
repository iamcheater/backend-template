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
import { TalkToUsResponseDto, UpdateTalkToUsDto } from './dtos';
import { TalkToUsSectionEntity } from './entities';
import { TalkToUsNotFoundException } from './exceptions';

@Injectable()
export class TalkToUsService {
  constructor(
    @InjectRepository(TalkToUsSectionEntity)
    private readonly talkToUsRepository: Repository<TalkToUsSectionEntity>,
    private readonly mediaService: MediaService,
  ) {}

  async ensureSeeded(): Promise<void> {
    const existing = await this.talkToUsRepository.find({ take: 1 });

    if (existing.length > 0) {
      return;
    }

    await this.talkToUsRepository.save(
      this.talkToUsRepository.create({
        title: null,
        text: null,
        mediaAssetId: null,
      }),
    );
  }

  private async getSection(): Promise<TalkToUsSectionEntity> {
    const [section] = await this.talkToUsRepository.find({
      relations: ['mediaAsset'],
      take: 1,
    });

    if (!section) {
      throw new TalkToUsNotFoundException();
    }

    return section;
  }

  findForAdmin(): Promise<TalkToUsSectionEntity> {
    return this.getSection();
  }

  async update(dto: UpdateTalkToUsDto): Promise<TalkToUsSectionEntity> {
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

    if (dto.text !== undefined) {
      section.text = mergeTranslatedText(section.text, dto.text);
    }

    return this.talkToUsRepository.save(section);
  }

  async findPublic(language: SupportedLanguage): Promise<TalkToUsResponseDto> {
    const section = await this.getSection();

    let media: ResolvedMediaUrls | null = null;
    let mediaType = section.mediaAsset?.type ?? null;

    if (section.mediaAsset?.status === MediaStatus.READY) {
      media = this.mediaService.resolveMediaUrls(section.mediaAsset);
    } else {
      mediaType = null;
    }

    return new TalkToUsResponseDto({
      title: localize(section.title, language),
      text: localize(section.text, language),
      mediaType,
      media,
    });
  }
}
