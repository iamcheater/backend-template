export interface NotificationField {
  label: string;
  value: string;
}

export interface Notification {
  title: string;
  fields?: NotificationField[];
  adminPath?: string;
}
