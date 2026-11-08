import { validate } from 'class-validator';
import { IsSocialLinkUrl } from './is-social-link-url.decorator';

class SocialLinkUrlTestDto {
  @IsSocialLinkUrl()
  url: string;
}

async function validateUrl(url: unknown): Promise<boolean> {
  const dto = new SocialLinkUrlTestDto();
  dto.url = url as string;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsSocialLinkUrl', () => {
  it('accepts regular web urls', async () => {
    await expect(validateUrl('https://instagram.com/jeenj')).resolves.toBe(
      true,
    );
    await expect(validateUrl('https://m.me/jeenj')).resolves.toBe(true);
    await expect(
      validateUrl('https://invite.viber.com/?g2=AQBexample'),
    ).resolves.toBe(true);
  });

  it('accepts a Viber chat deep link with an encoded or plain country code', async () => {
    await expect(
      validateUrl('viber://chat?number=%2B37455123456'),
    ).resolves.toBe(true);
    await expect(
      validateUrl('viber://chat/?number=+37455123456'),
    ).resolves.toBe(true);
  });

  it('accepts a Viber business account deep link', async () => {
    await expect(validateUrl('viber://pa?chatURI=jeenj')).resolves.toBe(true);
  });

  it('rejects a Viber deep link without a usable number', async () => {
    await expect(validateUrl('viber://chat?number=abc')).resolves.toBe(false);
    await expect(validateUrl('viber://chat')).resolves.toBe(false);
  });

  it('rejects other non-web schemes', async () => {
    await expect(validateUrl('javascript:alert(1)')).resolves.toBe(false);
    await expect(validateUrl('tg://resolve?domain=jeenj')).resolves.toBe(false);
  });

  it('rejects web urls without https', async () => {
    await expect(validateUrl('facebook.com/jeenj')).resolves.toBe(false);
    await expect(validateUrl('http://facebook.com/jeenj')).resolves.toBe(false);
  });

  it('rejects malformed values and non-strings', async () => {
    await expect(validateUrl('not-a-url')).resolves.toBe(false);
    await expect(validateUrl(123)).resolves.toBe(false);
  });
});
