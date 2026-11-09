import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeepPartial, FindOptionsOrder, Repository } from 'typeorm';
import { runOnTransactionCommit, Transactional } from 'typeorm-transactional';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import { SectionEntity } from '../entities';
import { ContentChangedEvent, EventName } from '../events';
import { SectionNotFoundException } from '../exceptions';
import { TranslatedTextPatch } from '../types';

type SectionBaseField = keyof SectionEntity;

export type SectionPatch<
  TEntity extends SectionEntity,
  TTranslated extends keyof TEntity,
> = Partial<Omit<TEntity, TTranslated | SectionBaseField>> &
  Partial<Record<TTranslated, TranslatedTextPatch | null>> & {
    isActive?: boolean;
  };

export type LocalizedSection<
  TEntity extends SectionEntity,
  TTranslated extends keyof TEntity,
> = Omit<TEntity, TTranslated | 'isActive' | 'createdAt'> &
  Record<TTranslated, string | null>;

export abstract class SectionService<
  TEntity extends SectionEntity,
  TTranslated extends keyof TEntity & string,
> {
  protected abstract readonly contentTag: string;
  protected abstract readonly translatedFields: readonly TTranslated[];

  protected constructor(
    protected readonly repository: Repository<TEntity>,
    protected readonly eventEmitter: EventEmitter2,
  ) {}

  async getForAdmin(): Promise<TEntity> {
    const [section] = await this.repository.find({
      order: { id: 'ASC' } as FindOptionsOrder<TEntity>,
      take: 1,
    });

    if (!section) {
      throw new SectionNotFoundException();
    }

    return section;
  }

  async getActiveForPublic(
    language: SupportedLanguage,
  ): Promise<LocalizedSection<TEntity, TTranslated>> {
    const section = await this.getForAdmin();

    if (!section.isActive) {
      throw new SectionNotFoundException();
    }

    return this.localizeSection(section, language);
  }

  @Transactional()
  async update(patch: SectionPatch<TEntity, TTranslated>): Promise<TEntity> {
    const section = await this.getForAdmin();
    const fields = section as unknown as Record<string, unknown>;

    for (const [field, value] of Object.entries(patch) as [string, unknown][]) {
      if (value === undefined) {
        continue;
      }

      fields[field] = this.isTranslatedField(field)
        ? this.mergeTranslatedField(fields[field], value)
        : value;
    }

    const saved = await this.repository.save(section);

    runOnTransactionCommit(() => {
      this.eventEmitter.emit(
        EventName.CONTENT_CHANGED,
        new ContentChangedEvent(this.contentTag),
      );
    });

    return saved;
  }

  async ensureSeeded(defaults: DeepPartial<TEntity>): Promise<boolean> {
    if ((await this.repository.count()) > 0) {
      return false;
    }

    const values = { ...defaults } as Record<string, unknown>;

    for (const field of this.translatedFields) {
      const text = values[field] as TranslatedTextPatch | null | undefined;

      if (text) {
        values[field] = mergeTranslatedText(null, text);
      }
    }

    await this.repository.save(
      this.repository.create(values as DeepPartial<TEntity>),
    );

    return true;
  }

  protected localizeSection(
    section: TEntity,
    language: SupportedLanguage,
  ): LocalizedSection<TEntity, TTranslated> {
    const { isActive, createdAt, ...rest } = section;
    const localized = { ...rest } as Record<string, unknown>;

    for (const field of this.translatedFields) {
      localized[field] = localize(section[field], language);
    }

    return localized as LocalizedSection<TEntity, TTranslated>;
  }

  private isTranslatedField(field: string): boolean {
    return (this.translatedFields as readonly string[]).includes(field);
  }

  private mergeTranslatedField(
    current: TranslatedTextPatch | null,
    patch: TranslatedTextPatch | null,
  ): TranslatedTextPatch | null {
    if (patch === null) {
      return null;
    }

    const merged = mergeTranslatedText(current, patch);

    return Object.keys(merged).length > 0 ? merged : null;
  }
}
