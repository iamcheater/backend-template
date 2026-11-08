import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateContactPhoneDto, UpdateContactPhoneDto } from './dtos';
import { ContactPhoneEntity } from './entities';
import {
  ContactPhoneAlreadyExistsException,
  ContactPhoneNotFoundException,
} from './exceptions';

@Injectable()
export class ContactPhoneService {
  constructor(
    @InjectRepository(ContactPhoneEntity)
    private readonly contactPhoneRepository: Repository<ContactPhoneEntity>,
  ) {}

  async create(dto: CreateContactPhoneDto): Promise<ContactPhoneEntity> {
    const existing = await this.contactPhoneRepository.findOne({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ContactPhoneAlreadyExistsException();
    }

    const contactPhone = this.contactPhoneRepository.create(dto);
    return this.contactPhoneRepository.save(contactPhone);
  }

  findAll(): Promise<ContactPhoneEntity[]> {
    return this.contactPhoneRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  findAllActive(): Promise<ContactPhoneEntity[]> {
    return this.contactPhoneRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: number): Promise<ContactPhoneEntity> {
    const contactPhone = await this.contactPhoneRepository.findOne({
      where: { id },
    });

    if (!contactPhone) {
      throw new ContactPhoneNotFoundException();
    }

    return contactPhone;
  }

  async update(
    id: number,
    dto: UpdateContactPhoneDto,
  ): Promise<ContactPhoneEntity> {
    const contactPhone = await this.findById(id);

    if (dto.phone && dto.phone !== contactPhone.phone) {
      const existing = await this.contactPhoneRepository.findOne({
        where: { phone: dto.phone, id: Not(id) },
      });

      if (existing) {
        throw new ContactPhoneAlreadyExistsException();
      }
    }

    Object.assign(contactPhone, dto);
    return this.contactPhoneRepository.save(contactPhone);
  }

  async remove(id: number): Promise<void> {
    const contactPhone = await this.findById(id);
    await this.contactPhoneRepository.delete(contactPhone.id);
  }
}
