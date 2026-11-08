import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageDto, PageMetaDto } from 'src/common/dtos';
import { applySubmissionFilters, RecordSearchColumns } from 'src/common/utils';
import { CleanerService } from 'src/modules/cleaner/cleaner.service';
import { CleanerNotVerifiedException } from 'src/modules/cleaner/exceptions';
import { CleanerStatus } from 'src/modules/cleaner/enums';
import { TelegramInlineButton } from 'src/modules/telegram/interfaces';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { escapeTelegramHtml } from 'src/modules/telegram/utils';
import { AssignCleanerDto, CreateQuoteDto, QuotePageOptionsDto } from './dtos';
import { QuoteEntity } from './entities';
import { QuoteAssignment } from './enums';
import { QuoteNotFoundException } from './exceptions';
import { KIND_OF_CLEAN_LABELS, PREFERRED_TIMING_LABELS } from './utils';

const QUOTE_SEARCH_COLUMNS: RecordSearchColumns = {
  text: ['name', 'area', 'message'],
  phone: 'phone',
};

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(QuoteEntity)
    private readonly quoteRepository: Repository<QuoteEntity>,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
    private readonly cleanerService: CleanerService,
  ) {}

  async create(dto: CreateQuoteDto): Promise<void> {
    const { website, ...submission } = dto;

    if (website) {
      return;
    }

    const saved = await this.quoteRepository.save(
      this.quoteRepository.create(submission),
    );

    void this.notifyTelegram(saved);
  }

  async findAll(
    pageOptionsDto: QuotePageOptionsDto,
  ): Promise<PageDto<QuoteEntity>> {
    const query = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.assignedCleaner', 'assignedCleaner')
      .orderBy('quote.createdAt', pageOptionsDto.order)
      .addOrderBy('quote.id', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    applySubmissionFilters(
      query,
      'quote',
      pageOptionsDto,
      QUOTE_SEARCH_COLUMNS,
    );

    if (pageOptionsDto.kindOfClean) {
      query.andWhere('quote.kindOfClean = :kindOfClean', {
        kindOfClean: pageOptionsDto.kindOfClean,
      });
    }

    if (pageOptionsDto.preferredTiming) {
      query.andWhere('quote.preferredTiming = :preferredTiming', {
        preferredTiming: pageOptionsDto.preferredTiming,
      });
    }

    if (pageOptionsDto.assignment) {
      query.andWhere(
        pageOptionsDto.assignment === QuoteAssignment.ASSIGNED
          ? 'assignedCleaner.id IS NOT NULL'
          : 'assignedCleaner.id IS NULL',
      );
    }

    if (pageOptionsDto.cleanerId) {
      query.andWhere('assignedCleaner.id = :cleanerId', {
        cleanerId: pageOptionsDto.cleanerId,
      });
    }

    const [quotes, itemCount] = await query.getManyAndCount();

    const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(quotes, pageMetaDto);
  }

  async findById(id: number): Promise<QuoteEntity> {
    const quote = await this.quoteRepository.findOne({
      where: { id },
      relations: ['assignedCleaner'],
    });

    if (!quote) {
      throw new QuoteNotFoundException();
    }

    return quote;
  }

  async assignCleaner(id: number, dto: AssignCleanerDto): Promise<QuoteEntity> {
    const quote = await this.findById(id);
    const cleaner = await this.cleanerService.findById(dto.cleanerId);

    if (cleaner.status !== CleanerStatus.VERIFIED) {
      throw new CleanerNotVerifiedException();
    }

    quote.assignedCleaner = cleaner;
    quote.assignedAt = new Date();
    return this.quoteRepository.save(quote);
  }

  async unassignCleaner(id: number): Promise<QuoteEntity> {
    const quote = await this.findById(id);

    quote.assignedCleaner = null;
    quote.assignedAt = null;
    return this.quoteRepository.save(quote);
  }

  private notifyTelegram(quote: QuoteEntity): Promise<void> {
    const lines = ['🧹 <b>New quote request</b>', ''];

    if (quote.kindOfClean) {
      lines.push(
        `<b>Kind of clean:</b> ${KIND_OF_CLEAN_LABELS[quote.kindOfClean]}`,
      );
    }

    lines.push(
      `<b>Name:</b> ${escapeTelegramHtml(quote.name)}`,
      `<b>Phone:</b> ${escapeTelegramHtml(quote.phone)}`,
      `<b>Area:</b> ${escapeTelegramHtml(quote.area)}`,
    );

    if (quote.preferredTiming) {
      lines.push(
        `<b>Preferred timing:</b> ${PREFERRED_TIMING_LABELS[quote.preferredTiming]}`,
      );
    }

    if (quote.message) {
      lines.push(`<b>Message:</b> ${escapeTelegramHtml(quote.message)}`);
    }

    if (quote.language) {
      lines.push(`<b>Language:</b> ${quote.language.toUpperCase()}`);
    }

    if (quote.sourcePage) {
      lines.push(`<b>Source page:</b> ${escapeTelegramHtml(quote.sourcePage)}`);
    }

    const adminDashboardUrl = this.configService.get<string>(
      'app.adminDashboardUrl',
    );
    const buttons: TelegramInlineButton[] = [];

    if (adminDashboardUrl) {
      buttons.push({
        type: 'url',
        text: 'View',
        url: `${adminDashboardUrl}/quotes?search=%23${quote.id}`,
      });
    }

    buttons.push({
      type: 'copy',
      text: 'Copy phone',
      copyText: quote.phone,
    });

    return this.telegramService.sendMessage(lines.join('\n'), buttons);
  }
}
