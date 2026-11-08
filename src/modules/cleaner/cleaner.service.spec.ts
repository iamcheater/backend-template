import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SortOrder, SubmissionLanguage } from 'src/common/enums';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { CleanerService } from './cleaner.service';
import { CleanerPageOptionsDto, CreateCleanerDto } from './dtos';
import { CleanerEntity } from './entities';
import {
  Availability,
  CleanerSkill,
  CleanerStatus,
  CleaningExperience,
  SuppliesAnswer,
} from './enums';
import { CleanerNotFoundException } from './exceptions';

describe('CleanerService', () => {
  let service: CleanerService;
  let repository: jest.Mocked<Repository<CleanerEntity>>;
  let telegramService: jest.Mocked<TelegramService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanerService,
        {
          provide: getRepositoryToken(CleanerEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
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
      ],
    }).compile();

    service = module.get(CleanerService);
    repository = module.get(getRepositoryToken(CleanerEntity));
    telegramService = module.get(TelegramService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateCleanerDto = {
      fullName: 'Jane Cleaner',
      phone: '+374 55 123456',
      cityArea: 'Arabkir, Yerevan',
      cleaningExperience: CleaningExperience.ONE_TO_THREE,
      availability: [Availability.WEEKDAY_MORNINGS, Availability.WEEKENDS],
      servicesCanDo: [CleanerSkill.HOME, CleanerSkill.WINDOWS],
      hasOwnSupplies: SuppliesAnswer.YES,
      message: 'Available immediately',
      consentAccepted: true,
      language: SubmissionLanguage.RU,
      sourcePage: 'for-cleaners',
      pageUrl: 'https://jeenj.am/ru/for-cleaners',
    };
    const { hasOwnSupplies: _hasOwnSupplies, ...rest } = dto;
    const stored = { ...rest, hasOwnSupplies: true };

    const mockSave = (overrides: Partial<CleanerEntity> = {}) => {
      const created = { id: 1, ...stored, ...overrides } as CleanerEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      return created;
    };

    it('creates the application with "yes" supplies stored as true and returns nothing', async () => {
      const created = mockSave();

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(stored);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toBeUndefined();
    });

    it('stores "no" supplies as false', async () => {
      mockSave({ hasOwnSupplies: false });

      await service.create({ ...dto, hasOwnSupplies: SuppliesAnswer.NO });

      expect(repository.create).toHaveBeenCalledWith({
        ...stored,
        hasOwnSupplies: false,
      });
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
      expect(message).toContain('<b>Name:</b> Jane Cleaner');
      expect(message).toContain('<b>Phone:</b> +374 55 123456');
      expect(message).toContain('<b>City / area:</b> Arabkir, Yerevan');
      expect(message).toContain('<b>Experience:</b> 1–3 years');
      expect(message).toContain(
        '<b>Availability:</b> Weekday mornings, Weekends',
      );
      expect(message).toContain('<b>Services:</b> Home, Windows');
      expect(message).toContain('<b>Own supplies:</b> Yes');
      expect(message).toContain('<b>Message:</b> Available immediately');
      expect(message).toContain('<b>Language:</b> RU');
      expect(message).toContain('<b>Source page:</b> for-cleaners');
    });

    it('omits the message line when no message was provided', async () => {
      mockSave({ message: null });

      await service.create({ ...dto, message: undefined });

      const [message] = telegramService.sendMessage.mock.calls[0];
      expect(message).not.toContain('Message');
    });

    it('escapes HTML in user-provided values', async () => {
      mockSave({ fullName: '<i>Jane</i>' });

      await service.create({ ...dto, fullName: '<i>Jane</i>' });

      const [message] = telegramService.sendMessage.mock.calls[0];
      expect(message).toContain('&lt;i&gt;Jane&lt;/i&gt;');
    });

    it('sends a Telegram notification with View and Copy phone buttons when ADMIN_DASHBOARD_URL is configured', async () => {
      mockSave();
      configService.get.mockReturnValue('https://dashboard.jeenj.com');

      await service.create(dto);

      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining(dto.fullName),
        [
          {
            type: 'url',
            text: 'View',
            url: 'https://dashboard.jeenj.com/cleaners?search=%231',
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
    const mockQueryBuilder = (result: [CleanerEntity[], number]) => {
      const builder = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue(result),
      };
      repository.createQueryBuilder.mockReturnValue(
        builder as unknown as SelectQueryBuilder<CleanerEntity>,
      );
      return builder;
    };

    it('returns a paginated page ordered by newest first by default, with no filters', async () => {
      const cleaners = [{ id: 2 }, { id: 1 }] as CleanerEntity[];
      const builder = mockQueryBuilder([cleaners, 2]);

      const result = await service.findAll(new CleanerPageOptionsDto());

      expect(builder.orderBy).toHaveBeenCalledWith(
        'cleaner.createdAt',
        SortOrder.DESC,
      );
      expect(builder.skip).toHaveBeenCalledWith(0);
      expect(builder.take).toHaveBeenCalledWith(10);
      expect(builder.andWhere).not.toHaveBeenCalled();
      expect(result.data).toBe(cleaners);
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
      const pageOptionsDto = Object.assign(new CleanerPageOptionsDto(), {
        page: 2,
        take: 5,
        order: SortOrder.ASC,
      });

      const result = await service.findAll(pageOptionsDto);

      expect(builder.orderBy).toHaveBeenCalledWith(
        'cleaner.createdAt',
        SortOrder.ASC,
      );
      expect(builder.skip).toHaveBeenCalledWith(5);
      expect(builder.take).toHaveBeenCalledWith(5);
      expect(result.meta.pageCount).toBe(5);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(result.meta.hasNextPage).toBe(true);
    });

    it('narrows by every cleaner-specific filter', async () => {
      const builder = mockQueryBuilder([[], 0]);

      await service.findAll(
        Object.assign(new CleanerPageOptionsDto(), {
          status: CleanerStatus.VERIFIED,
          cleaningExperience: CleaningExperience.THREE_PLUS,
          skill: CleanerSkill.WINDOWS,
          availability: Availability.EVENINGS,
          hasOwnSupplies: false,
        }),
      );

      expect(builder.andWhere).toHaveBeenCalledWith(
        'cleaner.status = :status',
        {
          status: CleanerStatus.VERIFIED,
        },
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        'cleaner.cleaningExperience = :cleaningExperience',
        { cleaningExperience: CleaningExperience.THREE_PLUS },
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        ':skill = ANY(cleaner.servicesCanDo)',
        { skill: CleanerSkill.WINDOWS },
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        ':availability = ANY(cleaner.availability)',
        { availability: Availability.EVENINGS },
      );
      expect(builder.andWhere).toHaveBeenCalledWith(
        'cleaner.hasOwnSupplies = :hasOwnSupplies',
        { hasOwnSupplies: false },
      );
    });
  });

  describe('findById', () => {
    it('throws CleanerNotFoundException when the cleaner does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        CleanerNotFoundException,
      );
    });

    it('returns the cleaner when found', async () => {
      const cleaner = { id: 1 } as CleanerEntity;
      repository.findOne.mockResolvedValue(cleaner);

      await expect(service.findById(1)).resolves.toBe(cleaner);
    });
  });

  describe('updateStatus', () => {
    it('throws CleanerNotFoundException when the cleaner does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(1, CleanerStatus.VERIFIED),
      ).rejects.toThrow(CleanerNotFoundException);
    });

    it('updates and saves the new status', async () => {
      const cleaner = {
        id: 1,
        status: CleanerStatus.PENDING,
      } as CleanerEntity;
      repository.findOne.mockResolvedValue(cleaner);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as CleanerEntity),
      );

      const result = await service.updateStatus(1, CleanerStatus.REJECTED);

      expect(result.status).toBe(CleanerStatus.REJECTED);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CleanerStatus.REJECTED }),
      );
    });
  });
});
