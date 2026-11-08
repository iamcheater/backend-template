import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PageDto, PageMetaDto } from 'src/common/dtos';
import {
  AdminLoginDto,
  AdminAuthResponseDto,
  AdminPageOptionsDto,
  ChangeAdminPasswordDto,
  CreateAdminDto,
  UpdateAdminDto,
} from './dtos';
import { AdminEntity } from './entities';
import { AdminRole } from './enums';
import {
  AdminCannotDeleteSelfException,
  AdminEmailAlreadyExistsException,
  AdminIncorrectCurrentPasswordException,
  AdminInvalidCredentialsException,
  AdminNotFoundException,
} from './exceptions';
import { AdminJwtPayload } from './interfaces';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(
    pageOptionsDto: AdminPageOptionsDto,
  ): Promise<PageDto<AdminEntity>> {
    const [admins, itemCount] = await this.adminRepository.findAndCount({
      order: { createdAt: pageOptionsDto.order },
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
    });

    const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(admins, pageMetaDto);
  }

  findByEmail(email: string): Promise<AdminEntity | null> {
    return this.adminRepository.findOne({ where: { email } });
  }

  hasAdminWithRole(role: AdminRole): Promise<boolean> {
    return this.adminRepository.exists({ where: { role } });
  }

  findByEmailWithPassword(email: string): Promise<AdminEntity | null> {
    return this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.email = :email', { email })
      .getOne();
  }

  async findByIdWithPassword(id: number): Promise<AdminEntity> {
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.id = :id', { id })
      .getOne();

    if (!admin) {
      throw new AdminNotFoundException();
    }

    return admin;
  }

  async findById(id: number): Promise<AdminEntity> {
    const admin = await this.adminRepository.findOne({ where: { id } });

    if (!admin) {
      throw new AdminNotFoundException();
    }

    return admin;
  }

  create(
    data: Pick<AdminEntity, 'email' | 'password' | 'role'> &
      Partial<AdminEntity>,
  ): Promise<AdminEntity> {
    const admin = this.adminRepository.create(data);
    return this.adminRepository.save(admin);
  }

  async createAdmin(dto: CreateAdminDto): Promise<AdminEntity> {
    const existing = await this.findByEmail(dto.email);

    if (existing) {
      throw new AdminEmailAlreadyExistsException();
    }

    const created = await this.create({
      email: dto.email,
      password: await bcrypt.hash(dto.password, 10),
      role: AdminRole.ADMIN,
      name: dto.name,
    });

    return this.findById(created.id);
  }

  async update(id: number, dto: UpdateAdminDto): Promise<AdminEntity> {
    const admin = await this.findById(id);

    Object.assign(admin, dto);

    return this.adminRepository.save(admin);
  }

  async changePassword(id: number, dto: ChangeAdminPasswordDto): Promise<void> {
    const admin = await this.findByIdWithPassword(id);
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      admin.password,
    );

    if (!isCurrentPasswordValid) {
      throw new AdminIncorrectCurrentPasswordException();
    }

    admin.password = await bcrypt.hash(dto.newPassword, 10);
    await this.adminRepository.save(admin);
  }

  async remove(id: number, currentAdminId: number): Promise<void> {
    if (id === currentAdminId) {
      throw new AdminCannotDeleteSelfException();
    }

    await this.findById(id);
    await this.adminRepository.delete(id);
  }

  async login(dto: AdminLoginDto): Promise<AdminAuthResponseDto> {
    const admin = await this.findByEmailWithPassword(dto.email);

    if (!admin || !(await bcrypt.compare(dto.password, admin.password))) {
      throw new AdminInvalidCredentialsException();
    }

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    return new AdminAuthResponseDto(this.jwtService.sign(payload));
  }
}
