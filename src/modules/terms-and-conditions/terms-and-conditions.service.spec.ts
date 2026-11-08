import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { TermsAndConditionsService } from './terms-and-conditions.service';
import { TermsAndConditionsEntity } from './entities';
import { TermsAndConditionsNotFoundException } from './exceptions';

describe('TermsAndConditionsService', () => {
  let service: TermsAndConditionsService;
  let repository: jest.Mocked<Repository<TermsAndConditionsEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermsAndConditionsService,
        {
          provide: getRepositoryToken(TermsAndConditionsEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TermsAndConditionsService);
    repository = module.get(getRepositoryToken(TermsAndConditionsEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureSeeded', () => {
    it('creates the singleton row when none exists', async () => {
      repository.find.mockResolvedValue([]);
      const created = { id: 1 } as TermsAndConditionsEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledWith({ content: null });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('does nothing when the singleton row already exists', async () => {
      repository.find.mockResolvedValue([
        { id: 1 } as TermsAndConditionsEntity,
      ]);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('throws TermsAndConditionsNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findForAdmin()).rejects.toThrow(
        TermsAndConditionsNotFoundException,
      );
    });

    it('returns the terms', async () => {
      const terms = { id: 1 } as TermsAndConditionsEntity;
      repository.find.mockResolvedValue([terms]);

      await expect(service.findForAdmin()).resolves.toBe(terms);
    });
  });

  describe('update', () => {
    it('updates the content when given', async () => {
      const terms = { id: 1, content: null } as TermsAndConditionsEntity;
      repository.find.mockResolvedValue([terms]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TermsAndConditionsEntity),
      );

      const result = await service.update({
        content: { en: '<p>Terms</p>' },
      });

      expect(result.content).toEqual({ en: '<p>Terms</p>' });
    });

    it('leaves the content untouched when not given', async () => {
      const terms = {
        id: 1,
        content: { en: '<p>Existing</p>' },
      } as TermsAndConditionsEntity;
      repository.find.mockResolvedValue([terms]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TermsAndConditionsEntity),
      );

      const result = await service.update({});

      expect(result.content).toEqual({ en: '<p>Existing</p>' });
    });

    it('merges the given translations into the stored ones', async () => {
      repository.find.mockResolvedValue([
        { id: 1, content: { en: '<p>EN</p>', hy: '<p>HY</p>' } },
      ] as TermsAndConditionsEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TermsAndConditionsEntity),
      );

      const result = await service.update({ content: { ru: '<p>RU</p>' } });

      expect(result.content).toEqual({
        en: '<p>EN</p>',
        hy: '<p>HY</p>',
        ru: '<p>RU</p>',
      });
    });

    it('removes a translation set to an empty string', async () => {
      repository.find.mockResolvedValue([
        { id: 1, content: { en: '<p>EN</p>', hy: '<p>HY</p>' } },
      ] as TermsAndConditionsEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as TermsAndConditionsEntity),
      );

      const result = await service.update({ content: { hy: '' } });

      expect(result.content).toEqual({ en: '<p>EN</p>' });
    });
  });

  describe('findPublic', () => {
    it('returns the content and when it was last updated', async () => {
      const updatedAt = new Date('2026-09-01T00:00:00Z');
      repository.find.mockResolvedValue([
        {
          id: 1,
          content: { en: '<p>Terms</p>' },
          updatedAt,
        } as TermsAndConditionsEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.content).toBe('<p>Terms</p>');
      expect(result.updatedAt).toBe(updatedAt);
    });

    it('returns the content in the requested language', async () => {
      const updatedAt = new Date('2026-09-01T00:00:00Z');
      repository.find.mockResolvedValue([
        {
          id: 1,
          content: { en: '<p>EN</p>', hy: '<p>HY</p>' },
          updatedAt,
        } as TermsAndConditionsEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.content).toBe('<p>HY</p>');
      expect(result.updatedAt).toBe(updatedAt);
    });

    it('falls back to English when the requested language is untranslated', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          content: { en: '<p>EN</p>', hy: '<p>HY</p>' },
          updatedAt: new Date('2026-09-01T00:00:00Z'),
        } as TermsAndConditionsEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.RU);

      expect(result.content).toBe('<p>EN</p>');
    });

    it('returns null content when nothing is configured', async () => {
      repository.find.mockResolvedValue([
        {
          id: 1,
          content: null,
          updatedAt: new Date('2026-09-01T00:00:00Z'),
        } as TermsAndConditionsEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.content).toBeNull();
    });

    it('throws TermsAndConditionsNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findPublic(SupportedLanguage.EN)).rejects.toThrow(
        TermsAndConditionsNotFoundException,
      );
    });
  });
});
