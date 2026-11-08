import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslatedText } from 'src/common/types';
import { CleaningComponentService } from 'src/modules/cleaning-component/cleaning-component.service';
import { MediaStatus } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import {
  CreateServiceDto,
  ServiceComponentResponseDto,
  ServiceResponseDto,
  UpdateServiceDto,
} from './dtos';
import { ServiceEntity } from './entities';
import {
  ServiceNotFoundException,
  ServiceTitleAlreadyExistsException,
} from './exceptions';

const SERVICE_RELATIONS = ['mediaAsset', 'cleaningComponents'];

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly mediaService: MediaService,
    private readonly cleaningComponentService: CleaningComponentService,
  ) {}

  private async assertTitleAvailable(
    title: string,
    excludeId?: number,
  ): Promise<void> {
    const query = this.serviceRepository
      .createQueryBuilder('service')
      .where("service.title ->> 'en' = :title", { title });

    if (excludeId !== undefined) {
      query.andWhere('service.id != :excludeId', { excludeId });
    }

    if (await query.getExists()) {
      throw new ServiceTitleAlreadyExistsException();
    }
  }

  async create(dto: CreateServiceDto): Promise<ServiceEntity> {
    await this.assertTitleAvailable(dto.title.en);

    const mediaAsset = await this.mediaService.attachFromKey(
      dto.key,
      dto.purpose,
    );

    const service = this.serviceRepository.create({
      title: mergeTranslatedText<TranslatedText>(null, dto.title),
      description: mergeTranslatedText<TranslatedText>(null, dto.description),
      order: dto.order ?? 0,
      mediaAssetId: mediaAsset.id,
    });
    service.mediaAsset = mediaAsset;
    service.cleaningComponents = dto.componentIds?.length
      ? await this.cleaningComponentService.findByIds(dto.componentIds)
      : [];

    const saved = await this.serviceRepository.save(service);

    return this.findById(saved.id);
  }

  findAll(): Promise<ServiceEntity[]> {
    return this.serviceRepository.find({
      relations: SERVICE_RELATIONS,
      order: { order: 'ASC' },
    });
  }

  async findAllActive(
    language: SupportedLanguage,
  ): Promise<ServiceResponseDto[]> {
    const services = await this.serviceRepository.find({
      where: { isActive: true, mediaAsset: { status: MediaStatus.READY } },
      relations: SERVICE_RELATIONS,
      order: { order: 'ASC' },
    });

    return services.map(
      (service) =>
        new ServiceResponseDto({
          id: service.id,
          title: localize(service.title, language) ?? '',
          description: localize(service.description, language) ?? '',
          order: service.order,
          mediaType: service.mediaAsset.type,
          media: this.mediaService.resolveMediaUrls(service.mediaAsset),
          components: service.cleaningComponents.map(
            (component) =>
              new ServiceComponentResponseDto({
                id: component.id,
                title: localize(component.title, language) ?? '',
                description: localize(component.description, language),
              }),
          ),
        }),
    );
  }

  async findById(id: number): Promise<ServiceEntity> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: SERVICE_RELATIONS,
    });

    if (!service) {
      throw new ServiceNotFoundException();
    }

    return service;
  }

  async update(id: number, dto: UpdateServiceDto): Promise<ServiceEntity> {
    const service = await this.findById(id);

    if (dto.title?.en && dto.title.en !== service.title.en) {
      await this.assertTitleAvailable(dto.title.en, id);
    }

    if (Boolean(dto.key) !== Boolean(dto.purpose)) {
      throw new InvalidUploadRequestException();
    }

    if (dto.key && dto.purpose) {
      const mediaAsset = await this.mediaService.attachFromKey(
        dto.key,
        dto.purpose,
      );
      service.mediaAssetId = mediaAsset.id;
      service.mediaAsset = mediaAsset;
    }

    if (dto.title !== undefined) {
      service.title = mergeTranslatedText(service.title, dto.title);
    }

    if (dto.description !== undefined) {
      service.description = mergeTranslatedText(
        service.description,
        dto.description,
      );
    }

    if (dto.isActive !== undefined) {
      service.isActive = dto.isActive;
    }

    if (dto.order !== undefined) {
      service.order = dto.order;
    }

    if (dto.componentIds !== undefined) {
      service.cleaningComponents = dto.componentIds.length
        ? await this.cleaningComponentService.findByIds(dto.componentIds)
        : [];
    }

    return this.serviceRepository.save(service);
  }
}
