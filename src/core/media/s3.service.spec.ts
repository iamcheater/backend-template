import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3Service', () => {
  let service: S3Service;
  let sendMock: jest.Mock;

  beforeEach(async () => {
    sendMock = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({ send: sendMock }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const values: Record<string, string> = {
                'aws.region': 'eu-north-1',
                'aws.accessKeyId': 'test-key',
                'aws.secretAccessKey': 'test-secret',
                'aws.bucket': 'test-bucket',
              };
              return values[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('presignPutUrl', () => {
    it('generates a presigned PUT URL scoped to the bucket/key/contentType', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-put-url');

      const url = await service.presignPutUrl(
        'example-image/1.jpg',
        'image/jpeg',
      );

      expect(url).toBe('https://signed-put-url');
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'example-image/1.jpg',
        ContentType: 'image/jpeg',
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(PutObjectCommand),
        { expiresIn: 300 },
      );
    });
  });

  describe('publicUrl', () => {
    it('builds a permanent URL from the bucket and region by default', () => {
      expect(service.publicUrl('example-image/abc.webp')).toBe(
        'https://test-bucket.s3.eu-north-1.amazonaws.com/example-image/abc.webp',
      );
    });

    it('uses the configured public base URL without a trailing slash', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) =>
                ({
                  'aws.region': 'eu-north-1',
                  'aws.bucket': 'test-bucket',
                  'media.publicBaseUrl': 'https://media.example.com/',
                })[key],
            },
          },
        ],
      }).compile();

      expect(module.get(S3Service).publicUrl('example-image/abc.webp')).toBe(
        'https://media.example.com/example-image/abc.webp',
      );
    });
  });

  describe('getObjectBuffer', () => {
    it('returns the object body as a Buffer', async () => {
      sendMock.mockResolvedValue({
        Body: {
          transformToByteArray: jest
            .fn()
            .mockResolvedValue(new Uint8Array([1, 2, 3])),
        },
      });

      const buffer = await service.getObjectBuffer('example-image/1.jpg');

      expect(buffer).toEqual(Buffer.from([1, 2, 3]));
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'example-image/1.jpg',
      });
    });
  });

  describe('putObject', () => {
    it('sends a PutObjectCommand with the given body/content type', async () => {
      sendMock.mockResolvedValue({});

      await service.putObject(
        'example-image/1.jpg',
        Buffer.from('data'),
        'image/jpeg',
      );

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'example-image/1.jpg',
        Body: Buffer.from('data'),
        ContentType: 'image/jpeg',
      });
      expect(sendMock).toHaveBeenCalled();
    });
  });

  describe('deleteObject', () => {
    it('sends a DeleteObjectCommand for the given key', async () => {
      sendMock.mockResolvedValue({});

      await service.deleteObject('example-image/1.jpg');

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'example-image/1.jpg',
      });
      expect(sendMock).toHaveBeenCalled();
    });
  });
});
