import { SocialPlatform } from '../enums';

export const SOCIAL_PLATFORM_HOSTS: Record<SocialPlatform, string[]> = {
  [SocialPlatform.FACEBOOK]: ['facebook.com', 'fb.com', 'fb.me'],
  [SocialPlatform.INSTAGRAM]: ['instagram.com', 'instagr.am'],
  [SocialPlatform.YOUTUBE]: ['youtube.com', 'youtu.be'],
  [SocialPlatform.TIKTOK]: ['tiktok.com'],
  [SocialPlatform.X]: ['x.com', 'twitter.com'],
  [SocialPlatform.LINKEDIN]: ['linkedin.com'],
  [SocialPlatform.PINTEREST]: ['pinterest.com', 'pin.it'],
  [SocialPlatform.SNAPCHAT]: ['snapchat.com'],
  [SocialPlatform.WHATSAPP]: ['wa.me', 'whatsapp.com'],
  [SocialPlatform.TELEGRAM]: ['t.me', 'telegram.me'],
  [SocialPlatform.VIBER]: ['viber.com', 'vb.me'],
  [SocialPlatform.MESSENGER]: ['m.me', 'messenger.com'],
};
