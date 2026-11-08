import { PrivacyPolicyService } from '../../../src/modules/privacy-policy/privacy-policy.service';

export async function seedPrivacyPolicy(
  privacyPolicyService: PrivacyPolicyService,
): Promise<void> {
  await privacyPolicyService.ensureSeeded();
  console.log('Successfully seeded: privacy_policy');
}
