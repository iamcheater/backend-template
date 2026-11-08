import { Test, TestingModule } from '@nestjs/testing';
import { ContactPhoneController } from './contact-phone.controller';
import { ContactPhoneService } from './contact-phone.service';
import { ContactPhoneEntity } from './entities';

describe('ContactPhoneController', () => {
  let controller: ContactPhoneController;
  let service: jest.Mocked<ContactPhoneService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactPhoneController],
      providers: [
        {
          provide: ContactPhoneService,
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

    controller = module.get(ContactPhoneController);
    service = module.get(ContactPhoneService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllActive', () => {
    it('delegates to the service and returns its result', async () => {
      const phones = [{ id: 1 }] as ContactPhoneEntity[];
      service.findAllActive.mockResolvedValue(phones);

      await expect(controller.findAllActive()).resolves.toBe(phones);
    });
  });

  describe('create', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = { phone: '+37455123456' };
      const created = { id: 1, ...dto } as ContactPhoneEntity;
      service.create.mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to the service and returns its result', async () => {
      const phones = [{ id: 1 }] as ContactPhoneEntity[];
      service.findAll.mockResolvedValue(phones);

      await expect(controller.findAll()).resolves.toBe(phones);
    });
  });

  describe('update', () => {
    it('delegates to the service with the id and dto', async () => {
      const updated = { id: 1, isActive: false } as ContactPhoneEntity;
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
