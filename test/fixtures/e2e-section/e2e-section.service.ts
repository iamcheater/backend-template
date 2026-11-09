import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectionService } from 'src/common/sections';
import { E2eSectionEntity } from './e2e-section.entity';

export const E2E_SECTION_TAG = 'e2e-section';

@Injectable()
export class E2eSectionService extends SectionService<
  E2eSectionEntity,
  'title' | 'subtitle'
> {
  protected readonly contentTag = E2E_SECTION_TAG;
  protected readonly translatedFields = ['title', 'subtitle'] as const;

  constructor(
    @InjectRepository(E2eSectionEntity)
    repository: Repository<E2eSectionEntity>,
    eventEmitter: EventEmitter2,
  ) {
    super(repository, eventEmitter);
  }
}
