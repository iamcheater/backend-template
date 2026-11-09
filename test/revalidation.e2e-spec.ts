import { INestApplication, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { ContentChangedEvent, EventName } from 'src/common/events';
import { overrideEnv, waitFor } from './helpers';

describe('Website revalidation (e2e)', () => {
  let app: INestApplication;
  let eventEmitter: EventEmitter2;
  let restoreEnv: () => void;
  let fetchMock: jest.SpyInstance;

  const secret = 'e2e-revalidate-secret-of-32-chars!';

  beforeAll(async () => {
    restoreEnv = overrideEnv({
      WEBSITE_URL: 'https://website.example.com/',
      WEBSITE_REVALIDATE_SECRET: secret,
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    eventEmitter = app.get(EventEmitter2);
  });

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    restoreEnv();
  });

  it('posts the changed tag to the website when ContentChangedEvent is emitted', async () => {
    eventEmitter.emit(
      EventName.CONTENT_CHANGED,
      new ContentChangedEvent('services'),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://website.example.com/api/revalidate',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ tags: ['services'] }),
      }),
    );
  });

  it('handles the event outside the emitter, so emitting never waits on the website', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));

    const delivered = eventEmitter.emit(
      EventName.CONTENT_CHANGED,
      new ContentChangedEvent('services'),
    );

    expect(delivered).toBe(true);
  });

  it('logs a website error without throwing into the emitter', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      eventEmitter.emitAsync(
        EventName.CONTENT_CHANGED,
        new ContentChangedEvent('site-settings'),
      ),
    ).resolves.toBeDefined();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Website revalidation failed with status 503 for tags: site-settings',
    );
  });

  it('logs an unreachable website without throwing into the emitter', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      eventEmitter.emitAsync(
        EventName.CONTENT_CHANGED,
        new ContentChangedEvent('site-settings'),
      ),
    ).resolves.toBeDefined();
    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
