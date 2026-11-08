import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, SubmissionThrottle } from 'src/common/decorators';
import { CleanerService } from './cleaner.service';
import { CreateCleanerDto } from './dtos';

@ApiTags('cleaner')
@Controller('cleaner-application')
export class CleanerApplicationController {
  constructor(private readonly cleanerService: CleanerService) {}

  @Public()
  @SubmissionThrottle()
  @Post()
  create(@Body() dto: CreateCleanerDto): Promise<void> {
    return this.cleanerService.create(dto);
  }
}
