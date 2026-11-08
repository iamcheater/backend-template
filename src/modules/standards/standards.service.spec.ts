import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { StandardsService } from './standards.service';
import { StandardsSectionEntity } from './entities';
import { StandardsNotFoundException } from './exceptions';

describe('StandardsService', () => {
  let service: StandardsService;
  let repository: jest.Mocked<Repository<StandardsSectionEntity>>;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandardsService,
        {
          provide: getRepositoryToken(StandardsSectionEntity),
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
      ],
    }).compile();

    service = module.get(StandardsService);
    repository = module.get(getRepositoryToken(StandardsSectionEntity));
    mediaService = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureSeeded', () => {
    it('creates the singleton row when none exists', async () => {
      repository.find.mockResolvedValue([]);
      const created = { id: 1 } as StandardsSectionEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledWith({
        text: null,
        mediaAssetId: null,
      });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('does nothing when the singleton row already exists', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as StandardsSectionEntity]);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('throws StandardsNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findForAdmin()).rejects.toThrow(
        StandardsNotFoundException,
      );
    });

    it('returns the section', async () => {
      const section = { id: 1 } as StandardsSectionEntity;
      repository.find.mockResolvedValue([section]);

      await expect(service.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('rejects a key given without a purpose', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as StandardsSectionEntity]);

      await expect(
        service.update({ key: 'standards-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('rejects a purpose given without a key', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as StandardsSectionEntity]);

      await expect(
        service.update({ purpose: UploadPurpose.STANDARDS_IMAGE }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const section = {
        id: 1,
        mediaAssetId: null,
      } as StandardsSectionEntity;
      repository.find.mockResolvedValue([section]);
      const newMediaAsset = { id: 9 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(newMediaAsset);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as StandardsSectionEntity),
      );

      const result = await service.update({
        key: 'standards-video/new.mp4',
        purpose: UploadPurpose.STANDARDS_VIDEO,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'standards-video/new.mp4',
        UploadPurpose.STANDARDS_VIDEO,
      );
      expect(result.mediaAssetId).toBe(9);
    });

    it('sets the text when none is stored yet', async () => {
      const section = {
        id: 1,
        text: null,
      } as StandardsSectionEntity;
      repository.find.mockResolvedValue([section]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as StandardsSectionEntity),
      );

      const result = await service.update({
        text: { en: 'We hold high standards' },
      });

      expect(result.text).toEqual({ en: 'We hold high standards' });
    });

    it('merges the given translations into the stored ones', async () => {
      repository.find.mockResolvedValue([
        { id: 1, text: { en: 'Standards', hy: 'Չափանիշներ' } },
      ] as StandardsSectionEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as StandardsSectionEntity),
      );

      const result = await service.update({ text: { ru: 'Стандарты' } });

      expect(result.text).toEqual({
        en: 'Standards',
        hy: 'Չափանիշներ',
        ru: 'Стандарты',
      });
    });

    it('removes a translation set to an empty string', async () => {
      repository.find.mockResolvedValue([
        { id: 1, text: { en: 'Standards', hy: 'Չափանիշներ' } },
      ] as StandardsSectionEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as StandardsSectionEntity),
      );

      const result = await service.update({ text: { hy: '' } });

      expect(result.text).toEqual({ en: 'Standards' });
    });

    it('leaves the text untouched when not given', async () => {
      repository.find.mockResolvedValue([
        { id: 1, text: { en: 'Standards' } },
      ] as StandardsSectionEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as StandardsSectionEntity),
      );

      const result = await service.update({});

      expect(result.text).toEqual({ en: 'Standards' });
    });
  });

  describe('findPublic', () => {
    it('returns null media when no media asset is set', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          text: { en: 'Standards text' },
          mediaAsset: null,
        } as StandardsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.text).toBe('Standards text');
      expect(result.media).toBeNull();
      expect(result.mediaType).toBeNull();
    });

    it('returns null media when the media asset is not ready yet', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          text: null,
          mediaAsset: {
            type: MediaType.IMAGE,
            status: MediaStatus.PROCESSING,
          } as MediaAssetEntity,
        } as StandardsSectionEntity,
      ]);

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
          text: null,
          mediaAsset,
        } as StandardsSectionEntity,
      ]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.media).toEqual({ url: 'https://signed-url' });
      expect(result.mediaType).toBe(MediaType.IMAGE);
    });

    it('returns the text in the requested language', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          text: { en: 'Standards', hy: 'Չափանիշներ' },
          mediaAsset: null,
        } as StandardsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.text).toBe('Չափանիշներ');
    });

    it('falls back to English when the requested language is untranslated', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          text: { en: 'Standards', hy: 'Չափանիշներ' },
          mediaAsset: null,
        } as StandardsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.RU);

      expect(result.text).toBe('Standards');
    });

    it('returns null text when nothing is configured', async () => {
      repository.find.mockResolvedValue([
        { id: 1, text: null, mediaAsset: null } as StandardsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.text).toBeNull();
    });
  });
});
