import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { CreateContactEmailDto, UpdateContactEmailDto } from './dtos';
import { ContactEmailEntity } from './entities';
import { ContactEmailService } from './contact-email.service';

@ApiTags('contact-email')
@Controller('contact-emails')
export class ContactEmailController {
  constructor(private readonly contactEmailService: ContactEmailService) {}

  @Public()
  @Get('active')
  findAllActive(): Promise<ContactEmailEntity[]> {
    return this.contactEmailService.findAllActive();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateContactEmailDto): Promise<ContactEmailEntity> {
    return this.contactEmailService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<ContactEmailEntity[]> {
    return this.contactEmailService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactEmailDto,
  ): Promise<ContactEmailEntity> {
    return this.contactEmailService.update(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contactEmailService.remove(id);
  }
}
