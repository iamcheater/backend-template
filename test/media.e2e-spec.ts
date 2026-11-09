import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AdminEntity } from 'src/core/admin/entities';
import { AdminRole } from 'src/core/admin/enums';
import { S3Service } from 'src/core/media/s3.service';

describe('Media (e2e)', () => {
  let app: INestApplication;
  let adminRepository: Repository<AdminEntity>;
  let adminToken: string;

  const adminEmail = 'e2e-media-admin@example.com';
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue({
        presignPutUrl: jest.fn().mockResolvedValue('https://signed-url'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    adminRepository = moduleFixture.get(getRepositoryToken(AdminEntity));

    await adminRepository.save(
      adminRepository.create({
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: AdminRole.ADMIN,
      }),
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/admin/login')
      .send({ email: adminEmail, password: adminPassword });
    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await adminRepository.delete({ email: adminEmail });
    await app.close();
  });

  describe('POST /uploads/presign (admin-guarded)', () => {
    const validPayload = {
      purpose: 'example-image',
      contentType: 'image/webp',
      fileSize: 1024,
    };

    it('rejects requests without a token', async () => {
      await request(app.getHttpServer())
        .post('/uploads/presign')
        .send(validPayload)
        .expect(401);
    });

    it('returns a presigned URL and a key scoped to the purpose', async () => {
      const response = await request(app.getHttpServer())
        .post('/uploads/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload)
        .expect(201);

      expect(response.body.data.uploadUrl).toBe('https://signed-url');
      expect(response.body.data.key).toMatch(/^example-image\/.+\.webp$/);
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('rejects an unknown purpose', async () => {
      await request(app.getHttpServer())
        .post('/uploads/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, purpose: 'not-a-real-purpose' })
        .expect(400);
    });

    it('rejects a content type not allowed for the purpose, naming the allowed formats', async () => {
      const response = await request(app.getHttpServer())
        .post('/uploads/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, contentType: 'video/mp4' })
        .expect(400);

      expect((response.body as { message: string }).message).toBe(
        "This file type isn't supported here. Allowed formats: JPG, PNG, WEBP.",
      );
    });

    it('rejects a file size over the configured MEDIA_MAX_IMAGE_SIZE_MB limit, naming the limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/uploads/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, fileSize: 100 * 1024 * 1024 })
        .expect(400);

      expect((response.body as { message: string }).message).toMatch(
        /^This file is too large\. The maximum size is \d+ MB\.$/,
      );
    });

    it('interpolates the upload limits into the requested language', async () => {
      const response = await request(app.getHttpServer())
        .post('/uploads/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-language', 'hy')
        .send({ ...validPayload, contentType: 'application/pdf' })
        .expect(400);

      expect((response.body as { message: string }).message).toBe(
        'Այս ֆայլի տեսակն այստեղ չի աջակցվում։ Թույլատրելի ձևաչափեր՝ JPG, PNG, WEBP։',
      );
    });

    it('rejects a missing required field', async () => {
      const { fileSize: _fileSize, ...withoutFileSize } = validPayload;
      await request(app.getHttpServer())
        .post('/uploads/presign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(withoutFileSize)
        .expect(400);
    });
  });
});
