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
import { CleanerExpectationService } from './cleaner-expectation.service';
import {
  CreateCleanerExpectationDto,
  UpdateCleanerExpectationDto,
} from './dtos';
import { CleanerExpectationEntity } from './entities';

@ApiTags('for-cleaners')
@Controller('for-cleaners/expectations')
export class CleanerExpectationController {
  constructor(
    private readonly cleanerExpectationService: CleanerExpectationService,
  ) {}

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(
    @Body() dto: CreateCleanerExpectationDto,
  ): Promise<CleanerExpectationEntity> {
    return this.cleanerExpectationService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<CleanerExpectationEntity[]> {
    return this.cleanerExpectationService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCleanerExpectationDto,
  ): Promise<CleanerExpectationEntity> {
    return this.cleanerExpectationService.update(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.cleanerExpectationService.remove(id);
  }
}
