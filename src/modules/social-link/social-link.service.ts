import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { UpdateSocialLinkDto } from './dtos';
import { SocialLinkEntity } from './entities';
import { SocialPlatform } from './enums';
import {
  InvalidSocialLinkUrlException,
  SocialLinkNotFoundException,
} from './exceptions';
import { isUrlForPlatform } from './utils';

@Injectable()
export class SocialLinkService {
  constructor(
    @InjectRepository(SocialLinkEntity)
    private readonly socialLinkRepository: Repository<SocialLinkEntity>,
  ) {}

  findAll(): Promise<SocialLinkEntity[]> {
    return this.socialLinkRepository.find({ order: { platform: 'ASC' } });
  }

  findAllActive(): Promise<SocialLinkEntity[]> {
    return this.socialLinkRepository.find({
      where: { isActive: true, url: Not(IsNull()) },
      order: { platform: 'ASC' },
    });
  }

  async updateByPlatform(
    platform: SocialPlatform,
    dto: UpdateSocialLinkDto,
  ): Promise<SocialLinkEntity> {
    if (dto.url && !isUrlForPlatform(platform, dto.url)) {
      throw new InvalidSocialLinkUrlException(platform);
    }

    const link = await this.socialLinkRepository.findOne({
      where: { platform },
    });

    if (!link) {
      throw new SocialLinkNotFoundException();
    }

    if (dto.url !== undefined) {
      link.url = dto.url;
    }

    if (dto.isActive !== undefined) {
      link.isActive = dto.isActive;
    }

    return this.socialLinkRepository.save(link);
  }

  async ensureSeeded(): Promise<void> {
    for (const platform of Object.values(SocialPlatform)) {
      const existing = await this.socialLinkRepository.findOne({
        where: { platform },
      });

      if (existing) {
        continue;
      }

      await this.socialLinkRepository.save(
        this.socialLinkRepository.create({
          platform,
          url: null,
          isActive: true,
        }),
      );
    }
  }
}
