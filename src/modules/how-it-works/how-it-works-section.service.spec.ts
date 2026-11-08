import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { HowItWorksSectionService } from './how-it-works-section.service';
import { HowItWorksStepService } from './how-it-works-step.service';
import { HowItWorksSectionEntity } from './entities';
import { HowItWorksSectionNotFoundException } from './exceptions';

describe('HowItWorksSectionService', () => {
  let service: HowItWorksSectionService;
  let repository: jest.Mocked<Repository<HowItWorksSectionEntity>>;
  let mediaService: jest.Mocked<MediaService>;
  let stepService: jest.Mocked<HowItWorksStepService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HowItWorksSectionService,
        {
          provide: getRepositoryToken(HowItWorksSectionEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MediaService,
          useValue: {
            attachFromKey: jest.fn(),
            resolveMediaUrls: jest.fn(),
          },
        },
        {
          provide: HowItWorksStepService,
          useValue: {
            findAllPublic: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(HowItWorksSectionService);
    repository = module.get(getRepositoryToken(HowItWorksSectionEntity));
    mediaService = module.get(MediaService);
    stepService = module.get(HowItWorksStepService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureSeeded', () => {
    it('creates the singleton row when none exists', async () => {
      repository.find.mockResolvedValue([]);
      const created = { id: 1 } as HowItWorksSectionEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledWith({
        mediaAssetId: null,
      });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('does nothing when the singleton row already exists', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as HowItWorksSectionEntity]);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('throws HowItWorksSectionNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findForAdmin()).rejects.toThrow(
        HowItWorksSectionNotFoundException,
      );
    });

    it('returns the section', async () => {
      const section = { id: 1 } as HowItWorksSectionEntity;
      repository.find.mockResolvedValue([section]);

      await expect(service.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('rejects a key given without a purpose', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as HowItWorksSectionEntity]);

      await expect(
        service.update({ key: 'how-it-works-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('rejects a purpose given without a key', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as HowItWorksSectionEntity]);

      await expect(
        service.update({ purpose: UploadPurpose.HOW_IT_WORKS_IMAGE }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const section = {
        id: 1,
        mediaAssetId: null,
      } as HowItWorksSectionEntity;
      repository.find.mockResolvedValue([section]);
      const newMediaAsset = { id: 9 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(newMediaAsset);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HowItWorksSectionEntity),
      );

      const result = await service.update({
        key: 'how-it-works-video/new.mp4',
        purpose: UploadPurpose.HOW_IT_WORKS_VIDEO,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'how-it-works-video/new.mp4',
        UploadPurpose.HOW_IT_WORKS_VIDEO,
      );
      expect(result.mediaAssetId).toBe(9);
    });
  });

  describe('findPublic', () => {
    it('returns null media when no media asset is set', async () => {
      repository.find.mockResolvedValue([
        { id: 1, mediaAsset: null } as HowItWorksSectionEntity,
      ]);
      stepService.findAllPublic.mockResolvedValue([]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.media).toBeNull();
      expect(result.mediaType).toBeNull();
    });

    it('returns null media when the media asset is not ready yet', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          mediaAsset: {
            type: MediaType.IMAGE,
            status: MediaStatus.PROCESSING,
          } as MediaAssetEntity,
        } as HowItWorksSectionEntity,
      ]);
      stepService.findAllPublic.mockResolvedValue([]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.media).toBeNull();
      expect(result.mediaType).toBeNull();
      expect(mediaService.resolveMediaUrls).not.toHaveBeenCalled();
    });

    it('resolves media urls when the media asset is ready', async () => {
      const mediaAsset = {
        type: MediaType.IMAGE,
        status: MediaStatus.READY,
      } as MediaAssetEntity;
      repository.find.mockResolvedValue([
        {
          id: 1,
          mediaAsset,
        } as HowItWorksSectionEntity,
      ]);
      stepService.findAllPublic.mockResolvedValue([]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.media).toEqual({ url: 'https://signed-url' });
      expect(result.mediaType).toBe(MediaType.IMAGE);
    });

    it('includes ordered steps localized to the requested language', async () => {
      repository.find.mockResolvedValue([
        { id: 1, mediaAsset: null } as HowItWorksSectionEntity,
      ]);
      stepService.findAllPublic.mockResolvedValue([
        {
          id: 1,
          title: 'Sign up',
          description: 'Create an account',
          order: 0,
          mediaType: null,
          media: null,
        },
      ]);

      const result = await service.findPublic(SupportedLanguage.RU);

      expect(stepService.findAllPublic).toHaveBeenCalledWith(
        SupportedLanguage.RU,
      );
      expect(result.steps).toEqual([
        {
          id: 1,
          title: 'Sign up',
          description: 'Create an account',
          order: 0,
          mediaType: null,
          media: null,
        },
      ]);
    });
  });
});
