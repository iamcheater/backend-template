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
import {
  CreateHeroSlideDto,
  HeroSlideResponseDto,
  UpdateHeroSlideDto,
} from './dtos';
import { HeroSlideEntity } from './entities';
import { HeroSectionService } from './hero-section.service';

@ApiTags('hero-section')
@Controller('hero-slides')
export class HeroSectionController {
  constructor(private readonly heroSectionService: HeroSectionService) {}

  @Public()
  @Get('active')
  findAllPublic(): Promise<HeroSlideResponseDto[]> {
    return this.heroSectionService.findAllPublic();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateHeroSlideDto): Promise<HeroSlideEntity> {
    return this.heroSectionService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<HeroSlideEntity[]> {
    return this.heroSectionService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHeroSlideDto,
  ): Promise<HeroSlideEntity> {
    return this.heroSectionService.update(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.heroSectionService.remove(id);
  }
}
