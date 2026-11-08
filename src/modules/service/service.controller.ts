import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequestLanguage } from 'src/common/decorators';
import { SupportedLanguage } from 'src/localization/supported-language.enum';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { CreateServiceDto, ServiceResponseDto, UpdateServiceDto } from './dtos';
import { ServiceEntity } from './entities';
import { ServiceService } from './service.service';

@ApiTags('service')
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Public()
  @Get('active')
  findAllActive(
    @RequestLanguage() language: SupportedLanguage,
  ): Promise<ServiceResponseDto[]> {
    return this.serviceService.findAllActive(language);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateServiceDto): Promise<ServiceEntity> {
    return this.serviceService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<ServiceEntity[]> {
    return this.serviceService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ServiceEntity> {
    return this.serviceService.findById(id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceEntity> {
    return this.serviceService.update(id, dto);
  }
}
