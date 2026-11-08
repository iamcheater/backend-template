import { HowItWorksSectionService } from '../../../src/modules/how-it-works/how-it-works-section.service';

export async function seedHowItWorksSection(
  howItWorksSectionService: HowItWorksSectionService,
): Promise<void> {
  await howItWorksSectionService.ensureSeeded();
  console.log('Successfully seeded: how_it_works_section');
}
