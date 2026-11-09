import { Notification } from './notification.interface';

export interface NotificationChannel {
  readonly name: string;
  send(notification: Notification): Promise<void>;
}
