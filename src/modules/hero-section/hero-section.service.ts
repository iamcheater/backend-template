import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaStatus } from 'src/modules/media/enums';
import { MediaService } from 'src/modules/media/media.service';
import {
  CreateHeroSlideDto,
  HeroSlideResponseDto,
  UpdateHeroSlideDto,
} from './dtos';
import { HeroSlideEntity } from './entities';
import { HeroSlideNotFoundException } from './exceptions';

@Injectable()
export class HeroSectionService {
  constructor(
    @InjectRepository(HeroSlideEntity)
    private readonly heroSlideRepository: Repository<HeroSlideEntity>,
    private readonly mediaService: MediaService,
  ) {}

  async create(dto: CreateHeroSlideDto): Promise<HeroSlideEntity> {
    const mediaAsset = await this.mediaService.attachFromKey(
      dto.key,
      dto.purpose,
    );
    const slide = this.heroSlideRepository.create({
      mediaAssetId: mediaAsset.id,
      order: dto.order ?? 0,
    });
    slide.mediaAsset = mediaAsset;

    return this.heroSlideRepository.save(slide);
  }

  findAll(): Promise<HeroSlideEntity[]> {
    return this.heroSlideRepository.find({
      relations: ['mediaAsset'],
      order: { order: 'ASC' },
    });
  }

  async findById(id: number): Promise<HeroSlideEntity> {
    const slide = await this.heroSlideRepository.findOne({
      where: { id },
      relations: ['mediaAsset'],
    });

    if (!slide) {
      throw new HeroSlideNotFoundException();
    }

    return slide;
  }

  async update(id: number, dto: UpdateHeroSlideDto): Promise<HeroSlideEntity> {
    const slide = await this.findById(id);

    if (Boolean(dto.key) !== Boolean(dto.purpose)) {
      throw new InvalidUploadRequestException();
    }

    if (dto.key && dto.purpose) {
      const mediaAsset = await this.mediaService.attachFromKey(
        dto.key,
        dto.purpose,
      );
      slide.mediaAssetId = mediaAsset.id;
      slide.mediaAsset = mediaAsset;
    }

    if (dto.order !== undefined) {
      slide.order = dto.order;
    }

    if (dto.isActive !== undefined) {
      slide.isActive = dto.isActive;
    }

    return this.heroSlideRepository.save(slide);
  }

  async remove(id: number): Promise<void> {
    const slide = await this.findById(id);
    await this.heroSlideRepository.delete(slide.id);
  }

  async findAllPublic(): Promise<HeroSlideResponseDto[]> {
    const slides = await this.heroSlideRepository.find({
      where: { isActive: true, mediaAsset: { status: MediaStatus.READY } },
      relations: ['mediaAsset'],
      order: { order: 'ASC' },
    });

    return slides.map(
      (slide) =>
        new HeroSlideResponseDto({
          id: slide.id,
          order: slide.order,
          mediaType: slide.mediaAsset.type,
          media: this.mediaService.resolveMediaUrls(slide.mediaAsset),
        }),
    );
  }
}
