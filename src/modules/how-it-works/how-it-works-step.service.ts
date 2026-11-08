import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslatedText } from 'src/common/types';
import { MediaStatus } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import {
  CreateHowItWorksStepDto,
  HowItWorksStepResponseDto,
  UpdateHowItWorksStepDto,
} from './dtos';
import { HowItWorksStepEntity } from './entities';
import { HowItWorksStepNotFoundException } from './exceptions';

@Injectable()
export class HowItWorksStepService {
  constructor(
    @InjectRepository(HowItWorksStepEntity)
    private readonly stepRepository: Repository<HowItWorksStepEntity>,
    private readonly mediaService: MediaService,
  ) {}

  async create(dto: CreateHowItWorksStepDto): Promise<HowItWorksStepEntity> {
    if (Boolean(dto.key) !== Boolean(dto.purpose)) {
      throw new InvalidUploadRequestException();
    }

    let mediaAssetId: number | null = null;

    if (dto.key && dto.purpose) {
      const mediaAsset = await this.mediaService.attachFromKey(
        dto.key,
        dto.purpose,
      );
      mediaAssetId = mediaAsset.id;
    }

    const step = this.stepRepository.create({
      title: mergeTranslatedText<TranslatedText>(null, dto.title),
      description: mergeTranslatedText<TranslatedText>(null, dto.description),
      order: dto.order ?? 0,
      mediaAssetId,
    });

    return this.stepRepository.save(step);
  }

  findAll(): Promise<HowItWorksStepEntity[]> {
    return this.stepRepository.find({
      relations: ['mediaAsset'],
      order: { order: 'ASC' },
    });
  }

  async findAllPublic(
    language: SupportedLanguage,
  ): Promise<HowItWorksStepResponseDto[]> {
    const steps = await this.findAll();

    return steps.map((step) => {
      const ready = step.mediaAsset?.status === MediaStatus.READY;

      return new HowItWorksStepResponseDto({
        id: step.id,
        title: localize(step.title, language) ?? '',
        description: localize(step.description, language) ?? '',
        order: step.order,
        mediaType: ready ? (step.mediaAsset?.type ?? null) : null,
        media:
          ready && step.mediaAsset
            ? this.mediaService.resolveMediaUrls(step.mediaAsset)
            : null,
      });
    });
  }

  async findById(id: number): Promise<HowItWorksStepEntity> {
    const step = await this.stepRepository.findOne({
      where: { id },
      relations: ['mediaAsset'],
    });

    if (!step) {
      throw new HowItWorksStepNotFoundException();
    }

    return step;
  }

  async update(
    id: number,
    dto: UpdateHowItWorksStepDto,
  ): Promise<HowItWorksStepEntity> {
    const step = await this.findById(id);

    if (Boolean(dto.key) !== Boolean(dto.purpose)) {
      throw new InvalidUploadRequestException();
    }

    if (dto.key && dto.purpose) {
      const mediaAsset = await this.mediaService.attachFromKey(
        dto.key,
        dto.purpose,
      );
      step.mediaAssetId = mediaAsset.id;
      step.mediaAsset = mediaAsset;
    }

    if (dto.title !== undefined) {
      step.title = mergeTranslatedText(step.title, dto.title);
    }

    if (dto.description !== undefined) {
      step.description = mergeTranslatedText(step.description, dto.description);
    }

    if (dto.order !== undefined) {
      step.order = dto.order;
    }

    return this.stepRepository.save(step);
  }

  async remove(id: number): Promise<void> {
    const step = await this.findById(id);
    await this.stepRepository.delete(step.id);
  }
}
