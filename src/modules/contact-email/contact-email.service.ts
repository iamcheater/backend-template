import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateContactEmailDto, UpdateContactEmailDto } from './dtos';
import { ContactEmailEntity } from './entities';
import {
  ContactEmailAlreadyExistsException,
  ContactEmailNotFoundException,
} from './exceptions';

@Injectable()
export class ContactEmailService {
  constructor(
    @InjectRepository(ContactEmailEntity)
    private readonly contactEmailRepository: Repository<ContactEmailEntity>,
  ) {}

  async create(dto: CreateContactEmailDto): Promise<ContactEmailEntity> {
    const existing = await this.contactEmailRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ContactEmailAlreadyExistsException();
    }

    const contactEmail = this.contactEmailRepository.create(dto);
    return this.contactEmailRepository.save(contactEmail);
  }

  findAll(): Promise<ContactEmailEntity[]> {
    return this.contactEmailRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  findAllActive(): Promise<ContactEmailEntity[]> {
    return this.contactEmailRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: number): Promise<ContactEmailEntity> {
    const contactEmail = await this.contactEmailRepository.findOne({
      where: { id },
    });

    if (!contactEmail) {
      throw new ContactEmailNotFoundException();
    }

    return contactEmail;
  }

  async update(
    id: number,
    dto: UpdateContactEmailDto,
  ): Promise<ContactEmailEntity> {
    const contactEmail = await this.findById(id);

    if (dto.email && dto.email !== contactEmail.email) {
      const existing = await this.contactEmailRepository.findOne({
        where: { email: dto.email, id: Not(id) },
      });

      if (existing) {
        throw new ContactEmailAlreadyExistsException();
      }
    }

    Object.assign(contactEmail, dto);
    return this.contactEmailRepository.save(contactEmail);
  }

  async remove(id: number): Promise<void> {
    const contactEmail = await this.findById(id);
    await this.contactEmailRepository.delete(contactEmail.id);
  }
}
