import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { HowItWorksStepService } from './how-it-works-step.service';
import { HowItWorksStepEntity } from './entities';
import { HowItWorksStepNotFoundException } from './exceptions';

describe('HowItWorksStepService', () => {
  let service: HowItWorksStepService;
  let repository: jest.Mocked<Repository<HowItWorksStepEntity>>;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HowItWorksStepService,
        {
          provide: getRepositoryToken(HowItWorksStepEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
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

    service = module.get(HowItWorksStepService);
    repository = module.get(getRepositoryToken(HowItWorksStepEntity));
    mediaService = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('rejects a key given without a purpose', async () => {
      await expect(
        service.create({
          title: { en: 'Sign up' },
          description: { en: 'Create an account' },
          key: 'how-it-works-image/abc.webp',
        }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('rejects a purpose given without a key', async () => {
      await expect(
        service.create({
          title: { en: 'Sign up' },
          description: { en: 'Create an account' },
          purpose: UploadPurpose.HOW_IT_WORKS_IMAGE,
        }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('defaults order to 0 and mediaAssetId to null when no media is given', async () => {
      const created = { id: 1 } as HowItWorksStepEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({
        title: { en: 'Sign up' },
        description: { en: 'Create an account' },
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 0, mediaAssetId: null }),
      );
      expect(mediaService.attachFromKey).not.toHaveBeenCalled();
    });

    it('attaches media when both key and purpose are given', async () => {
      mediaService.attachFromKey.mockResolvedValue({
        id: 5,
      } as MediaAssetEntity);
      const created = { id: 1 } as HowItWorksStepEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({
        title: { en: 'Sign up' },
        description: { en: 'Create an account' },
        key: 'how-it-works-image/abc.webp',
        purpose: UploadPurpose.HOW_IT_WORKS_IMAGE,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'how-it-works-image/abc.webp',
        UploadPurpose.HOW_IT_WORKS_IMAGE,
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ mediaAssetId: 5 }),
      );
    });

    it('stores the translated text, dropping empty translations', async () => {
      repository.create.mockImplementation(
        (entity) => entity as HowItWorksStepEntity,
      );
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HowItWorksStepEntity),
      );

      await service.create({
        title: { en: 'Sign up', hy: 'Գրանցվել', ru: '' },
        description: { en: 'Create an account', ru: 'Создайте аккаунт' },
      });

      expect(repository.create).toHaveBeenCalledWith({
        title: { en: 'Sign up', hy: 'Գրանցվել' },
        description: { en: 'Create an account', ru: 'Создайте аккаунт' },
        order: 0,
        mediaAssetId: null,
      });
    });
  });

  describe('findAll', () => {
    it('returns all steps with their media relation, ordered by order', async () => {
      const steps = [{ id: 1 }] as HowItWorksStepEntity[];
      repository.find.mockResolvedValue(steps);

      await expect(service.findAll()).resolves.toBe(steps);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['mediaAsset'],
        order: { order: 'ASC' },
      });
    });
  });

  describe('findAllPublic', () => {
    it('excludes media when the asset is not ready', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Sign up' },
          description: { en: 'Create an account' },
          order: 0,
          mediaAsset: {
            type: MediaType.IMAGE,
            status: MediaStatus.PROCESSING,
          } as MediaAssetEntity,
        } as HowItWorksStepEntity,
      ]);

      const result = await service.findAllPublic(SupportedLanguage.EN);

      expect(result[0].media).toBeNull();
      expect(result[0].mediaType).toBeNull();
      expect(mediaService.resolveMediaUrls).not.toHaveBeenCalled();
    });

    it('resolves media when the asset is ready', async () => {
      const mediaAsset = {
        type: MediaType.IMAGE,
        status: MediaStatus.READY,
      } as MediaAssetEntity;
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Sign up' },
          description: { en: 'Create an account' },
          order: 0,
          mediaAsset,
        } as HowItWorksStepEntity,
      ]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });

      const result = await service.findAllPublic(SupportedLanguage.EN);

      expect(result[0].media).toEqual({ url: 'https://signed-url' });
      expect(result[0].mediaType).toBe(MediaType.IMAGE);
    });

    describe('localization', () => {
      beforeEach(() => {
        repository.find.mockResolvedValue([
          {
            id: 1,
            title: { en: 'Sign up', hy: 'Գրանցվել' },
            description: { en: 'Create an account', hy: 'Ստեղծեք հաշիվ' },
            order: 0,
            mediaAsset: null,
          } as HowItWorksStepEntity,
        ]);
      });

      it('returns plain strings in the requested language', async () => {
        const result = await service.findAllPublic(SupportedLanguage.HY);

        expect(result).toEqual([
          {
            id: 1,
            title: 'Գրանցվել',
            description: 'Ստեղծեք հաշիվ',
            order: 0,
            mediaType: null,
            media: null,
          },
        ]);
      });

      it('falls back to English for untranslated text', async () => {
        const [result] = await service.findAllPublic(SupportedLanguage.RU);

        expect(result.title).toBe('Sign up');
        expect(result.description).toBe('Create an account');
      });
    });
  });

  describe('findById', () => {
    it('throws HowItWorksStepNotFoundException when the step does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        HowItWorksStepNotFoundException,
      );
    });

    it('returns the step with its media relation loaded', async () => {
      const step = { id: 1 } as HowItWorksStepEntity;
      repository.findOne.mockResolvedValue(step);

      await expect(service.findById(1)).resolves.toBe(step);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['mediaAsset'],
      });
    });
  });

  describe('update', () => {
    it('throws HowItWorksStepNotFoundException when the step does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, { title: { en: 'New' } })).rejects.toThrow(
        HowItWorksStepNotFoundException,
      );
    });

    it('rejects a key given without a purpose', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as HowItWorksStepEntity);

      await expect(
        service.update(1, { key: 'how-it-works-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const step = { id: 1, mediaAssetId: null } as HowItWorksStepEntity;
      repository.findOne.mockResolvedValue(step);
      mediaService.attachFromKey.mockResolvedValue({
        id: 9,
      } as MediaAssetEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HowItWorksStepEntity),
      );

      const result = await service.update(1, {
        key: 'how-it-works-image/new.webp',
        purpose: UploadPurpose.HOW_IT_WORKS_IMAGE,
      });

      expect(result.mediaAssetId).toBe(9);
    });

    it('updates title/description/order without touching existing media', async () => {
      const step = {
        id: 1,
        title: { en: 'Old', hy: 'Հին' },
        description: { en: 'Old desc' },
        order: 0,
        mediaAssetId: 3,
      } as HowItWorksStepEntity;
      repository.findOne.mockResolvedValue(step);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HowItWorksStepEntity),
      );

      const result = await service.update(1, {
        title: { en: 'New' },
        order: 2,
      });

      expect(mediaService.attachFromKey).not.toHaveBeenCalled();
      expect(result.title).toEqual({ en: 'New', hy: 'Հին' });
      expect(result.order).toBe(2);
      expect(result.description).toEqual({ en: 'Old desc' });
      expect(result.mediaAssetId).toBe(3);
    });

    it('merges the given translations into the stored ones', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Sign up' },
        description: { en: 'Create an account', hy: 'Ստեղծեք հաշիվ' },
      } as HowItWorksStepEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HowItWorksStepEntity),
      );

      const result = await service.update(1, {
        title: { ru: 'Регистрация' },
        description: { ru: 'Создайте аккаунт' },
      });

      expect(result.title).toEqual({ en: 'Sign up', ru: 'Регистрация' });
      expect(result.description).toEqual({
        en: 'Create an account',
        hy: 'Ստեղծեք հաշիվ',
        ru: 'Создайте аккаунт',
      });
    });

    it('removes a translation set to an empty string', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Sign up', hy: 'Գրանցվել' },
        description: { en: 'Create an account', ru: 'Создайте аккаунт' },
      } as HowItWorksStepEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as HowItWorksStepEntity),
      );

      const result = await service.update(1, {
        title: { hy: '' },
        description: { ru: '' },
      });

      expect(result.title).toEqual({ en: 'Sign up' });
      expect(result.description).toEqual({ en: 'Create an account' });
    });
  });

  describe('remove', () => {
    it('throws HowItWorksStepNotFoundException when the step does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        HowItWorksStepNotFoundException,
      );
    });

    it('deletes the step when it exists', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as HowItWorksStepEntity);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
