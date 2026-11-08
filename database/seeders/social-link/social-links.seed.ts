import { SocialLinkService } from '../../../src/modules/social-link/social-link.service';

export async function seedSocialLinks(
  socialLinkService: SocialLinkService,
): Promise<void> {
  await socialLinkService.ensureSeeded();
  console.log('Successfully seeded: social_links');
}
