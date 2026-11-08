import { Test, TestingModule } from '@nestjs/testing';
import { PageDto, PageMetaDto } from 'src/common/dtos';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthResponseDto, AdminPageOptionsDto } from './dtos';
import { AdminEntity } from './entities';
import { AdminRole } from './enums';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {
            login: jest.fn(),
            createAdmin: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            changePassword: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AdminController);
    service = module.get(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('delegates to the service and returns its result', async () => {
      const response = new AdminAuthResponseDto('token');
      service.login.mockResolvedValue(response);

      const dto = { email: 'admin@jeenj.com', password: 'secret' };
      await expect(controller.login(dto)).resolves.toBe(response);
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('getProfile', () => {
    it('returns the authenticated admin from the request', () => {
      const admin = {
        id: 1,
        email: 'admin@jeenj.com',
        role: AdminRole.ADMIN,
      } as AdminEntity;

      expect(controller.getProfile(admin)).toBe(admin);
    });
  });

  describe('create', () => {
    it('delegates to adminService.createAdmin', async () => {
      const created = { id: 2, role: AdminRole.ADMIN } as AdminEntity;
      service.createAdmin.mockResolvedValue(created);

      const dto = { email: 'new-admin@jeenj.com', password: 'secret123' };
      await expect(controller.create(dto)).resolves.toBe(created);
      expect(service.createAdmin).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('delegates to adminService.findAll with the page options', async () => {
      const admins = [{ id: 1 }] as AdminEntity[];
      const pageOptionsDto = new AdminPageOptionsDto();
      const page = new PageDto(
        admins,
        new PageMetaDto({ pageOptionsDto, itemCount: 1 }),
      );
      service.findAll.mockResolvedValue(page);

      await expect(controller.findAll(pageOptionsDto)).resolves.toBe(page);
      expect(service.findAll).toHaveBeenCalledWith(pageOptionsDto);
    });
  });

  describe('findOne', () => {
    it('delegates to adminService.findById', async () => {
      const admin = { id: 1 } as AdminEntity;
      service.findById.mockResolvedValue(admin);

      await expect(controller.findOne(1)).resolves.toBe(admin);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('delegates to adminService.update with the authenticated admin id', async () => {
      const currentAdmin = { id: 1 } as AdminEntity;
      const updated = { id: 1, name: 'New' } as AdminEntity;
      service.update.mockResolvedValue(updated);

      const dto = { name: 'New' };
      await expect(controller.updateProfile(currentAdmin, dto)).resolves.toBe(
        updated,
      );
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('changePassword', () => {
    it('delegates to adminService.changePassword with the authenticated admin id', async () => {
      const currentAdmin = { id: 1 } as AdminEntity;
      service.changePassword.mockResolvedValue(undefined);

      const dto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      };
      await controller.changePassword(currentAdmin, dto);

      expect(service.changePassword).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('delegates to adminService.remove with the current admin id', async () => {
      const currentAdmin = { id: 1 } as AdminEntity;
      service.remove.mockResolvedValue(undefined);

      await controller.remove(2, currentAdmin);

      expect(service.remove).toHaveBeenCalledWith(2, 1);
    });
  });
});
