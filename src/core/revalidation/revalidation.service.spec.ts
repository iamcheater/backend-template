import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RevalidationService } from './revalidation.service';

describe('RevalidationService', () => {
  let fetchMock: jest.SpyInstance;

  const buildService = (config: Record<string, string | undefined>) =>
    new RevalidationService({
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService);

  const configured = {
    'website.url': 'https://example.com/',
    'website.revalidateSecret': 'a'.repeat(32),
  };

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the tags to the website revalidate route with the secret header', async () => {
    await buildService(configured).revalidate(['services']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/api/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': 'a'.repeat(32),
        },
        body: JSON.stringify({ tags: ['services'] }),
      }),
    );
  });

  it('skips with a warning when the website is not configured', async () => {
    await buildService({}).revalidate(['services']);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });

  it('does nothing for an empty tag list', async () => {
    await buildService(configured).revalidate([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs a non-2xx response without throwing', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      buildService(configured).revalidate(['services']),
    ).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('logs a network error without throwing', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      buildService(configured).revalidate(['services']),
    ).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
