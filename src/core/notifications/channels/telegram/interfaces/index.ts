export interface TelegramUrlButton {
  type: 'url';
  text: string;
  url: string;
}

export interface TelegramCopyButton {
  type: 'copy';
  text: string;
  copyText: string;
}

export type TelegramInlineButton = TelegramUrlButton | TelegramCopyButton;
