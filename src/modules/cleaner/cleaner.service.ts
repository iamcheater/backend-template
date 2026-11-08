import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageDto, PageMetaDto } from 'src/common/dtos';
import { applySubmissionFilters, RecordSearchColumns } from 'src/common/utils';
import { TelegramInlineButton } from 'src/modules/telegram/interfaces';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { escapeTelegramHtml } from 'src/modules/telegram/utils';
import { CleanerPageOptionsDto, CreateCleanerDto } from './dtos';
import { CleanerEntity } from './entities';
import { CleanerStatus, SuppliesAnswer } from './enums';
import { CleanerNotFoundException } from './exceptions';
import {
  AVAILABILITY_LABELS,
  CLEANER_SKILL_LABELS,
  CLEANING_EXPERIENCE_LABELS,
} from './utils';

const CLEANER_SEARCH_COLUMNS: RecordSearchColumns = {
  text: ['fullName', 'cityArea', 'message'],
  phone: 'phone',
};

@Injectable()
export class CleanerService {
  constructor(
    @InjectRepository(CleanerEntity)
    private readonly cleanerRepository: Repository<CleanerEntity>,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateCleanerDto): Promise<void> {
    const { website, hasOwnSupplies, ...submission } = dto;

    if (website) {
      return;
    }

    const saved = await this.cleanerRepository.save(
      this.cleanerRepository.create({
        ...submission,
        hasOwnSupplies: hasOwnSupplies === SuppliesAnswer.YES,
      }),
    );

    void this.notifyTelegram(saved);
  }

  private notifyTelegram(cleaner: CleanerEntity): Promise<void> {
    const lines = [
      '🧽 <b>New cleaner application</b>',
      '',
      `<b>Name:</b> ${escapeTelegramHtml(cleaner.fullName)}`,
      `<b>Phone:</b> ${escapeTelegramHtml(cleaner.phone)}`,
      `<b>City / area:</b> ${escapeTelegramHtml(cleaner.cityArea)}`,
    ];

    if (cleaner.cleaningExperience) {
      lines.push(
        `<b>Experience:</b> ${CLEANING_EXPERIENCE_LABELS[cleaner.cleaningExperience]}`,
      );
    }

    lines.push(
      `<b>Availability:</b> ${cleaner.availability.map((slot) => AVAILABILITY_LABELS[slot]).join(', ')}`,
      `<b>Services:</b> ${cleaner.servicesCanDo.map((skill) => CLEANER_SKILL_LABELS[skill]).join(', ')}`,
      `<b>Own supplies:</b> ${cleaner.hasOwnSupplies ? 'Yes' : 'No'}`,
    );

    if (cleaner.message) {
      lines.push(`<b>Message:</b> ${escapeTelegramHtml(cleaner.message)}`);
    }

    if (cleaner.language) {
      lines.push(`<b>Language:</b> ${cleaner.language.toUpperCase()}`);
    }

    if (cleaner.sourcePage) {
      lines.push(
        `<b>Source page:</b> ${escapeTelegramHtml(cleaner.sourcePage)}`,
      );
    }

    const adminDashboardUrl = this.configService.get<string>(
      'app.adminDashboardUrl',
    );
    const buttons: TelegramInlineButton[] = [];

    if (adminDashboardUrl) {
      buttons.push({
        type: 'url',
        text: 'View',
        url: `${adminDashboardUrl}/cleaners?search=%23${cleaner.id}`,
      });
    }

    buttons.push({
      type: 'copy',
      text: 'Copy phone',
      copyText: cleaner.phone,
    });

    return this.telegramService.sendMessage(lines.join('\n'), buttons);
  }

  async findAll(
    pageOptionsDto: CleanerPageOptionsDto,
  ): Promise<PageDto<CleanerEntity>> {
    const query = this.cleanerRepository
      .createQueryBuilder('cleaner')
      .orderBy('cleaner.createdAt', pageOptionsDto.order)
      .addOrderBy('cleaner.id', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    applySubmissionFilters(
      query,
      'cleaner',
      pageOptionsDto,
      CLEANER_SEARCH_COLUMNS,
    );

    if (pageOptionsDto.status) {
      query.andWhere('cleaner.status = :status', {
        status: pageOptionsDto.status,
      });
    }

    if (pageOptionsDto.cleaningExperience) {
      query.andWhere('cleaner.cleaningExperience = :cleaningExperience', {
        cleaningExperience: pageOptionsDto.cleaningExperience,
      });
    }

    if (pageOptionsDto.skill) {
      query.andWhere(':skill = ANY(cleaner.servicesCanDo)', {
        skill: pageOptionsDto.skill,
      });
    }

    if (pageOptionsDto.availability) {
      query.andWhere(':availability = ANY(cleaner.availability)', {
        availability: pageOptionsDto.availability,
      });
    }

    if (pageOptionsDto.hasOwnSupplies !== undefined) {
      query.andWhere('cleaner.hasOwnSupplies = :hasOwnSupplies', {
        hasOwnSupplies: pageOptionsDto.hasOwnSupplies,
      });
    }

    const [cleaners, itemCount] = await query.getManyAndCount();

    const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(cleaners, pageMetaDto);
  }

  async findById(id: number): Promise<CleanerEntity> {
    const cleaner = await this.cleanerRepository.findOne({
      where: { id },
    });

    if (!cleaner) {
      throw new CleanerNotFoundException();
    }

    return cleaner;
  }

  async updateStatus(
    id: number,
    status: CleanerStatus,
  ): Promise<CleanerEntity> {
    const cleaner = await this.findById(id);
    cleaner.status = status;
    return this.cleanerRepository.save(cleaner);
  }
}
