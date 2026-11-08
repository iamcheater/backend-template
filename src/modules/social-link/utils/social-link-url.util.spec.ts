import { SocialPlatform } from '../enums';
import { isUrlForPlatform } from './social-link-url.util';

describe('isUrlForPlatform', () => {
  it.each([
    [SocialPlatform.FACEBOOK, 'https://facebook.com/jeenj'],
    [SocialPlatform.FACEBOOK, 'https://www.facebook.com/jeenj'],
    [SocialPlatform.FACEBOOK, 'https://fb.me/jeenj'],
    [SocialPlatform.INSTAGRAM, 'https://instagram.com/jeenj'],
    [SocialPlatform.YOUTUBE, 'https://youtu.be/abc'],
    [SocialPlatform.YOUTUBE, 'https://m.youtube.com/@jeenj'],
    [SocialPlatform.X, 'https://twitter.com/jeenj'],
    [SocialPlatform.WHATSAPP, 'https://wa.me/37455123456'],
    [SocialPlatform.WHATSAPP, 'https://chat.whatsapp.com/abc'],
    [SocialPlatform.TELEGRAM, 'https://t.me/jeenj'],
    [SocialPlatform.MESSENGER, 'https://m.me/jeenj'],
    [SocialPlatform.VIBER, 'https://invite.viber.com/?g2=AQBexample'],
    [SocialPlatform.VIBER, 'viber://chat?number=%2B37455123456'],
    [SocialPlatform.VIBER, 'viber://pa?chatURI=jeenj'],
  ])('accepts %s link %s', (platform, url) => {
    expect(isUrlForPlatform(platform, url)).toBe(true);
  });

  it.each([
    [SocialPlatform.FACEBOOK, 'facebook.com/jeenj'],
    [SocialPlatform.FACEBOOK, 'http://facebook.com/jeenj'],
    [SocialPlatform.FACEBOOK, 'https://youtube.com/@jeenj'],
    [SocialPlatform.FACEBOOK, 'https://notfacebook.com/jeenj'],
    [SocialPlatform.FACEBOOK, 'https://facebook.com.evil.am/jeenj'],
    [SocialPlatform.FACEBOOK, 'viber://chat?number=%2B37455123456'],
    [SocialPlatform.TELEGRAM, 'tg://resolve?domain=jeenj'],
    [SocialPlatform.VIBER, 'viber://chat?number=abc'],
    [SocialPlatform.VIBER, 'https://facebook.com/jeenj'],
  ])('rejects %s link %s', (platform, url) => {
    expect(isUrlForPlatform(platform, url)).toBe(false);
  });
});
