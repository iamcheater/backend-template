import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MediaAssetEntity } from './entities';
import { MediaStatus, MediaType } from './enums';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';

const commitCallbacks: (() => void)[] = [];

jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
  runOnTransactionCommit: (callback: () => void) =>
    commitCallbacks.push(callback),
}));

jest.mock('sharp', () => jest.fn());

describe('MediaService deletion', () => {
  let repository: { delete: jest.Mock };
  let s3Service: { deleteObject: jest.Mock<Promise<void>, [string]> };
  let service: MediaService;

  const image = Object.assign(new MediaAssetEntity(), {
    id: 7,
    type: MediaType.IMAGE,
    status: MediaStatus.READY,
    key: 'example-image/abc.jpg',
    variants: {
      thumbnail: 'example-image/abc-thumbnail.webp',
      medium: 'example-image/abc-medium.webp',
      full: 'example-image/abc-full.webp',
    },
  });

  const video = Object.assign(new MediaAssetEntity(), {
    id: 8,
    type: MediaType.VIDEO,
    status: MediaStatus.READY,
    key: 'example-video/clip.mp4',
    variants: null,
  });

  const runCommitCallbacks = async (): Promise<void> => {
    commitCallbacks.splice(0).forEach((callback) => callback());
    await new Promise((resolve) => setImmediate(resolve));
  };

  beforeEach(() => {
    commitCallbacks.length = 0;
    repository = { delete: jest.fn().mockResolvedValue(undefined) };
    s3Service = {
      deleteObject: jest
        .fn<Promise<void>, [string]>()
        .mockResolvedValue(undefined),
    };
    service = new MediaService(
      repository as unknown as Repository<MediaAssetEntity>,
      s3Service as unknown as S3Service,
      {} as ConfigService,
    );
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes the rows, then every stored file including variants once the transaction commits', async () => {
    await service.deleteAssets([image, video]);

    expect(repository.delete).toHaveBeenCalledWith([7, 8]);
    expect(s3Service.deleteObject).not.toHaveBeenCalled();

    await runCommitCallbacks();

    expect(s3Service.deleteObject.mock.calls.map(([key]) => key)).toEqual([
      'example-image/abc.jpg',
      'example-image/abc-thumbnail.webp',
      'example-image/abc-medium.webp',
      'example-image/abc-full.webp',
      'example-video/clip.mp4',
    ]);
  });

  it('touches nothing in S3 when the database delete fails', async () => {
    repository.delete.mockRejectedValue(new Error('db down'));

    await expect(service.deleteAssets([image])).rejects.toThrow('db down');
    await runCommitCallbacks();

    expect(s3Service.deleteObject).not.toHaveBeenCalled();
  });

  it('logs a failed S3 delete without throwing and still deletes the other files', async () => {
    s3Service.deleteObject.mockImplementation((key: string) =>
      key === 'example-image/abc.jpg'
        ? Promise.reject(new Error('S3 down'))
        : Promise.resolve(),
    );

    await expect(
      service.deleteStoredFiles(service.storedKeysOf(image)),
    ).resolves.toBeUndefined();

    expect(s3Service.deleteObject).toHaveBeenCalledTimes(4);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Failed to delete S3 object example-image/abc.jpg',
      expect.any(String),
    );
  });

  it('does nothing for an empty list', async () => {
    await service.deleteAssets([]);

    expect(repository.delete).not.toHaveBeenCalled();
    expect(commitCallbacks).toHaveLength(0);
  });
});
