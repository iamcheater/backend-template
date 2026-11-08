import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslatedText } from 'src/common/types';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import {
  localize,
  mergeTranslatedText,
} from 'src/localization/translated-text.util';
import {
  CleanerExpectationResponseDto,
  CreateCleanerExpectationDto,
  UpdateCleanerExpectationDto,
} from './dtos';
import { CleanerExpectationEntity } from './entities';
import { CleanerExpectationNotFoundException } from './exceptions';

@Injectable()
export class CleanerExpectationService {
  constructor(
    @InjectRepository(CleanerExpectationEntity)
    private readonly expectationRepository: Repository<CleanerExpectationEntity>,
  ) {}

  async create(
    dto: CreateCleanerExpectationDto,
  ): Promise<CleanerExpectationEntity> {
    const expectation = this.expectationRepository.create({
      title: mergeTranslatedText<TranslatedText>(null, dto.title),
      description: mergeTranslatedText<TranslatedText>(null, dto.description),
      order: dto.order ?? 0,
    });

    return this.expectationRepository.save(expectation);
  }

  findAll(): Promise<CleanerExpectationEntity[]> {
    return this.expectationRepository.find({ order: { order: 'ASC' } });
  }

  async findAllPublic(
    language: SupportedLanguage,
  ): Promise<CleanerExpectationResponseDto[]> {
    const expectations = await this.findAll();

    return expectations.map(
      (expectation) =>
        new CleanerExpectationResponseDto({
          id: expectation.id,
          title: localize(expectation.title, language) ?? '',
          description: localize(expectation.description, language) ?? '',
          order: expectation.order,
        }),
    );
  }

  async findById(id: number): Promise<CleanerExpectationEntity> {
    const expectation = await this.expectationRepository.findOne({
      where: { id },
    });

    if (!expectation) {
      throw new CleanerExpectationNotFoundException();
    }

    return expectation;
  }

  async update(
    id: number,
    dto: UpdateCleanerExpectationDto,
  ): Promise<CleanerExpectationEntity> {
    const expectation = await this.findById(id);

    if (dto.title !== undefined) {
      expectation.title = mergeTranslatedText(expectation.title, dto.title);
    }

    if (dto.description !== undefined) {
      expectation.description = mergeTranslatedText(
        expectation.description,
        dto.description,
      );
    }

    if (dto.order !== undefined) {
      expectation.order = dto.order;
    }

    return this.expectationRepository.save(expectation);
  }

  async remove(id: number): Promise<void> {
    const expectation = await this.findById(id);
    await this.expectationRepository.delete(expectation.id);
  }
}
