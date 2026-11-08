import { TermsAndConditionsService } from '../../../src/modules/terms-and-conditions/terms-and-conditions.service';

export async function seedTermsAndConditions(
  termsAndConditionsService: TermsAndConditionsService,
): Promise<void> {
  await termsAndConditionsService.ensureSeeded();
  console.log('Successfully seeded: terms_and_conditions');
}
