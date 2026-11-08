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
import { PageDto } from 'src/common/dtos';
import { Public, SubmissionThrottle } from 'src/common/decorators';
import { AdminJwtAuthGuard, RolesGuard } from 'src/modules/admin/guards';
import { AssignCleanerDto, CreateQuoteDto, QuotePageOptionsDto } from './dtos';
import { QuoteEntity } from './entities';
import { QuoteService } from './quote.service';

@ApiTags('quote')
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Public()
  @SubmissionThrottle()
  @Post()
  create(@Body() dto: CreateQuoteDto): Promise<void> {
    return this.quoteService.create(dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get()
  findAll(
    @Query() pageOptionsDto: QuotePageOptionsDto,
  ): Promise<PageDto<QuoteEntity>> {
    return this.quoteService.findAll(pageOptionsDto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<QuoteEntity> {
    return this.quoteService.findById(id);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Patch(':id/assign-cleaner')
  assignCleaner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCleanerDto,
  ): Promise<QuoteEntity> {
    return this.quoteService.assignCleaner(id, dto);
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Delete(':id/assign-cleaner')
  unassignCleaner(@Param('id', ParseIntPipe) id: number): Promise<QuoteEntity> {
    return this.quoteService.unassignCleaner(id);
  }
}
