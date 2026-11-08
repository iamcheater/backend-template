import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CleaningComponentEntity } from 'src/modules/cleaning-component/entities';
import { CleaningComponentService } from 'src/modules/cleaning-component/cleaning-component.service';
import { MediaStatus, MediaType, UploadPurpose } from 'src/modules/media/enums';
import { InvalidUploadRequestException } from 'src/modules/media/exceptions';
import { MediaService } from 'src/modules/media/media.service';
import { MediaAssetEntity } from 'src/modules/media/entities';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { ServiceService } from './service.service';
import { ServiceEntity } from './entities';
import {
  ServiceNotFoundException,
  ServiceTitleAlreadyExistsException,
} from './exceptions';

describe('ServiceService', () => {
  let service: ServiceService;
  let repository: jest.Mocked<Repository<ServiceEntity>>;
  let mediaService: jest.Mocked<MediaService>;
  let cleaningComponentService: jest.Mocked<CleaningComponentService>;
  let titleQuery: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getExists: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        {
          provide: getRepositoryToken(ServiceEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
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
          provide: CleaningComponentService,
          useValue: {
            findByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ServiceService);
    repository = module.get(getRepositoryToken(ServiceEntity));
    mediaService = module.get(MediaService);
    cleaningComponentService = module.get(CleaningComponentService);

    titleQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getExists: jest.fn().mockResolvedValue(false),
    };
    repository.createQueryBuilder.mockReturnValue(
      titleQuery as unknown as ReturnType<typeof repository.createQueryBuilder>,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      title: { en: 'Window Cleaning', hy: 'Պատուհանների մաքրում' },
      description: { en: 'Interior and exterior windows' },
      key: 'service-image/new.webp',
      purpose: UploadPurpose.SERVICE_IMAGE,
    };

    it('throws ServiceTitleAlreadyExistsException when the English title is taken', async () => {
      titleQuery.getExists.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toThrow(
        ServiceTitleAlreadyExistsException,
      );
      expect(titleQuery.where).toHaveBeenCalledWith(
        "service.title ->> 'en' = :title",
        { title: 'Window Cleaning' },
      );
      expect(mediaService.attachFromKey).not.toHaveBeenCalled();
    });

    it('attaches media, creates the service with no components and reloads it', async () => {
      const mediaAsset = { id: 5 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(mediaAsset);
      const created = {
        id: 1,
        title: dto.title,
        description: dto.description,
        order: 0,
        mediaAssetId: 5,
      } as ServiceEntity;
      const reloaded = { ...created, cleaningComponents: [] } as ServiceEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      repository.findOne.mockResolvedValueOnce(reloaded);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: dto.title,
          description: dto.description,
        }),
      );
      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        dto.key,
        dto.purpose,
      );
      expect(cleaningComponentService.findByIds).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ cleaningComponents: [] }),
      );
      expect(result).toBe(reloaded);
    });

    it('attaches the selected existing cleaning components', async () => {
      const mediaAsset = { id: 5 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(mediaAsset);
      const components = [
        { id: 1, title: { en: 'Dust removal' } },
      ] as CleaningComponentEntity[];
      cleaningComponentService.findByIds.mockResolvedValue(components);
      const created = { id: 1, title: dto.title } as ServiceEntity;
      const reloaded = {
        ...created,
        cleaningComponents: components,
      };
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      repository.findOne.mockResolvedValueOnce(reloaded);

      const result = await service.create({ ...dto, componentIds: [1] });

      expect(cleaningComponentService.findByIds).toHaveBeenCalledWith([1]);
      expect(result).toBe(reloaded);
    });
  });

  describe('findAll', () => {
    it('returns all services ordered by display order', async () => {
      const services = [{ id: 1 }, { id: 2 }] as ServiceEntity[];
      repository.find.mockResolvedValue(services);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        relations: ['mediaAsset', 'cleaningComponents'],
        order: { order: 'ASC' },
      });
      expect(result).toBe(services);
    });
  });

  describe('findAllActive', () => {
    const mediaAsset = {
      type: MediaType.IMAGE,
      status: MediaStatus.READY,
    } as MediaAssetEntity;

    beforeEach(() => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          title: { en: 'Window Cleaning', hy: 'Պատուհանների մաքրում' },
          description: { en: 'Windows' },
          order: 0,
          mediaAsset,
          cleaningComponents: [
            {
              id: 1,
              title: { en: 'Dust removal', hy: 'Փոշու մաքրում' },
              description: null,
            },
          ],
        } as unknown as ServiceEntity,
      ]);
      mediaService.resolveMediaUrls.mockReturnValue({
        url: 'https://signed-url',
      });
    });

    it('returns only active, ready services localized to the requested language', async () => {
      const result = await service.findAllActive(SupportedLanguage.HY);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true, mediaAsset: { status: MediaStatus.READY } },
        relations: ['mediaAsset', 'cleaningComponents'],
        order: { order: 'ASC' },
      });
      expect(result).toEqual([
        {
          id: 1,
          title: 'Պատուհանների մաքրում',
          description: 'Windows',
          order: 0,
          mediaType: MediaType.IMAGE,
          media: { url: 'https://signed-url' },
          components: [{ id: 1, title: 'Փոշու մաքրում', description: null }],
        },
      ]);
    });

    it('falls back to English for untranslated text', async () => {
      const [result] = await service.findAllActive(SupportedLanguage.RU);

      expect(result.title).toBe('Window Cleaning');
      expect(result.components[0].title).toBe('Dust removal');
    });
  });

  describe('findById', () => {
    it('throws ServiceNotFoundException when the service does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        ServiceNotFoundException,
      );
    });

    it('returns the service when found', async () => {
      const found = { id: 1 } as ServiceEntity;
      repository.findOne.mockResolvedValue(found);

      await expect(service.findById(1)).resolves.toBe(found);
    });
  });

  describe('update', () => {
    it('throws ServiceNotFoundException when the service does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { title: { en: 'New Title' } }),
      ).rejects.toThrow(ServiceNotFoundException);
    });

    it('throws ServiceTitleAlreadyExistsException when renaming to an English title already used by another service', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Old Title' },
      } as ServiceEntity);
      titleQuery.getExists.mockResolvedValue(true);

      await expect(
        service.update(1, { title: { en: 'Taken Title' } }),
      ).rejects.toThrow(ServiceTitleAlreadyExistsException);
      expect(titleQuery.andWhere).toHaveBeenCalledWith(
        'service.id != :excludeId',
        { excludeId: 1 },
      );
    });

    it('skips the title check when only other languages change', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Old Title' },
      } as ServiceEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ServiceEntity),
      );

      const result = await service.update(1, { title: { ru: 'Старое' } });

      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
      expect(result.title).toEqual({ en: 'Old Title', ru: 'Старое' });
    });

    it('merges translated description changes into the stored ones', async () => {
      repository.findOne.mockResolvedValue({
        id: 1,
        title: { en: 'Old Title' },
        description: { en: 'Old', hy: 'Հին' },
      } as ServiceEntity);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ServiceEntity),
      );

      const result = await service.update(1, {
        description: { en: 'New', hy: '' },
      });

      expect(result.description).toEqual({ en: 'New' });
    });

    it('rejects a key given without a purpose', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as ServiceEntity);

      await expect(
        service.update(1, { key: 'service-image/new.webp' }),
      ).rejects.toThrow(InvalidUploadRequestException);
    });

    it('replaces the media asset when both key and purpose are given', async () => {
      const existing = { id: 1, title: { en: 'Old Title' } } as ServiceEntity;
      repository.findOne.mockResolvedValue(existing);
      const mediaAsset = { id: 9 } as MediaAssetEntity;
      mediaService.attachFromKey.mockResolvedValue(mediaAsset);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ServiceEntity),
      );

      const result = await service.update(1, {
        key: 'service-video/new.mp4',
        purpose: UploadPurpose.SERVICE_VIDEO,
      });

      expect(mediaService.attachFromKey).toHaveBeenCalledWith(
        'service-video/new.mp4',
        UploadPurpose.SERVICE_VIDEO,
      );
      expect(result.mediaAssetId).toBe(9);
    });

    it('updates and saves the service', async () => {
      const existing = {
        id: 1,
        title: { en: 'Old Title' },
        description: { en: 'Old' },
        isActive: true,
        order: 0,
      } as ServiceEntity;
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ServiceEntity),
      );

      const result = await service.update(1, { isActive: false, order: 3 });

      expect(result.isActive).toBe(false);
      expect(result.order).toBe(3);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false, order: 3 }),
      );
    });

    it('replaces the cleaning components when componentIds is given', async () => {
      const existing = { id: 1, title: { en: 'Old Title' } } as ServiceEntity;
      repository.findOne.mockResolvedValue(existing);
      const components = [
        { id: 2, title: { en: 'Window cleaning' } },
      ] as CleaningComponentEntity[];
      cleaningComponentService.findByIds.mockResolvedValue(components);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ServiceEntity),
      );

      const result = await service.update(1, { componentIds: [2] });

      expect(cleaningComponentService.findByIds).toHaveBeenCalledWith([2]);
      expect(result.cleaningComponents).toBe(components);
    });

    it('clears the cleaning components when componentIds is empty', async () => {
      const existing = {
        id: 1,
        title: { en: 'Old Title' },
        cleaningComponents: [{ id: 2 }],
      } as ServiceEntity;
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ServiceEntity),
      );

      const result = await service.update(1, { componentIds: [] });

      expect(cleaningComponentService.findByIds).not.toHaveBeenCalled();
      expect(result.cleaningComponents).toEqual([]);
    });
  });
});
