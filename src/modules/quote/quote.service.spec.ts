import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SortOrder, SubmissionLanguage } from 'src/common/enums';
import { CleanerService } from 'src/modules/cleaner/cleaner.service';
import { CleanerNotVerifiedException } from 'src/modules/cleaner/exceptions';
import { CleanerStatus } from 'src/modules/cleaner/enums';
import { CleanerEntity } from 'src/modules/cleaner/entities';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { QuoteService } from './quote.service';
import { CreateQuoteDto, QuotePageOptionsDto } from './dtos';
import { KindOfClean, PreferredTiming, QuoteAssignment } from './enums';
import { QuoteEntity } from './entities';
import { QuoteNotFoundException } from './exceptions';

describe('QuoteService', () => {
  let service: QuoteService;
  let repository: jest.Mocked<Repository<QuoteEntity>>;
  let telegramService: jest.Mocked<TelegramService>;
  let configService: jest.Mocked<ConfigService>;
  let cleanerService: jest.Mocked<CleanerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        {
          provide: getRepositoryToken(QuoteEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: TelegramService,
          useValue: { sendMessage: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: CleanerService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(QuoteService);
    repository = module.get(getRepositoryToken(QuoteEntity));
    telegramService = module.get(TelegramService);
    configService = module.get(ConfigService);
    cleanerService = module.get(CleanerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const submission = {
      kindOfClean: KindOfClean.HOME,
      name: 'Jane Doe',
      phone: '+374 55 123456',
      area: 'Arabkir, Yerevan',
      preferredTiming: PreferredTiming.THIS_WEEK,
      message: 'Two bedrooms',
      consentAccepted: true,
      language: SubmissionLanguage.HY,
      sourcePage: 'contact',
      pageUrl: 'https://jeenj.am/hy/contact',
    };
    const dto: CreateQuoteDto = { ...submission };

    const mockSave = () => {
      const created = { id: 1, ...submission } as QuoteEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      return created;
    };

    it('creates the quote from the submitted fields and returns nothing', async () => {
      const created = mockSave();

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(submission);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toBeUndefined();
    });

    it('never persists the honeypot field', async () => {
      mockSave();

      await service.create({ ...dto, website: undefined });

      expect(repository.create).toHaveBeenCalledWith(submission);
    });

    it('silently drops a submission whose honeypot field is filled', async () => {
      await expect(
        service.create({ ...dto, website: 'https://spam.example' }),
      ).resolves.toBeUndefined();

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(telegramService.sendMessage).not.toHaveBeenCalled();
    });

    it('includes every submitted detail with readable labels in the Telegram message', async () => {
      mockSave();

      await service.create(dto);

      const [message] = telegramService.sendMessage.mock.calls[0];
      expect(message).toContain('<b>Kind of clean:</b> Home');
      expect(message).toContain('<b>Name:</b> Jane Doe');
      expect(message).toContain('<b>Phone:</b> +374 55 123456');
      expect(message).toContain('<b>Area:</b> Arabkir, Yerevan');
      expect(message).toContain('<b>Preferred timing:</b> This week');
      expect(message).toContain('<b>Message:</b> Two bedrooms');
      expect(message).toContain('<b>Language:</b> HY');
      expect(message).toContain('<b>Source page:</b> contact');
    });

    it('omits optional lines from the Telegram message when they were not provided', async () => {
      const created = {
        id: 1,
        ...submission,
        preferredTiming: null,
        message: null,
      } as QuoteEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({
        ...dto,
        preferredTiming: undefined,
        message: undefined,
      });

      const [message] = telegramService.sendMessage.mock.calls[0];
      expect(message).not.toContain('Preferred timing');
      expect(message).not.toContain('Message');
    });

    it('escapes HTML in user-provided values', async () => {
      const created = {
        id: 1,
        ...submission,
        name: '<b>Jane</b>',
      } as QuoteEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      await service.create({ ...dto, name: '<b>Jane</b>' });

      const [message] = telegramService.sendMessage.mock.calls[0];
      expect(message).toContain('&lt;b&gt;Jane&lt;/b&gt;');
    });

    it('sends a Telegram notification with View and Copy phone buttons when ADMIN_DASHBOARD_URL is configured', async () => {
      mockSave();
      configService.get.mockReturnValue('https://dashboard.jeenj.com');

      await service.create(dto);

      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining(dto.name),
        [
          {
            type: 'url',
            text: 'View',
            url: 'https://dashboard.jeenj.com/quotes?search=%231',
          },
          { type: 'copy', text: 'Copy phone', copyText: dto.phone },
        ],
      );
    });

    it('sends a Telegram notification with only the Copy phone button when ADMIN_DASHBOARD_URL is not configured', async () => {
      mockSave();
      configService.get.mockReturnValue(undefined);

      await service.create(dto);

      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        [{ type: 'copy', text: 'Copy phone', copyText: dto.phone }],
      );
    });
  });

  describe('findAll', () => {
    const mockQueryBuilder = (result: [QuoteEntity[], number]) => {
      const builder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue(result),
      };
      repository.createQueryBuilder.mockReturnValue(
        builder as unknown as SelectQueryBuilder<QuoteEntity>,
      );
      return builder;
    };

    it('returns a paginated page ordered by newest first by default, with no filters', async () => {
      const quotes = [{ id: 2 }, { id: 1 }] as QuoteEntity[];
      const builder = mockQueryBuilder([quotes, 2]);

      const result = await service.findAll(new QuotePageOptionsDto());

      expect(builder.leftJoinAndSelect).toHaveBeenCalledWith(
        'quote.assignedCleaner',
        'assignedCleaner',
      );
      expect(builder.orderBy).toHaveBeenCalledWith(
        'quote.createdAt',
        SortOrder.DESC,
      );
      expect(builder.skip).toHaveBeenCalledWith(0);
      expect(builder.take).toHaveBeenCalledWith(10);
      expect(builder.andWhere).not.toHaveBeenCalled();
      expect(result.data).toBe(quotes);
      expect(result.meta).toMatchObject({
        page: 1,
        take: 10,
        itemCount: 2,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('applies the requested page, take, and order', async () => {
      const builder = mockQueryBuilder([[], 25]);
      const pageOptionsDto = Object.assign(new QuotePageOptionsDto(), {
        page: 2,
        take: 5,
        order: SortOrder.ASC,
      });

      const result = await service.findAll(pageOptionsDto);

      expect(builder.orderBy).toHaveBeenCalledWith(
        'quote.createdAt',
        SortOrder.ASC,
      );
      expect(builder.skip).toHaveBeenCalledWith(5);
      expect(builder.take).toHaveBeenCalledWith(5);
      expect(result.meta.pageCount).toBe(5);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('narrows by kind of clean and preferred timing', async () => {
      const builder = mockQueryBuilder([[], 0]);

      await service.findAll(
        Object.assign(new QuotePageOptionsDto(), {
          kindOfClean: KindOfClean.DEEP,
          preferredTiming: PreferredTiming.FLEXIBLE,
        }),
      );

      expect(builder.andWhere).toHaveBeenCalledWith(
        'quote.kindOfClean = :kindOfClean',
        { kindOfClean: KindOfClean.DEEP },
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        'quote.preferredTiming = :preferredTiming',
        { preferredTiming: PreferredTiming.FLEXIBLE },
      );
    });

    it.each([
      [QuoteAssignment.ASSIGNED, 'assignedCleaner.id IS NOT NULL'],
      [QuoteAssignment.UNASSIGNED, 'assignedCleaner.id IS NULL'],
    ])('narrows by assignment "%s"', async (assignment, condition) => {
      const builder = mockQueryBuilder([[], 0]);

      await service.findAll(
        Object.assign(new QuotePageOptionsDto(), { assignment }),
      );

      expect(builder.andWhere).toHaveBeenCalledWith(condition);
    });

    it('narrows to the quotes assigned to one cleaner', async () => {
      const builder = mockQueryBuilder([[], 0]);

      await service.findAll(
        Object.assign(new QuotePageOptionsDto(), { cleanerId: 7 }),
      );

      expect(builder.andWhere).toHaveBeenCalledWith(
        'assignedCleaner.id = :cleanerId',
        { cleanerId: 7 },
      );
    });

    it('searches the quote text columns and phone', async () => {
      const builder = mockQueryBuilder([[], 0]);

      await service.findAll(
        Object.assign(new QuotePageOptionsDto(), { search: 'Arabkir' }),
      );

      expect(builder.andWhere).toHaveBeenCalledWith(
        '(quote.name ILIKE :searchText OR quote.area ILIKE :searchText OR quote.message ILIKE :searchText OR quote.phone ILIKE :searchText)',
        { searchText: '%Arabkir%' },
      );
    });
  });

  describe('findById', () => {
    it('throws QuoteNotFoundException when the quote does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(QuoteNotFoundException);
    });

    it('returns the quote with the assigned cleaner relation loaded', async () => {
      const quote = { id: 1 } as QuoteEntity;
      repository.findOne.mockResolvedValue(quote);

      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['assignedCleaner'],
      });
      expect(result).toBe(quote);
    });
  });

  describe('assignCleaner', () => {
    it('throws QuoteNotFoundException when the quote does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.assignCleaner(1, { cleanerId: 1 })).rejects.toThrow(
        QuoteNotFoundException,
      );
    });

    it('throws CleanerNotVerifiedException when the cleaner is not verified', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as QuoteEntity);
      cleanerService.findById.mockResolvedValue({
        id: 2,
        status: CleanerStatus.PENDING,
      } as CleanerEntity);

      await expect(service.assignCleaner(1, { cleanerId: 2 })).rejects.toThrow(
        CleanerNotVerifiedException,
      );
    });

    it('assigns a verified cleaner to the quote', async () => {
      const quote = { id: 1 } as QuoteEntity;
      const cleaner = {
        id: 2,
        status: CleanerStatus.VERIFIED,
      } as CleanerEntity;
      repository.findOne.mockResolvedValue(quote);
      cleanerService.findById.mockResolvedValue(cleaner);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as QuoteEntity),
      );

      const result = await service.assignCleaner(1, { cleanerId: 2 });

      expect(result.assignedCleaner).toBe(cleaner);
      expect(result.assignedAt).toBeInstanceOf(Date);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ assignedCleaner: cleaner }),
      );
    });
  });

  describe('unassignCleaner', () => {
    it('throws QuoteNotFoundException when the quote does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.unassignCleaner(1)).rejects.toThrow(
        QuoteNotFoundException,
      );
    });

    it('clears the assigned cleaner and the assignment time', async () => {
      const quote = {
        id: 1,
        assignedCleaner: { id: 2 } as CleanerEntity,
        assignedAt: new Date(),
      } as QuoteEntity;
      repository.findOne.mockResolvedValue(quote);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as QuoteEntity),
      );

      const result = await service.unassignCleaner(1);

      expect(result.assignedCleaner).toBeNull();
      expect(result.assignedAt).toBeNull();
    });
  });
});
