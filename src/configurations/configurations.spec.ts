import { adminAuthConfig, languageConfig, websiteConfig } from './index';

describe('configuration loaders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults the admin token lifetime to 14 days', () => {
    delete process.env.ADMIN_JWT_EXPIRES_IN;

    expect(adminAuthConfig().adminAuth.jwtExpiresIn).toBe('14d');
  });

  it('uses ADMIN_JWT_EXPIRES_IN when set', () => {
    process.env.ADMIN_JWT_EXPIRES_IN = '1d';

    expect(adminAuthConfig().adminAuth.jwtExpiresIn).toBe('1d');
  });

  it('parses SUPPORTED_LANGUAGES as a trimmed list', () => {
    process.env.SUPPORTED_LANGUAGES = ' hy , en ';
    process.env.DEFAULT_LANGUAGE = 'hy';

    expect(languageConfig().language).toEqual({
      supported: ['hy', 'en'],
      default: 'hy',
    });
  });

  it('defaults to every shipped language with English as the default', () => {
    delete process.env.SUPPORTED_LANGUAGES;
    delete process.env.DEFAULT_LANGUAGE;

    expect(languageConfig().language).toEqual({
      supported: ['hy', 'en', 'ru'],
      default: 'en',
    });
  });

  it('reads the website revalidation settings', () => {
    process.env.WEBSITE_URL = 'https://example.com';
    process.env.WEBSITE_REVALIDATE_SECRET = 'secret';

    expect(websiteConfig().website).toEqual({
      url: 'https://example.com',
      revalidateSecret: 'secret',
    });
  });
});
