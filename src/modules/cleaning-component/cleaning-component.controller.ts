import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { CleaningComponentService } from './cleaning-component.service';
import { CreateCleaningComponentDto, UpdateCleaningComponentDto } from './dtos';
import { CleaningComponentEntity } from './entities';

@ApiTags('cleaning-component')
@Controller('cleaning-components')
export class CleaningComponentController {
  constructor(
    private readonly cleaningComponentService: CleaningComponentService,
  ) {}

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(
    @Body() dto: CreateCleaningComponentDto,
  ): Promise<CleaningComponentEntity> {
    return this.cleaningComponentService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(
    @Query('search') search?: string,
  ): Promise<CleaningComponentEntity[]> {
    return this.cleaningComponentService.findAll(search);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CleaningComponentEntity> {
    return this.cleaningComponentService.findById(id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleaningComponentDto,
  ): Promise<CleaningComponentEntity> {
    return this.cleaningComponentService.update(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.cleaningComponentService.remove(id);
  }
}
