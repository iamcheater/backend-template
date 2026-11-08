import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { TalkToUsService } from './talk-to-us.service';
import { TalkToUsSectionEntity } from './entities';
import { TalkToUsNotFoundException } from './exceptions';

describe('TalkToUsService', () => {
  let service: TalkToUsService;
  let repository: jest.Mocked<Repository<TalkToUsSectionEntity>>;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TalkToUsService,
        {
          provide: getRepositoryToken(TalkToUsSectionEntity),
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

    service = module.get(TalkToUsService);
    repository = module.get(getRepositoryToken(TalkToUsSectionEntity));
    mediaService = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureSeeded', () => {
    it('creates the singleton row when none exists', async () => {
      repository.find.mockResolvedValue([]);
      const created = { id: 1 } as TalkToUsSectionEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledWith({
        title: null,
        text: null,
        mediaAssetId: null,
      });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('does nothing when the singleton row already exists', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as TalkToUsSectionEntity]);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('throws TalkToUsNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findForAdmin()).rejects.toThrow(
        TalkToUsNotFoundException,
      );
    });

    it('returns the section', async () => {
      const section = { id: 1 } as TalkToUsSectionEntity;
      repository.find.mockResolvedValue([section]);

      await expect(service.findForAdmin()).resolves.toBe(section);
    });
  });

  describe('update', () => {
    it('rejects a key given without a purpose', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as TalkToUsSectionEntity]);

      await expect(
        service.update({ key: 'talk-to-us-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('rejects a purpose given without a key', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as TalkToUsSectionEntity]);

      await expect(
        service.update({ purpose: UploadPurpose.TALK_TO_US_IMAGE }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const section = {
        id: 1,
        mediaAssetId: null,
      } as TalkToUsSectionEntity;
      repository.find.mockResolvedValue([section]);
      const newMediaAsset = { id: 9 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(newMediaAsset);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TalkToUsSectionEntity),
      );

      const result = await service.update({
        key: 'talk-to-us-video/new.mp4',
        purpose: UploadPurpose.TALK_TO_US_VIDEO,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'talk-to-us-video/new.mp4',
        UploadPurpose.TALK_TO_US_VIDEO,
      );
      expect(result.mediaAssetId).toBe(9);
    });

    it('updates the title and text when given', async () => {
      const section = {
        id: 1,
        title: null,
        text: null,
      } as TalkToUsSectionEntity;
      repository.find.mockResolvedValue([section]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TalkToUsSectionEntity),
      );

      const result = await service.update({
        title: { en: 'Talk to us' },
        text: { en: "We're here to help" },
      });

      expect(result.title).toEqual({ en: 'Talk to us' });
      expect(result.text).toEqual({ en: "We're here to help" });
    });

    it('merges the given translations into the stored ones', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Talk to us', hy: 'Կապ' },
          text: { en: 'Help', ru: 'Помощь' },
        },
      ] as TalkToUsSectionEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TalkToUsSectionEntity),
      );

      const result = await service.update({
        title: { ru: 'Свяжитесь с нами' },
        text: { en: 'We help' },
      });

      expect(result.title).toEqual({
        en: 'Talk to us',
        hy: 'Կապ',
        ru: 'Свяжитесь с нами',
      });
      expect(result.text).toEqual({ en: 'We help', ru: 'Помощь' });
    });

    it('removes a translation set to an empty string', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Talk to us', hy: 'Կապ' },
          text: { en: 'Help' },
        },
      ] as TalkToUsSectionEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TalkToUsSectionEntity),
      );

      const result = await service.update({ title: { hy: '' } });

      expect(result.title).toEqual({ en: 'Talk to us' });
      expect(result.text).toEqual({ en: 'Help' });
    });
  });

  describe('findPublic', () => {
    it('returns null media when no media asset is set', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Talk to us' },
          text: { en: 'Reach out any time' },
          mediaAsset: null,
        } as TalkToUsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.title).toBe('Talk to us');
      expect(result.text).toBe('Reach out any time');
      expect(result.media).toBeNull();
      expect(result.mediaType).toBeNull();
    });

    it('returns null media when the media asset is not ready yet', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: null,
          text: null,
          mediaAsset: {
            type: MediaType.IMAGE,
            status: MediaStatus.PROCESSING,
          } as MediaAssetEntity,
        } as TalkToUsSectionEntity,
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
          title: null,
          text: null,
          mediaAsset,
        } as TalkToUsSectionEntity,
      ]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.media).toEqual({ url: 'https://signed-url' });
      expect(result.mediaType).toBe(MediaType.IMAGE);
    });

    it('returns the title and text in the requested language', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Talk to us', hy: 'Կապ' },
          text: { en: 'Help', hy: 'Օգնություն' },
          mediaAsset: null,
        } as TalkToUsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.title).toBe('Կապ');
      expect(result.text).toBe('Օգնություն');
    });

    it('falls back to English when the requested language is untranslated', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Talk to us', hy: 'Կապ' },
          text: { en: 'Help' },
          mediaAsset: null,
        } as TalkToUsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.RU);

      expect(result.title).toBe('Talk to us');
      expect(result.text).toBe('Help');
    });

    it('returns null title and text when nothing is configured', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: null,
          text: null,
          mediaAsset: null,
        } as TalkToUsSectionEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.title).toBeNull();
      expect(result.text).toBeNull();
    });
  });
});
