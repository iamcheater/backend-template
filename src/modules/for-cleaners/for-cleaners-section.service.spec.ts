import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { CleanerExpectationService } from './cleaner-expectation.service';
import { ForCleanersSectionService } from './for-cleaners-section.service';
import { ForCleanersSectionEntity } from './entities';
import { ForCleanersNotFoundException } from './exceptions';

describe('ForCleanersSectionService', () => {
  let service: ForCleanersSectionService;
  let repository: jest.Mocked<Repository<ForCleanersSectionEntity>>;
  let mediaService: jest.Mocked<MediaService>;
  let expectationService: jest.Mocked<CleanerExpectationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForCleanersSectionService,
        {
          provide: getRepositoryToken(ForCleanersSectionEntity),
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
          provide: CleanerExpectationService,
          useValue: {
            findAllPublic: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ForCleanersSectionService);
    repository = module.get(getRepositoryToken(ForCleanersSectionEntity));
    mediaService = module.get(MediaService);
    expectationService = module.get(CleanerExpectationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureSeeded', () => {
    it('creates the singleton row when none exists', async () => {
      repository.find.mockResolvedValue([]);
      const created = { id: 1 } as ForCleanersSectionEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledWith({
        title: null,
        description: null,
        mediaAssetId: null,
      });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('does nothing when the singleton row already exists', async () => {
      repository.find.mockResolvedValue([
        { id: 1 } as ForCleanersSectionEntity,
      ]);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('throws ForCleanersNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findForAdmin()).rejects.toThrow(
        ForCleanersNotFoundException,
      );
    });

    it('returns the section', async () => {
      const section = { id: 1 } as ForCleanersSectionEntity;
      repository.find.mockResolvedValue([section]);

      await expect(service.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('rejects a key given without a purpose', async () => {
      repository.find.mockResolvedValue([
        { id: 1 } as ForCleanersSectionEntity,
      ]);

      await expect(
        service.update({ key: 'for-cleaners-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('rejects a purpose given without a key', async () => {
      repository.find.mockResolvedValue([
        { id: 1 } as ForCleanersSectionEntity,
      ]);

      await expect(
        service.update({ purpose: UploadPurpose.FOR_CLEANERS_IMAGE }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const section = {
        id: 1,
        mediaAssetId: null,
      } as ForCleanersSectionEntity;
      repository.find.mockResolvedValue([section]);
      const newMediaAsset = { id: 9 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(newMediaAsset);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ForCleanersSectionEntity),
      );

      const result = await service.update({
        key: 'for-cleaners-video/new.mp4',
        purpose: UploadPurpose.FOR_CLEANERS_VIDEO,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'for-cleaners-video/new.mp4',
        UploadPurpose.FOR_CLEANERS_VIDEO,
      );
      expect(result.mediaAssetId).toBe(9);
    });

    it('stores title and description when none are set yet', async () => {
      const section = {
        id: 1,
        title: null,
        description: null,
      } as ForCleanersSectionEntity;
      repository.find.mockResolvedValue([section]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ForCleanersSectionEntity),
      );

      const result = await service.update({
        title: { en: 'For Cleaners', hy: '' },
        description: { en: 'What we expect from you' },
      });

      expect(result.title).toEqual({ en: 'For Cleaners' });
      expect(result.description).toEqual({ en: 'What we expect from you' });
    });

    it('merges the given translations into the stored ones', async () => {
      const section = {
        id: 1,
        title: { en: 'For Cleaners', hy: 'Մաքրողների համար' },
        description: { en: 'Old description' },
      } as ForCleanersSectionEntity;
      repository.find.mockResolvedValue([section]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ForCleanersSectionEntity),
      );

      const result = await service.update({
        title: { ru: 'Для клинеров' },
        description: { en: 'New description' },
      });

      expect(result.title).toEqual({
        en: 'For Cleaners',
        hy: 'Մաքրողների համար',
        ru: 'Для клинеров',
      });
      expect(result.description).toEqual({ en: 'New description' });
    });

    it('removes translations set to an empty string, including English', async () => {
      const section = {
        id: 1,
        title: { en: 'For Cleaners', hy: 'Մաքրողների համար' },
        description: { en: 'Description', ru: 'Описание' },
      } as ForCleanersSectionEntity;
      repository.find.mockResolvedValue([section]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ForCleanersSectionEntity),
      );

      const result = await service.update({
        title: { hy: '' },
        description: { en: '' },
      });

      expect(result.title).toEqual({ en: 'For Cleaners' });
      expect(result.description).toEqual({ ru: 'Описание' });
    });

    it('leaves title and description untouched when not given', async () => {
      const section = {
        id: 1,
        title: { en: 'Existing' },
        description: { en: 'Existing description' },
      } as ForCleanersSectionEntity;
      repository.find.mockResolvedValue([section]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ForCleanersSectionEntity),
      );

      const result = await service.update({});

      expect(result.title).toEqual({ en: 'Existing' });
      expect(result.description).toEqual({ en: 'Existing description' });
    });
  });

  describe('findPublic', () => {
    it('returns null media when no media asset is set', async () => {
      repository.find.mockResolvedValue([
        { id: 1, mediaAsset: null } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([]);

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
        } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([]);

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
        { id: 1, mediaAsset } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.media).toEqual({ url: 'https://signed-url' });
      expect(result.mediaType).toBe(MediaType.IMAGE);
    });

    it('includes ordered expectations in the response', async () => {
      repository.find.mockResolvedValue([
        { id: 1, mediaAsset: null } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([
        {
          id: 1,
          title: 'Be on time',
          description: 'Arrive on schedule',
          order: 0,
        },
      ]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.expectations).toEqual([
        {
          id: 1,
          title: 'Be on time',
          description: 'Arrive on schedule',
          order: 0,
        },
      ]);
    });

    it('localizes title and description and passes the language to expectations', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'For Cleaners', hy: 'Մաքրողների համար' },
          description: { en: 'What we expect', hy: 'Ինչ ենք սպասում' },
          mediaAsset: null,
        } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.title).toBe('Մաքրողների համար');
      expect(result.description).toBe('Ինչ ենք սպասում');
      expect(expectationService.findAllPublic).toHaveBeenCalledWith(
        SupportedLanguage.HY,
      );
    });

    it('falls back to English when the requested language is missing', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'For Cleaners', hy: 'Մաքրողների համար' },
          description: { en: 'What we expect' },
          mediaAsset: null,
        } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([]);

      const result = await service.findPublic(SupportedLanguage.RU);

      expect(result.title).toBe('For Cleaners');
      expect(result.description).toBe('What we expect');
    });

    it('returns null title and description when they are not set', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: null,
          description: null,
          mediaAsset: null,
        } as ForCleanersSectionEntity,
      ]);
      expectationService.findAllPublic.mockResolvedValue([]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.title).toBeNull();
      expect(result.description).toBeNull();
    });
  });
});
