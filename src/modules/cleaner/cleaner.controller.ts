import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageDto } from 'src/common/dtos';
import { Public } from 'src/common/decorators';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { CleanerService } from './cleaner.service';
import { CleanerPageOptionsDto, UpdateCleanerStatusDto } from './dtos';
import { CleanerEntity } from './entities';

@ApiTags('cleaner')
@Controller('cleaner')
export class CleanerController {
  constructor(private readonly cleanerService: CleanerService) {}

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(
    @Query() pageOptionsDto: CleanerPageOptionsDto,
  ): Promise<PageDto<CleanerEntity>> {
    return this.cleanerService.findAll(pageOptionsDto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CleanerEntity> {
    return this.cleanerService.findById(id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleanerStatusDto,
  ): Promise<CleanerEntity> {
    return this.cleanerService.updateStatus(id, dto.status);
  }
}
