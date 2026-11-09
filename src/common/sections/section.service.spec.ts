import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { SectionEntity } from '../entities';
import { ContentChangedEvent, EventName } from '../events';
import { SectionNotFoundException } from '../exceptions';
import { TranslatedText, TranslatedTextPatch } from '../types';
import { SectionService } from './section.service';

jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
  runOnTransactionCommit: (callback: () => void) => callback(),
}));

class HeroSectionFixture extends SectionEntity {
  title: TranslatedText;
  subtitle: TranslatedTextPatch | null;
  ctaUrl: string;
}

class HeroSectionFixtureService extends SectionService<
  HeroSectionFixture,
  'title' | 'subtitle'
> {
  protected readonly contentTag = 'hero';
  protected readonly translatedFields = ['title', 'subtitle'] as const;

  constructor(
    repository: Repository<HeroSectionFixture>,
    eventEmitter: EventEmitter2,
  ) {
    super(repository, eventEmitter);
  }
}

describe('SectionService', () => {
  let repository: jest.Mocked<Repository<HeroSectionFixture>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let service: HeroSectionFixtureService;

  const buildSection = (
    overrides: Partial<HeroSectionFixture> = {},
  ): HeroSectionFixture =>
    Object.assign(new HeroSectionFixture(), {
      id: 1,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      title: { en: 'Welcome', hy: 'Բարի գալուստ' },
      subtitle: null,
      ctaUrl: '/contact',
      ...overrides,
    });

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      save: jest.fn((entity: HeroSectionFixture) => Promise.resolve(entity)),
      count: jest.fn(),
      create: jest.fn((values: Partial<HeroSectionFixture>) => values),
    } as unknown as jest.Mocked<Repository<HeroSectionFixture>>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    service = new HeroSectionFixtureService(repository, eventEmitter);
  });

  describe('getForAdmin', () => {
    it('returns the single section row with every language', async () => {
      const section = buildSection();
      repository.find.mockResolvedValue([section]);

      await expect(service.getForAdmin()).resolves.toBe(section);
    });

    it('throws SectionNotFoundException when the row was never seeded', async () => {
      repository.find.mockResolvedValue([]);

      await expect(service.getForAdmin()).rejects.toThrow(
        SectionNotFoundException,
      );
    });
  });

  describe('getActiveForPublic', () => {
    it('returns plain localized strings, falling back to the default language', async () => {
      repository.find.mockResolvedValue([buildSection()]);

      await expect(
        service.getActiveForPublic(SupportedLanguage.RU),
      ).resolves.toEqual({
        id: 1,
        updatedAt: new Date('2026-01-02'),
        title: 'Welcome',
        subtitle: null,
        ctaUrl: '/contact',
      });
    });

    it('hides an inactive section from the public', async () => {
      repository.find.mockResolvedValue([buildSection({ isActive: false })]);

      await expect(
        service.getActiveForPublic(SupportedLanguage.EN),
      ).rejects.toThrow(SectionNotFoundException);
    });
  });

  describe('update', () => {
    it('merges translated fields instead of replacing them', async () => {
      repository.find.mockResolvedValue([buildSection()]);

      const result = await service.update({
        title: { ru: 'Добро пожаловать' },
      });

      expect(result.title).toEqual({
        en: 'Welcome',
        hy: 'Բարի գալուստ',
        ru: 'Добро пожаловать',
      });
    });

    it('drops a translation set to an empty string', async () => {
      repository.find.mockResolvedValue([buildSection()]);

      const result = await service.update({ title: { hy: '' } });

      expect(result.title).toEqual({ en: 'Welcome' });
    });

    it('stores null when a nullable translated field loses every language', async () => {
      repository.find.mockResolvedValue([
        buildSection({ subtitle: { en: 'Fresh' } }),
      ]);

      const result = await service.update({ subtitle: { en: '' } });

      expect(result.subtitle).toBeNull();
    });

    it('assigns plain fields and the active flag as given, ignoring undefined', async () => {
      repository.find.mockResolvedValue([buildSection()]);

      const result = await service.update({
        ctaUrl: '/book',
        isActive: false,
        subtitle: undefined,
      });

      expect(result).toMatchObject({
        ctaUrl: '/book',
        isActive: false,
        subtitle: null,
      });
    });

    it('emits ContentChangedEvent with the section tag after saving', async () => {
      repository.find.mockResolvedValue([buildSection()]);
      repository.save.mockImplementation((entity) => {
        expect(eventEmitter.emit).not.toHaveBeenCalled();
        return Promise.resolve(entity as HeroSectionFixture);
      });

      await service.update({ ctaUrl: '/book' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EventName.CONTENT_CHANGED,
        new ContentChangedEvent('hero'),
      );
    });

    it('does not emit when the save fails', async () => {
      repository.find.mockResolvedValue([buildSection()]);
      repository.save.mockRejectedValue(new Error('db down'));

      await expect(service.update({ ctaUrl: '/book' })).rejects.toThrow(
        'db down',
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('ensureSeeded', () => {
    it('creates the row when none exists, dropping empty translations', async () => {
      repository.count.mockResolvedValue(0);

      await expect(
        service.ensureSeeded({
          title: { en: 'Welcome', ru: '' },
          ctaUrl: '/contact',
        }),
      ).resolves.toBe(true);

      expect(repository.save).toHaveBeenCalledWith({
        title: { en: 'Welcome' },
        ctaUrl: '/contact',
      });
    });

    it('never overwrites an existing row', async () => {
      repository.count.mockResolvedValue(1);

      await expect(
        service.ensureSeeded({ title: { en: 'Welcome' } }),
      ).resolves.toBe(false);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
