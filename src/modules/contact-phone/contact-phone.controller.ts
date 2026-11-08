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
import { CreateContactPhoneDto, UpdateContactPhoneDto } from './dtos';
import { ContactPhoneEntity } from './entities';
import { ContactPhoneService } from './contact-phone.service';

@ApiTags('contact-phone')
@Controller('contact-phones')
export class ContactPhoneController {
  constructor(private readonly contactPhoneService: ContactPhoneService) {}

  @Public()
  @Get('active')
  findAllActive(): Promise<ContactPhoneEntity[]> {
    return this.contactPhoneService.findAllActive();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateContactPhoneDto): Promise<ContactPhoneEntity> {
    return this.contactPhoneService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<ContactPhoneEntity[]> {
    return this.contactPhoneService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactPhoneDto,
  ): Promise<ContactPhoneEntity> {
    return this.contactPhoneService.update(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contactPhoneService.remove(id);
  }
}
