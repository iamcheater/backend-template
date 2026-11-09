import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { DbHealthResponseDto, HealthResponseDto } from './dtos';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check(): HealthResponseDto {
    return this.healthService.check();
  }

  @Public()
  @Get('db')
  checkDb(): Promise<DbHealthResponseDto> {
    return this.healthService.checkDb();
  }
}
