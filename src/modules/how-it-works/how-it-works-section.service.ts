import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaStatus } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { HowItWorksResponseDto, UpdateHowItWorksSectionDto } from './dtos';
import { HowItWorksSectionEntity } from './entities';
import { HowItWorksSectionNotFoundException } from './exceptions';
import { HowItWorksStepService } from './how-it-works-step.service';

@Injectable()
export class HowItWorksSectionService {
  constructor(
    @InjectRepository(HowItWorksSectionEntity)
    private readonly sectionRepository: Repository<HowItWorksSectionEntity>,
    private readonly mediaService: MediaService,
    private readonly stepService: HowItWorksStepService,
  ) {}

  async ensureSeeded(): Promise<void> {
    const existing = await this.sectionRepository.find({ take: 1 });

    if (existing.length > 0) {
      return;
    }

    await this.sectionRepository.save(
      this.sectionRepository.create({ mediaAssetId: null }),
    );
  }

  private async getSection(): Promise<HowItWorksSectionEntity> {
    const [section] = await this.sectionRepository.find({
      relations: ['mediaAsset'],
      take: 1,
    });

    if (!section) {
      throw new HowItWorksSectionNotFoundException();
    }

    return section;
  }

  findForAdmin(): Promise<HowItWorksSectionEntity> {
    return this.getSection();
  }

  async update(
    dto: UpdateHowItWorksSectionDto,
  ): Promise<HowItWorksSectionEntity> {
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

    return this.sectionRepository.save(section);
  }

  async findPublic(
    language: SupportedLanguage,
  ): Promise<HowItWorksResponseDto> {
    const section = await this.getSection();
    const steps = await this.stepService.findAllPublic(language);

    let media: ResolvedMediaUrls | null = null;
    let mediaType = section.mediaAsset?.type ?? null;

    if (section.mediaAsset?.status === MediaStatus.READY) {
      media = this.mediaService.resolveMediaUrls(section.mediaAsset);
    } else {
      mediaType = null;
    }

    return new HowItWorksResponseDto({
      mediaType,
      media,
      steps,
    });
  }
}
