import { isURL } from 'class-validator';
import { SocialPlatform } from '../enums';
import { SOCIAL_PLATFORM_HOSTS } from './social-platform-hosts';

const VIBER_DEEP_LINK_PATTERN =
  /^viber:\/\/(chat\/?\?number=(%2B|\+)?\d{7,15}|pa\?chatURI=[\w.-]+)$/;

export const isViberDeepLink = (value: string): boolean =>
  VIBER_DEEP_LINK_PATTERN.test(value);

export const isHttpsUrl = (value: string): boolean =>
  isURL(value, { require_protocol: true, protocols: ['https'] });

export const isUrlForPlatform = (
  platform: SocialPlatform,
  url: string,
): boolean => {
  if (platform === SocialPlatform.VIBER && isViberDeepLink(url)) {
    return true;
  }

  if (!isHttpsUrl(url)) {
    return false;
  }

  const hostname = new URL(url).hostname.toLowerCase();

  return SOCIAL_PLATFORM_HOSTS[platform].some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
};
