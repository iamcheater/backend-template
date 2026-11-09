import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DbHealthResponseDto, HealthResponseDto } from './dtos';
import { DatabaseUnavailableException } from './exceptions';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  check(): HealthResponseDto {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async checkDb(): Promise<DbHealthResponseDto> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new DatabaseUnavailableException();
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
