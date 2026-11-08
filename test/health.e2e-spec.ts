import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok status without requiring auth', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
      },
    });
    expect(typeof response.body.data.uptime).toBe('number');
    expect(typeof response.body.data.timestamp).toBe('string');
  });

  it('GET /health/db returns ok status without requiring auth', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/db')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
      },
    });
    expect(typeof response.body.data.timestamp).toBe('string');
  });
});
