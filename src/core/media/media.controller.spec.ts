import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { UploadPurpose } from './enums';

describe('MediaController', () => {
  let controller: MediaController;
  let service: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: { createPresignedUpload: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(MediaController);
    service = module.get(MediaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('presign', () => {
    it('delegates to the service and returns its result', async () => {
      const dto = {
        purpose: UploadPurpose.EXAMPLE_IMAGE,
        contentType: 'image/webp',
        fileSize: 1024,
      };
      const result = {
        key: 'example-image/abc.webp',
        uploadUrl: 'https://signed-url',
        expiresAt: new Date(),
      };
      service.createPresignedUpload.mockResolvedValue(result);

      await expect(controller.presign(dto)).resolves.toBe(result);
      expect(service.createPresignedUpload).toHaveBeenCalledWith(dto);
    });
  });
});
