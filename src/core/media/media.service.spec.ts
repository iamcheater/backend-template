import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';
import { MediaAssetEntity } from './entities';
import { MediaStatus, MediaType, UploadPurpose } from './enums';
import {
  InvalidUploadRequestException,
  UnsupportedUploadTypeException,
  UploadTooLargeException,
} from './exceptions';

jest.mock('sharp', () =>
  jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized')),
  })),
);

describe('MediaService', () => {
  let service: MediaService;
  let repository: jest.Mocked<Repository<MediaAssetEntity>>;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: getRepositoryToken(MediaAssetEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            findOneOrFail: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            presignPutUrl: jest.fn(),
            publicUrl: jest.fn((key: string) => `https://media.test/${key}`),
            getObjectBuffer: jest.fn(),
            putObject: jest.fn(),
            deleteObject: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const values: Record<string, number> = {
                'media.maxImageSizeMb': 10,
                'media.maxVideoChunkSizeMb': 10,
              };
              return values[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(MediaService);
    repository = module.get(getRepositoryToken(MediaAssetEntity));
    s3Service = module.get(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPresignedUpload', () => {
    const dto = {
      purpose: UploadPurpose.EXAMPLE_IMAGE,
      contentType: 'image/webp',
      fileSize: 1024,
    };

    it('rejects a content type not allowed for the purpose, naming the allowed formats', async () => {
      const rejection = service.createPresignedUpload({
        ...dto,
        contentType: 'video/mp4',
      });

      await expect(rejection).rejects.toThrow(UnsupportedUploadTypeException);
      await expect(rejection).rejects.toMatchObject({
        translationArgs: { formats: 'JPG, PNG, WEBP' },
      });
    });

    it('rejects a content type the platform cannot store at all', async () => {
      await expect(
        service.createPresignedUpload({
          ...dto,
          contentType: 'application/pdf',
        }),
      ).rejects.toThrow(UnsupportedUploadTypeException);
    });

    it('rejects a file size over the configured MEDIA_MAX_IMAGE_SIZE_MB limit, naming the limit', async () => {
      const rejection = service.createPresignedUpload({
        ...dto,
        fileSize: 11 * 1024 * 1024,
      });

      await expect(rejection).rejects.toThrow(UploadTooLargeException);
      await expect(rejection).rejects.toMatchObject({
        translationArgs: { maxSizeMb: 10 },
      });
    });

    it('checks the format before the size', async () => {
      await expect(
        service.createPresignedUpload({
          ...dto,
          contentType: 'application/pdf',
          fileSize: 11 * 1024 * 1024,
        }),
      ).rejects.toThrow(UnsupportedUploadTypeException);
    });

    it('returns a presigned URL with a key scoped to the purpose', async () => {
      s3Service.presignPutUrl.mockResolvedValue('https://signed-url');

      const result = await service.createPresignedUpload(dto);

      expect(result.uploadUrl).toBe('https://signed-url');
      expect(result.key).toMatch(/^example-image\/.+\.webp$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(s3Service.presignPutUrl).toHaveBeenCalledWith(
        result.key,
        'image/webp',
      );
    });
  });

  describe('attachFromKey', () => {
    it('rejects a key that does not match the purpose prefix', async () => {
      await expect(
        service.attachFromKey(
          'wrong-prefix/abc.webp',
          UploadPurpose.EXAMPLE_IMAGE,
        ),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('creates a pending image media asset and kicks off processing', async () => {
      const created = {
        id: 1,
        type: MediaType.IMAGE,
        status: MediaStatus.PENDING,
        key: 'example-image/abc.webp',
        variants: null,
      } as MediaAssetEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      repository.findOneOrFail.mockResolvedValue(created);
      s3Service.getObjectBuffer.mockResolvedValue(Buffer.from('original'));

      const result = await service.attachFromKey(
        'example-image/abc.webp',
        UploadPurpose.EXAMPLE_IMAGE,
      );

      expect(repository.create).toHaveBeenCalledWith({
        type: MediaType.IMAGE,
        status: MediaStatus.PENDING,
        key: 'example-image/abc.webp',
        variants: null,
      });
      expect(result).toBe(created);
    });
  });

  describe('resolveMediaUrls', () => {
    it('returns only a public url for video, with no variants', () => {
      const result = service.resolveMediaUrls({
        id: 1,
        type: MediaType.VIDEO,
        status: MediaStatus.READY,
        key: 'example-video/abc.mp4',
        variants: null,
      } as MediaAssetEntity);

      expect(result).toEqual({
        url: 'https://media.test/example-video/abc.mp4',
      });
      expect(s3Service.publicUrl).toHaveBeenCalledTimes(1);
    });

    it('resolves full/thumbnail/medium public urls for an image with variants', () => {
      const result = service.resolveMediaUrls({
        id: 1,
        type: MediaType.IMAGE,
        status: MediaStatus.READY,
        key: 'example-image/abc.webp',
        createdAt: new Date(),
        updatedAt: new Date(),
        variants: {
          thumbnail: 'example-image/abc-thumbnail.webp',
          medium: 'example-image/abc-medium.webp',
          full: 'example-image/abc-full.webp',
        },
      });

      expect(result).toEqual({
        url: 'https://media.test/example-image/abc-full.webp',
        thumbnailUrl: 'https://media.test/example-image/abc-thumbnail.webp',
        mediumUrl: 'https://media.test/example-image/abc-medium.webp',
      });
    });

    it('falls back to the raw key when an image has no variants yet', () => {
      const result = service.resolveMediaUrls({
        id: 1,
        type: MediaType.IMAGE,
        status: MediaStatus.READY,
        key: 'example-image/abc.webp',
        variants: null,
      } as MediaAssetEntity);

      expect(result).toEqual({
        url: 'https://media.test/example-image/abc.webp',
      });
    });
  });
});
