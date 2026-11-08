import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TranslatedText, TranslatedTextPatch } from 'src/common/types';
import { mergeTranslatedText } from 'src/localization/translated-text.util';
import { CreateCleaningComponentDto, UpdateCleaningComponentDto } from './dtos';
import { CleaningComponentEntity } from './entities';
import {
  CleaningComponentNotFoundException,
  InvalidCleaningComponentSelectionException,
} from './exceptions';

@Injectable()
export class CleaningComponentService {
  constructor(
    @InjectRepository(CleaningComponentEntity)
    private readonly componentRepository: Repository<CleaningComponentEntity>,
  ) {}

  create(dto: CreateCleaningComponentDto): Promise<CleaningComponentEntity> {
    const component = this.componentRepository.create({
      title: mergeTranslatedText<TranslatedText>(null, dto.title),
      description: dto.description
        ? mergeTranslatedText<TranslatedTextPatch>(null, dto.description)
        : null,
    });
    return this.componentRepository.save(component);
  }

  findAll(search?: string): Promise<CleaningComponentEntity[]> {
    const query = this.componentRepository
      .createQueryBuilder('component')
      .orderBy("component.title ->> 'en'", 'ASC');

    if (search) {
      query.where(
        "(component.title ->> 'en' ILIKE :search OR component.title ->> 'hy' ILIKE :search OR component.title ->> 'ru' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    return query.getMany();
  }

  async findById(id: number): Promise<CleaningComponentEntity> {
    const component = await this.componentRepository.findOne({
      where: { id },
    });

    if (!component) {
      throw new CleaningComponentNotFoundException();
    }

    return component;
  }

  async findByIds(ids: number[]): Promise<CleaningComponentEntity[]> {
    const uniqueIds = [...new Set(ids)];
    const components = await this.componentRepository.find({
      where: { id: In(uniqueIds) },
    });

    if (components.length !== uniqueIds.length) {
      throw new InvalidCleaningComponentSelectionException();
    }

    return components;
  }

  async update(
    id: number,
    dto: UpdateCleaningComponentDto,
  ): Promise<CleaningComponentEntity> {
    const component = await this.findById(id);

    if (dto.title !== undefined) {
      component.title = mergeTranslatedText(component.title, dto.title);
    }

    if (dto.description !== undefined) {
      component.description = mergeTranslatedText(
        component.description,
        dto.description,
      );
    }

    return this.componentRepository.save(component);
  }

  async remove(id: number): Promise<void> {
    const component = await this.findById(id);
    await this.componentRepository.delete(component.id);
  }
}
