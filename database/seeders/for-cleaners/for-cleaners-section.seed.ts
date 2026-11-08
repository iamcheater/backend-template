import { ForCleanersSectionService } from '../../../src/modules/for-cleaners/for-cleaners-section.service';

export async function seedForCleanersSection(
  forCleanersSectionService: ForCleanersSectionService,
): Promise<void> {
  await forCleanersSectionService.ensureSeeded();
  console.log('Successfully seeded: for_cleaners_section');
}
