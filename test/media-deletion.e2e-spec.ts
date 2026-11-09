import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { runInTransaction } from 'typeorm-transactional';
import { AppModule } from 'src/app.module';
import { MediaAssetEntity } from 'src/core/media/entities';
import { MediaStatus, MediaType } from 'src/core/media/enums';
import { MediaService } from 'src/core/media/media.service';
import { S3Service } from 'src/core/media/s3.service';
import { flushAsyncWork, waitFor } from './helpers';

describe('Media deletion (e2e)', () => {
  let app: INestApplication;
  let repository: Repository<MediaAssetEntity>;
  let mediaService: MediaService;
  const s3Service = { deleteObject: jest.fn<Promise<void>, [string]>() };

  const createImage = (name: string) =>
    repository.save(
      repository.create({
        type: MediaType.IMAGE,
        status: MediaStatus.READY,
        key: `example-image/${name}.jpg`,
        variants: {
          thumbnail: `example-image/${name}-thumbnail.webp`,
          medium: `example-image/${name}-medium.webp`,
          full: `example-image/${name}-full.webp`,
        },
      }),
    );

  const createVideo = (name: string) =>
    repository.save(
      repository.create({
        type: MediaType.VIDEO,
        status: MediaStatus.READY,
        key: `example-video/${name}.mp4`,
        variants: null,
      }),
    );

  const deletedKeys = () =>
    s3Service.deleteObject.mock.calls.map(([key]) => key).sort();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Service)
      .useValue(s3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    repository = app.get(getRepositoryToken(MediaAssetEntity));
    mediaService = app.get(MediaService);
  });

  beforeEach(() => {
    s3Service.deleteObject.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await repository
      .createQueryBuilder()
      .delete()
      .where('key LIKE :prefix', { prefix: 'example-%' })
      .execute();
    await app.close();
  });

  it('deletes the rows, then every file in S3 including image variants', async () => {
    const image = await createImage('deleted');
    const video = await createVideo('deleted');

    await mediaService.deleteAssets([image, video]);

    await expect(
      repository.findBy({ id: In([image.id, video.id]) }),
    ).resolves.toEqual([]);
    await waitFor(() =>
      expect(s3Service.deleteObject).toHaveBeenCalledTimes(5),
    );
    expect(deletedKeys()).toEqual(
      [
        'example-image/deleted.jpg',
        'example-image/deleted-thumbnail.webp',
        'example-image/deleted-medium.webp',
        'example-image/deleted-full.webp',
        'example-video/deleted.mp4',
      ].sort(),
    );
  });

  it('leaves S3 untouched and the row in place when the surrounding transaction rolls back', async () => {
    const image = await createImage('rolled-back');

    await expect(
      runInTransaction(async () => {
        await mediaService.deleteAssets([image]);
        throw new Error('a later write in the same transaction failed');
      }),
    ).rejects.toThrow('a later write in the same transaction failed');

    await flushAsyncWork();
    expect(s3Service.deleteObject).not.toHaveBeenCalled();
    await expect(
      repository.findOneBy({ id: image.id }),
    ).resolves.not.toBeNull();
  });

  it('waits for the surrounding transaction to commit before deleting from S3', async () => {
    const video = await createVideo('outer-commit');

    await runInTransaction(async () => {
      await mediaService.deleteAssets([video]);
      await flushAsyncWork();

      expect(s3Service.deleteObject).not.toHaveBeenCalled();
    });

    await waitFor(() =>
      expect(s3Service.deleteObject).toHaveBeenCalledWith(
        'example-video/outer-commit.mp4',
      ),
    );
    await expect(repository.findOneBy({ id: video.id })).resolves.toBeNull();
  });

  it('logs a failed S3 delete without failing the caller, keeping the database delete', async () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    s3Service.deleteObject.mockRejectedValue(new Error('S3 unavailable'));
    const video = await createVideo('s3-down');

    await expect(mediaService.deleteAssets([video])).resolves.toBeUndefined();

    await expect(repository.findOneBy({ id: video.id })).resolves.toBeNull();
    await waitFor(() =>
      expect(errorLog).toHaveBeenCalledWith(
        'Failed to delete S3 object example-video/s3-down.mp4',
        expect.any(String),
      ),
    );
  });
});
