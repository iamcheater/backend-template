import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type Sharp from 'sharp';
import { Repository } from 'typeorm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof Sharp;
import { PresignUploadDto, PresignedUploadResultDto } from './dtos';
import { MediaAssetEntity } from './entities';
import { MediaStatus, MediaType, UploadPurpose } from './enums';
import {
  InvalidUploadRequestException,
  UnsupportedUploadTypeException,
  UploadTooLargeException,
} from './exceptions';
import { ResolvedMediaUrls } from './interfaces';
import { S3Service } from './s3.service';
import { UPLOAD_PURPOSES, describeMimeTypes, mimeToExtension } from './utils';

const PRESIGN_EXPIRY_SECONDS = 300;

const IMAGE_VARIANT_WIDTHS: Record<string, number> = {
  thumbnail: 200,
  medium: 800,
  full: 1600,
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetRepository: Repository<MediaAssetEntity>,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async createPresignedUpload(
    dto: PresignUploadDto,
  ): Promise<PresignedUploadResultDto> {
    const config = UPLOAD_PURPOSES[dto.purpose];
    const extension = mimeToExtension(dto.contentType);

    if (!config.allowedMimeTypes.includes(dto.contentType) || !extension) {
      throw new UnsupportedUploadTypeException(
        describeMimeTypes(config.allowedMimeTypes),
      );
    }

    const maxSizeMb = this.getMaxSizeMb(config.type);

    if (dto.fileSize > maxSizeMb * 1024 * 1024) {
      throw new UploadTooLargeException(maxSizeMb);
    }

    const key = `${dto.purpose}/${randomUUID()}.${extension}`;
    const uploadUrl = await this.s3Service.presignPutUrl(key, dto.contentType);

    return {
      key,
      uploadUrl,
      expiresAt: new Date(Date.now() + PRESIGN_EXPIRY_SECONDS * 1000),
    };
  }

  async attachFromKey(
    key: string,
    purpose: UploadPurpose,
  ): Promise<MediaAssetEntity> {
    if (!key.startsWith(`${purpose}/`)) {
      throw new InvalidUploadRequestException();
    }

    const config = UPLOAD_PURPOSES[purpose];
    const mediaAsset = this.mediaAssetRepository.create({
      type: config.type,
      status: MediaStatus.PENDING,
      key,
      variants: null,
    });
    const saved = await this.mediaAssetRepository.save(mediaAsset);

    if (config.type === MediaType.IMAGE) {
      void this.processImage(saved.id);
    } else {
      await this.mediaAssetRepository.update(saved.id, {
        status: MediaStatus.READY,
      });
    }

    return saved;
  }

  resolveMediaUrls(mediaAsset: MediaAssetEntity): ResolvedMediaUrls {
    if (mediaAsset.type === MediaType.VIDEO) {
      return { url: this.s3Service.publicUrl(mediaAsset.key) };
    }

    const variants = mediaAsset.variants;

    return {
      url: this.s3Service.publicUrl(variants?.full ?? mediaAsset.key),
      thumbnailUrl: this.publicUrlIfPresent(variants?.thumbnail),
      mediumUrl: this.publicUrlIfPresent(variants?.medium),
    };
  }

  private publicUrlIfPresent(key?: string): string | undefined {
    return key ? this.s3Service.publicUrl(key) : undefined;
  }

  private getMaxSizeMb(type: MediaType): number {
    const configKey =
      type === MediaType.IMAGE
        ? 'media.maxImageSizeMb'
        : 'media.maxVideoChunkSizeMb';

    return this.configService.get<number>(configKey) ?? 10;
  }

  private async processImage(mediaAssetId: number): Promise<void> {
    try {
      const mediaAsset = await this.mediaAssetRepository.findOneOrFail({
        where: { id: mediaAssetId },
      });
      await this.mediaAssetRepository.update(mediaAssetId, {
        status: MediaStatus.PROCESSING,
      });

      const original = await this.s3Service.getObjectBuffer(mediaAsset.key);
      const baseKey = mediaAsset.key.replace(/\.[^/.]+$/, '');
      const variants: Record<string, string> = {};

      for (const [name, width] of Object.entries(IMAGE_VARIANT_WIDTHS)) {
        const resized = await sharp(original)
          .resize({ width, withoutEnlargement: true })
          .webp()
          .toBuffer();
        const variantKey = `${baseKey}-${name}.webp`;
        await this.s3Service.putObject(variantKey, resized, 'image/webp');
        variants[name] = variantKey;
      }

      await this.mediaAssetRepository.update(mediaAssetId, {
        status: MediaStatus.READY,
        variants,
      });
    } catch (error) {
      await this.mediaAssetRepository.update(mediaAssetId, {
        status: MediaStatus.FAILED,
      });
      this.logger.error(
        `Failed to process media asset ${mediaAssetId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
