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
import { CreateHowItWorksStepDto, UpdateHowItWorksStepDto } from './dtos';
import { HowItWorksStepEntity } from './entities';
import { HowItWorksStepService } from './how-it-works-step.service';

@ApiTags('how-it-works')
@Controller('how-it-works/steps')
export class HowItWorksStepController {
  constructor(private readonly howItWorksStepService: HowItWorksStepService) {}

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() dto: CreateHowItWorksStepDto): Promise<HowItWorksStepEntity> {
    return this.howItWorksStepService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(): Promise<HowItWorksStepEntity[]> {
    return this.howItWorksStepService.findAll();
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHowItWorksStepDto,
  ): Promise<HowItWorksStepEntity> {
    return this.howItWorksStepService.update(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.howItWorksStepService.remove(id);
  }
}
