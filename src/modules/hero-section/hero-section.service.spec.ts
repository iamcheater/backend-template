import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { HeroSectionService } from './hero-section.service';
import { HeroSlideEntity } from './entities';
import { HeroSlideNotFoundException } from './exceptions';

describe('HeroSectionService', () => {
  let service: HeroSectionService;
  let repository: jest.Mocked<Repository<HeroSlideEntity>>;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeroSectionService,
        {
          provide: getRepositoryToken(HeroSlideEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MediaService,
          useValue: {
            attachFromKey: jest.fn(),
            resolveMediaUrls: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(HeroSectionService);
    repository = module.get(getRepositoryToken(HeroSlideEntity));
    mediaService = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('always creates a new slide, regardless of how many already exist', async () => {
      const mediaAsset = { id: 5, type: MediaType.IMAGE } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(mediaAsset);
      const created = { id: 1, mediaAssetId: 5, order: 0 } as HeroSlideEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create({
        key: 'hero-image/abc.webp',
        purpose: UploadPurpose.HERO_IMAGE,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'hero-image/abc.webp',
        UploadPurpose.HERO_IMAGE,
      );
      expect(repository.create).toHaveBeenCalledWith({
        mediaAssetId: 5,
        order: 0,
      });
      expect(result).toBe(created);
    });

    it('defaults order to 0 when not provided', async () => {
      mediaService.attachFromKey.mockResolvedValue({
        id: 5,
      } as MediaAssetEntity);
      repository.create.mockReturnValue({} as HeroSlideEntity);
      repository.save.mockResolvedValue({} as HeroSlideEntity);

      await service.create({
        key: 'hero-image/abc.webp',
        purpose: UploadPurpose.HERO_IMAGE,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 0 }),
      );
    });
  });

  describe('findById', () => {
    it('throws HeroSlideNotFoundException when the slide does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        HeroSlideNotFoundException,
      );
    });

    it('returns the slide with its media relation loaded', async () => {
      const slide = { id: 1 } as HeroSlideEntity;
      repository.findOne.mockResolvedValue(slide);

      await expect(service.findById(1)).resolves.toBe(slide);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['mediaAsset'],
      });
    });
  });

  describe('update', () => {
    it('throws HeroSlideNotFoundException when the slide does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, {})).rejects.toThrow(
        HeroSlideNotFoundException,
      );
    });

    it('rejects a key given without a purpose', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as HeroSlideEntity);

      await expect(
        service.update(1, { key: 'hero-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('rejects a purpose given without a key', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as HeroSlideEntity);

      await expect(
        service.update(1, { purpose: UploadPurpose.HERO_IMAGE }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const slide = { id: 1, mediaAssetId: 5 } as HeroSlideEntity;
      repository.findOne.mockResolvedValue(slide);
      const newMediaAsset = { id: 9 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(newMediaAsset);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HeroSlideEntity),
      );

      const result = await service.update(1, {
        key: 'hero-video/new.mp4',
        purpose: UploadPurpose.HERO_VIDEO,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'hero-video/new.mp4',
        UploadPurpose.HERO_VIDEO,
      );
      expect(result.mediaAssetId).toBe(9);
    });

    it('updates order and isActive without touching the media', async () => {
      const slide = {
        id: 1,
        mediaAssetId: 5,
        order: 0,
        isActive: true,
      } as HeroSlideEntity;
      repository.findOne.mockResolvedValue(slide);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HeroSlideEntity),
      );

      const result = await service.update(1, { order: 3, isActive: false });

      expect(mediaService.attachFromKey).not.toHaveBeenCalled();
      expect(result.order).toBe(3);
      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('throws HeroSlideNotFoundException when the slide does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        HeroSlideNotFoundException,
      );
    });

    it('deletes the slide when it exists', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as HeroSlideEntity);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findAllPublic', () => {
    it('only queries ready, active slides ordered for display', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAllPublic();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true, mediaAsset: { status: MediaStatus.READY } },
        relations: ['mediaAsset'],
        order: { order: 'ASC' },
      });
    });

    it('maps each slide to a response dto with resolved media urls', async () => {
      const mediaAsset = { type: MediaType.IMAGE } as MediaAssetEntity;
      repository.find.mockResolvedValue([
        { id: 1, order: 0, mediaAsset } as HeroSlideEntity,
      ]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });

      const result = await service.findAllPublic();

      expect(result).toEqual([
        {
          id: 1,
          order: 0,
          mediaType: MediaType.IMAGE,
          media: { url: 'https://signed-url' },
        },
      ]);
    });
  });
});
