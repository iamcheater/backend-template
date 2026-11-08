import { Test, TestingModule } from '@nestjs/testing';
import { ContactEmailController } from './contact-email.controller';
import { ContactEmailService } from './contact-email.service';
import { ContactEmailEntity } from './entities';

describe('ContactEmailController', () => {
  let controller: ContactEmailController;
  let service: jest.Mocked<ContactEmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactEmailController],
      providers: [
        {
          provide: ContactEmailService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findAllActive: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ContactEmailController);
    service = module.get(ContactEmailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllActive', () => {
    it('delegates to the service and returns its result', async () => {
      const emails = [{ id: 1 }] as ContactEmailEntity[];
      service.findAllActive.mockResolvedValue(emails);

      await expect(controller.findAllActive()).resolves.toBe(emails);
    });
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = { email: 'contact@jeenj.com' };
      const created = { id: 1, ...dto } as ContactEmailEntity;
      service.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const emails = [{ id: 1 }] as ContactEmailEntity[];
      service.findAll.mockResolvedValue(emails);

      await expect(controller.findAll()).resolves.toBe(emails);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = { id: 1, isActive: false } as ContactEmailEntity;
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, { isActive: false });

      expect(service.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('delegates to the service with the id', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
