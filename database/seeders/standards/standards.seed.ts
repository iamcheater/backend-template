import { StandardsService } from '../../../src/modules/standards/standards.service';

export async function seedStandards(
  standardsService: StandardsService,
): Promise<void> {
  await standardsService.ensureSeeded();
  console.log('Successfully seeded: standards_section');
}
