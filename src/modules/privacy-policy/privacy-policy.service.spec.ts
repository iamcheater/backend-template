import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { PrivacyPolicyService } from './privacy-policy.service';
import { PrivacyPolicyEntity } from './entities';
import { PrivacyPolicyNotFoundException } from './exceptions';

describe('PrivacyPolicyService', () => {
  let service: PrivacyPolicyService;
  let repository: jest.Mocked<Repository<PrivacyPolicyEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyPolicyService,
        {
          provide: getRepositoryToken(PrivacyPolicyEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PrivacyPolicyService);
    repository = module.get(getRepositoryToken(PrivacyPolicyEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureSeeded', () => {
    it('creates the singleton row when none exists', async () => {
      repository.find.mockResolvedValue([]);
      const created = { id: 1 } as PrivacyPolicyEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.ensureSeeded();

      expect(repository.create).toHaveBeenCalledWith({ content: null });
      expect(repository.save).toHaveBeenCalledWith(created);
    });

    it('does nothing when the singleton row already exists', async () => {
      repository.find.mockResolvedValue([{ id: 1 } as PrivacyPolicyEntity]);

      await service.ensureSeeded();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAdmin', () => {
    it('throws PrivacyPolicyNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findForAdmin()).rejects.toThrow(
        PrivacyPolicyNotFoundException,
      );
    });

    it('returns the policy', async () => {
      const policy = { id: 1 } as PrivacyPolicyEntity;
      repository.find.mockResolvedValue([policy]);

      await expect(service.findForAdmin()).resolves.toBe(policy);
    });
  });

  describe('update', () => {
    it('updates the content when given', async () => {
      const policy = { id: 1, content: null } as PrivacyPolicyEntity;
      repository.find.mockResolvedValue([policy]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PrivacyPolicyEntity),
      );

      const result = await service.update({
        content: { en: '<p>Policy</p>' },
      });

      expect(result.content).toEqual({ en: '<p>Policy</p>' });
    });

    it('leaves the content untouched when not given', async () => {
      const policy = {
        id: 1,
        content: { en: '<p>Existing</p>' },
      } as PrivacyPolicyEntity;
      repository.find.mockResolvedValue([policy]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PrivacyPolicyEntity),
      );

      const result = await service.update({});

      expect(result.content).toEqual({ en: '<p>Existing</p>' });
    });

    it('merges the given translations into the stored ones', async () => {
      repository.find.mockResolvedValue([
        { id: 1, content: { en: '<p>EN</p>', hy: '<p>HY</p>' } },
      ] as PrivacyPolicyEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PrivacyPolicyEntity),
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
      ] as PrivacyPolicyEntity[]);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as PrivacyPolicyEntity),
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
          content: { en: '<p>Policy</p>' },
          updatedAt,
        } as PrivacyPolicyEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.EN);

      expect(result.content).toBe('<p>Policy</p>');
      expect(result.updatedAt).toBe(updatedAt);
    });

    it('returns the content in the requested language', async () => {
      const updatedAt = new Date('2026-09-01T00:00:00Z');
      repository.find.mockResolvedValue([
        {
          id: 1,
          content: { en: '<p>EN</p>', hy: '<p>HY</p>' },
          updatedAt,
        } as PrivacyPolicyEntity,
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
        } as PrivacyPolicyEntity,
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
        } as PrivacyPolicyEntity,
      ]);

      const result = await service.findPublic(SupportedLanguage.HY);

      expect(result.content).toBeNull();
    });

    it('throws PrivacyPolicyNotFoundException when nothing is seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.findPublic(SupportedLanguage.EN)).rejects.toThrow(
        PrivacyPolicyNotFoundException,
      );
    });
  });
});
