import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialLinkService } from './social-link.service';
import { SocialLinkEntity } from './entities';
import { SocialPlatform } from './enums';
import {
  InvalidSocialLinkUrlException,
  SocialLinkNotFoundException,
} from './exceptions';

describe('SocialLinkService', () => {
  let service: SocialLinkService;
  let repository: jest.Mocked<Repository<SocialLinkEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialLinkService,
        {
          provide: getRepositoryToken(SocialLinkEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SocialLinkService);
    repository = module.get(getRepositoryToken(SocialLinkEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns every platform ordered by platform', async () => {
      const links = [{ id: 1 }] as SocialLinkEntity[];
      repository.find.mockResolvedValue(links);

      await expect(service.findAll()).resolves.toBe(links);
      expect(repository.find).toHaveBeenCalledWith({
        order: { platform: 'ASC' },
      });
    });
  });

  describe('findAllActive', () => {
    it('only queries active platforms with a url set', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAllActive();

      const callArgs = repository.find.mock.calls[0][0];
      expect(callArgs?.where).toEqual(
        expect.objectContaining({ isActive: true }),
      );
      expect(callArgs?.order).toEqual({ platform: 'ASC' });
    });
  });

  describe('updateByPlatform', () => {
    it('throws SocialLinkNotFoundException when the platform row is missing', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateByPlatform(SocialPlatform.YOUTUBE, {
          url: 'https://youtube.com/@jeenj',
        }),
      ).rejects.toThrow(SocialLinkNotFoundException);
    });

    it('throws InvalidSocialLinkUrlException when the url belongs to another platform', async () => {
      await expect(
        service.updateByPlatform(SocialPlatform.FACEBOOK, {
          url: 'https://youtube.com/@jeenj',
        }),
      ).rejects.toThrow(InvalidSocialLinkUrlException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('accepts a Viber deep link for the Viber platform', async () => {
      const link = {
        platform: SocialPlatform.VIBER,
        url: null,
        isActive: true,
      } as SocialLinkEntity;
      repository.findOne.mockResolvedValue(link);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SocialLinkEntity),
      );

      const result = await service.updateByPlatform(SocialPlatform.VIBER, {
        url: 'viber://chat?number=%2B37455123456',
      });

      expect(result.url).toBe('viber://chat?number=%2B37455123456');
    });

    it('sets the url and leaves isActive untouched when only url is given', async () => {
      const link = {
        platform: SocialPlatform.YOUTUBE,
        url: null,
        isActive: true,
      } as SocialLinkEntity;
      repository.findOne.mockResolvedValue(link);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SocialLinkEntity),
      );

      const result = await service.updateByPlatform(SocialPlatform.YOUTUBE, {
        url: 'https://youtube.com/@jeenj',
      });

      expect(result.url).toBe('https://youtube.com/@jeenj');
      expect(result.isActive).toBe(true);
    });

    it('clears the url when explicitly set to null', async () => {
      const link = {
        platform: SocialPlatform.YOUTUBE,
        url: 'https://youtube.com/@jeenj',
        isActive: true,
      } as SocialLinkEntity;
      repository.findOne.mockResolvedValue(link);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SocialLinkEntity),
      );

      const result = await service.updateByPlatform(SocialPlatform.YOUTUBE, {
        url: null,
      });

      expect(result.url).toBeNull();
    });

    it('toggles isActive without touching the url', async () => {
      const link = {
        platform: SocialPlatform.YOUTUBE,
        url: 'https://youtube.com/@jeenj',
        isActive: true,
      } as SocialLinkEntity;
      repository.findOne.mockResolvedValue(link);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SocialLinkEntity),
      );

      const result = await service.updateByPlatform(SocialPlatform.YOUTUBE, {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
      expect(result.url).toBe('https://youtube.com/@jeenj');
    });
  });

  describe('ensureSeeded', () => {
    it('creates a row for every platform that does not already exist', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation(
        (entity) => entity as SocialLinkEntity,
      );
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as SocialLinkEntity),
      );

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledTimes(
        Object.values(SocialPlatform).length,
      );
      expect(repository.create).toHaveBeenCalledWith({
        platform: SocialPlatform.FACEBOOK,
        url: null,
        isActive: true,
      });
    });

    it('skips platforms that are already seeded', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as SocialLinkEntity);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
