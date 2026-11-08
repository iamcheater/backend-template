import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactPhoneService } from './contact-phone.service';
import { ContactPhoneEntity } from './entities';
import {
  ContactPhoneAlreadyExistsException,
  ContactPhoneNotFoundException,
} from './exceptions';

describe('ContactPhoneService', () => {
  let service: ContactPhoneService;
  let repository: jest.Mocked<Repository<ContactPhoneEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactPhoneService,
        {
          provide: getRepositoryToken(ContactPhoneEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ContactPhoneService);
    repository = module.get(getRepositoryToken(ContactPhoneEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws ContactPhoneAlreadyExistsException when the number is already stored', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as ContactPhoneEntity);

      await expect(service.create({ phone: '+37455123456' })).rejects.toThrow(
        ContactPhoneAlreadyExistsException,
      );
    });

    it('creates and saves a new contact phone', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = { id: 1, phone: '+37455123456' } as ContactPhoneEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create({ phone: '+37455123456' });

      expect(result).toBe(created);
    });
  });

  describe('findAll', () => {
    it('returns every phone regardless of status', async () => {
      const phones = [{ id: 1 }] as ContactPhoneEntity[];
      repository.find.mockResolvedValue(phones);

      await expect(service.findAll()).resolves.toBe(phones);
    });
  });

  describe('findAllActive', () => {
    it('only queries active phones', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAllActive();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('findById', () => {
    it('throws ContactPhoneNotFoundException when the phone does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        ContactPhoneNotFoundException,
      );
    });

    it('returns the phone when found', async () => {
      const phone = { id: 1 } as ContactPhoneEntity;
      repository.findOne.mockResolvedValue(phone);

      await expect(service.findById(1)).resolves.toBe(phone);
    });
  });

  describe('update', () => {
    it('throws ContactPhoneNotFoundException when the phone does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, { isActive: false })).rejects.toThrow(
        ContactPhoneNotFoundException,
      );
    });

    it('throws ContactPhoneAlreadyExistsException when the new number is taken by another row', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 1,
          phone: '+37455000000',
        } as ContactPhoneEntity)
        .mockResolvedValueOnce({
          id: 2,
          phone: '+37455123456',
        } as ContactPhoneEntity);

      await expect(
        service.update(1, { phone: '+37455123456' }),
      ).rejects.toThrow(ContactPhoneAlreadyExistsException);
    });

    it('updates the phone number', async () => {
      const phone = {
        id: 1,
        phone: '+37455000000',
        isActive: true,
      } as ContactPhoneEntity;
      repository.findOne
        .mockResolvedValueOnce(phone)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ContactPhoneEntity),
      );

      const result = await service.update(1, { phone: '+37455123456' });

      expect(result.phone).toBe('+37455123456');
    });

    it('toggles isActive (disable/enable) without requiring a new phone', async () => {
      const phone = {
        id: 1,
        phone: '+37455000000',
        isActive: true,
      } as ContactPhoneEntity;
      repository.findOne.mockResolvedValue(phone);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ContactPhoneEntity),
      );

      const result = await service.update(1, { isActive: false });

      expect(result.isActive).toBe(false);
      expect(result.phone).toBe('+37455000000');
    });
  });

  describe('remove', () => {
    it('throws ContactPhoneNotFoundException when the phone does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        ContactPhoneNotFoundException,
      );
    });

    it('deletes the phone when it exists', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as ContactPhoneEntity);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
