import { TalkToUsService } from '../../../src/modules/talk-to-us/talk-to-us.service';

export async function seedTalkToUs(
  talkToUsService: TalkToUsService,
): Promise<void> {
  await talkToUsService.ensureSeeded();
  console.log('Successfully seeded: talk_to_us_section');
}
