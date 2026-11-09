import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { SortOrder } from 'src/common/enums';
import { AdminService } from './admin.service';
import { AdminPageOptionsDto } from './dtos';
import { AdminEntity } from './entities';
import { AdminRole } from './enums';
import {
  AdminCannotDeleteSelfException,
  AdminEmailAlreadyExistsException,
  AdminIncorrectCurrentPasswordException,
  AdminNotFoundException,
} from './exceptions';

jest.mock('bcrypt');

describe('AdminService', () => {
  let service: AdminService;
  let repository: jest.Mocked<Repository<AdminEntity>>;
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(AdminEntity),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            exists: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get(AdminService);
    repository = module.get(getRepositoryToken(AdminEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('returns null when no admin matches', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findByEmail('nobody@example.com'),
      ).resolves.toBeNull();
    });

    it('returns the admin when found', async () => {
      const admin = { id: 1, email: 'admin@example.com' } as AdminEntity;
      repository.findOne.mockResolvedValue(admin);

      await expect(service.findByEmail('admin@example.com')).resolves.toBe(
        admin,
      );
    });
  });

  describe('hasAdminWithRole', () => {
    it('checks for an admin with the given role', async () => {
      repository.exists.mockResolvedValue(true);

      await expect(
        service.hasAdminWithRole(AdminRole.SUPER_ADMIN),
      ).resolves.toBe(true);
      expect(repository.exists).toHaveBeenCalledWith({
        where: { role: AdminRole.SUPER_ADMIN },
      });
    });

    it('returns false when no admin has the role', async () => {
      repository.exists.mockResolvedValue(false);

      await expect(service.hasAdminWithRole(AdminRole.ADMIN)).resolves.toBe(
        false,
      );
    });
  });

  describe('findById', () => {
    it('throws AdminNotFoundException when the admin does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(AdminNotFoundException);
    });

    it('returns the admin when found', async () => {
      const admin = { id: 1 } as AdminEntity;
      repository.findOne.mockResolvedValue(admin);

      await expect(service.findById(1)).resolves.toBe(admin);
    });
  });

  describe('create', () => {
    it('creates and saves a new admin', async () => {
      const created = {
        email: 'admin@example.com',
        password: 'hashed',
        role: AdminRole.SUPER_ADMIN,
      } as AdminEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create({
        email: 'admin@example.com',
        password: 'hashed',
        role: AdminRole.SUPER_ADMIN,
      });

      expect(result).toBe(created);
    });
  });

  describe('findAll', () => {
    it('returns a paginated page ordered by newest first by default', async () => {
      const admins = [{ id: 2 }, { id: 1 }] as AdminEntity[];
      repository.findAndCount.mockResolvedValue([admins, 2]);
      const pageOptionsDto = new AdminPageOptionsDto();

      const result = await service.findAll(pageOptionsDto);

      expect(repository.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: SortOrder.DESC },
        skip: 0,
        take: 10,
      });
      expect(result.data).toBe(admins);
      expect(result.meta).toMatchObject({ page: 1, take: 10, itemCount: 2 });
    });
  });

  describe('createAdmin', () => {
    it('throws AdminEmailAlreadyExistsException when the email is taken', async () => {
      repository.findOne.mockResolvedValue({ id: 1 } as AdminEntity);

      await expect(
        service.createAdmin({
          email: 'admin@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(AdminEmailAlreadyExistsException);
    });

    it('creates a new admin with role=admin and returns the re-fetched entity', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, role: AdminRole.ADMIN } as AdminEntity);
      const created = { id: 1, role: AdminRole.ADMIN } as AdminEntity;
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.createAdmin({
        email: 'admin@example.com',
        password: 'secret123',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: AdminRole.ADMIN, password: 'hashed' }),
      );
      expect(result.role).toBe(AdminRole.ADMIN);
    });
  });

  describe('update', () => {
    it('throws AdminNotFoundException when the admin does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(1, { name: 'New' })).rejects.toThrow(
        AdminNotFoundException,
      );
    });

    it('updates and saves the admin', async () => {
      const admin = {
        id: 1,
        email: 'old@example.com',
        name: 'Old',
      } as AdminEntity;
      repository.findOne.mockResolvedValue(admin);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AdminEntity),
      );

      const result = await service.update(1, { name: 'New' });

      expect(result.name).toBe('New');
    });
  });

  describe('changePassword', () => {
    it('throws AdminNotFoundException when the admin does not exist', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.changePassword(1, {
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toThrow(AdminNotFoundException);
    });

    it('throws AdminIncorrectCurrentPasswordException when the current password is wrong', async () => {
      queryBuilder.getOne.mockResolvedValue({
        id: 1,
        password: 'hashed-old',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, {
          currentPassword: 'WrongPass123!',
          newPassword: 'NewPass456!',
        }),
      ).rejects.toThrow(AdminIncorrectCurrentPasswordException);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'WrongPass123!',
        'hashed-old',
      );
    });

    it('hashes and saves the new password when the current password matches', async () => {
      const admin = { id: 1, password: 'hashed-old' } as AdminEntity;
      queryBuilder.getOne.mockResolvedValue(admin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new');
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as AdminEntity),
      );

      await service.changePassword(1, {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456!', 10);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-new' }),
      );
    });
  });

  describe('remove', () => {
    it('throws AdminCannotDeleteSelfException when deleting your own account', async () => {
      await expect(service.remove(1, 1)).rejects.toThrow(
        AdminCannotDeleteSelfException,
      );
    });

    it('throws AdminNotFoundException when the target admin does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(2, 1)).rejects.toThrow(
        AdminNotFoundException,
      );
    });

    it('deletes the admin when found and not self', async () => {
      repository.findOne.mockResolvedValue({ id: 2 } as AdminEntity);

      await service.remove(2, 1);

      expect(repository.delete).toHaveBeenCalledWith(2);
    });
  });
});
