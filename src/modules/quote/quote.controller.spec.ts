import { Test, TestingModule } from '@nestjs/testing';
import { PageDto, PageMetaDto } from 'src/common/dtos';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { SubmissionLanguage } from 'src/common/enums';
import { CreateQuoteDto, QuotePageOptionsDto } from './dtos';
import { KindOfClean } from './enums';
import { QuoteEntity } from './entities';

describe('QuoteController', () => {
  let controller: QuoteController;
  let service: jest.Mocked<QuoteService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteController],
      providers: [
        {
          provide: QuoteService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            assignCleaner: jest.fn(),
            unassignCleaner: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(QuoteController);
    service = module.get(QuoteService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to the service and returns nothing', async () => {
      const dto: CreateQuoteDto = {
        kindOfClean: KindOfClean.OFFICE,
        name: 'Jane Doe',
        phone: '+374 55 123456',
        area: 'Kentron',
        consentAccepted: true,
        language: SubmissionLanguage.EN,
        sourcePage: 'contact',
      };
      service.create.mockResolvedValue(undefined);

      await expect(controller.create(dto)).resolves.toBeUndefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service with the page options and returns its result', async () => {
      const quotes = [{ id: 1 }] as QuoteEntity[];
      const pageOptionsDto = new QuotePageOptionsDto();
      const page = new PageDto(
        quotes,
        new PageMetaDto({ pageOptionsDto, itemCount: 1 }),
      );
      service.findAll.mockResolvedValue(page);

      await expect(controller.findAll(pageOptionsDto)).resolves.toBe(page);
      expect(service.findAll).toHaveBeenCalledWith(pageOptionsDto);
    });
  });

  describe('findOne', () => {
    it('delegates to the service with the id', async () => {
      const quote = { id: 1 } as QuoteEntity;
      service.findById.mockResolvedValue(quote);

      await expect(controller.findOne(1)).resolves.toBe(quote);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('assignCleaner', () => {
    it('delegates to the service with the id and dto', async () => {
      const quote = { id: 1 } as QuoteEntity;
      service.assignCleaner.mockResolvedValue(quote);

      const result = await controller.assignCleaner(1, { cleanerId: 2 });

      expect(service.assignCleaner).toHaveBeenCalledWith(1, {
        cleanerId: 2,
      });
      expect(result).toBe(quote);
    });
  });

  describe('unassignCleaner', () => {
    it('delegates to the service with the id', async () => {
      const quote = { id: 1, assignedCleaner: null } as QuoteEntity;
      service.unassignCleaner.mockResolvedValue(quote);

      await expect(controller.unassignCleaner(1)).resolves.toBe(quote);
      expect(service.unassignCleaner).toHaveBeenCalledWith(1);
    });
  });
});
