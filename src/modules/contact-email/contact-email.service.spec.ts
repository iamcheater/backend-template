import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactEmailService } from './contact-email.service';
import { ContactEmailEntity } from './entities';
import {
  ContactEmailAlreadyExistsException,
  ContactEmailNotFoundException,
} from './exceptions';

describe('ContactEmailService', () => {
  let service: ContactEmailService;
  let repository: jest.Mocked<Repository<ContactEmailEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactEmailService,
        {
          provide: getRepositoryToken(ContactEmailEntity),
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

    service = module.get(ContactEmailService);
    repository = module.get(getRepositoryToken(ContactEmailEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws ContactEmailAlreadyExistsException when the email is already stored', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as ContactEmailEntity);

      await expect(
        service.create({ email: 'contact@jeenj.com' }),
      ).rejects.toThrow(ContactEmailAlreadyExistsException);
    });

    it('creates and saves a new contact email', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = {
        id: 1,
        email: 'contact@jeenj.com',
      } as ContactEmailEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create({ email: 'contact@jeenj.com' });

      expect(result).toBe(created);
    });
  });

  describe('findAll', () => {
    it('returns every email regardless of status', async () => {
      const emails = [{ id: 1 }] as ContactEmailEntity[];
      repository.find.mockResolvedValue(emails);

      await expect(service.findAll()).resolves.toBe(emails);
    });
  });

  describe('findAllActive', () => {
    it('only queries active emails', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAllActive();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('findById', () => {
    it('throws ContactEmailNotFoundException when the email does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        ContactEmailNotFoundException,
      );
    });

    it('returns the email when found', async () => {
      const email = { id: 1 } as ContactEmailEntity;
      repository.findOne.mockResolvedValue(email);

      await expect(service.findById(1)).resolves.toBe(email);
    });
  });

  describe('update', () => {
    it('throws ContactEmailNotFoundException when the email does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, { isActive: false })).rejects.toThrow(
        ContactEmailNotFoundException,
      );
    });

    it('throws ContactEmailAlreadyExistsException when the new email is taken by another row', async () => {
      repository.findOne
        .mockResolvedValueOnce({
          id: 1,
          email: 'old@jeenj.com',
        } as ContactEmailEntity)
        .mockResolvedValueOnce({
          id: 2,
          email: 'new@jeenj.com',
        } as ContactEmailEntity);

      await expect(
        service.update(1, { email: 'new@jeenj.com' }),
      ).rejects.toThrow(ContactEmailAlreadyExistsException);
    });

    it('updates the email address', async () => {
      const email = {
        id: 1,
        email: 'old@jeenj.com',
        isActive: true,
      } as ContactEmailEntity;
      repository.findOne
        .mockResolvedValueOnce(email)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ContactEmailEntity),
      );

      const result = await service.update(1, { email: 'new@jeenj.com' });

      expect(result.email).toBe('new@jeenj.com');
    });

    it('toggles isActive (disable/enable) without requiring a new email', async () => {
      const email = {
        id: 1,
        email: 'old@jeenj.com',
        isActive: true,
      } as ContactEmailEntity;
      repository.findOne.mockResolvedValue(email);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as ContactEmailEntity),
      );

      const result = await service.update(1, { isActive: false });

      expect(result.isActive).toBe(false);
      expect(result.email).toBe('old@jeenj.com');
    });
  });

  describe('remove', () => {
    it('throws ContactEmailNotFoundException when the email does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(
        ContactEmailNotFoundException,
      );
    });

    it('deletes the email when it exists', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as ContactEmailEntity);

      await service.remove(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
