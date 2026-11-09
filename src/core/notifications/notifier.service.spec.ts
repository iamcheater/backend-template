import { Logger } from '@nestjs/common';
import { Notification, NotificationChannel } from './interfaces';
import { NotifierService } from './notifier.service';

describe('NotifierService', () => {
  const notification: Notification = { title: 'New submission' };

  const channel = (
    name: string,
    send: jest.Mock = jest.fn().mockResolvedValue(undefined),
  ): NotificationChannel & { send: jest.Mock } => ({ name, send });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the notification through every channel', async () => {
    const first = channel('first');
    const second = channel('second');

    await new NotifierService([first, second]).notify(notification);

    expect(first.send).toHaveBeenCalledWith(notification);
    expect(second.send).toHaveBeenCalledWith(notification);
  });

  it('never rejects when a channel fails, and still sends through the others', async () => {
    const failing = channel(
      'failing',
      jest.fn().mockRejectedValue(new Error('down')),
    );
    const working = channel('working');

    await expect(
      new NotifierService([failing, working]).notify(notification),
    ).resolves.toBeUndefined();

    expect(working.send).toHaveBeenCalledWith(notification);
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'Notification channel "failing" failed',
      expect.any(String),
    );
  });
});
