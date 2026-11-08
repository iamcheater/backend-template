import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';

export class HowItWorksStepResponseDto {
  id: number;
  title: string;
  description: string;
  order: number;
  mediaType: MediaType | null;
  media: ResolvedMediaUrls | null;

  constructor(partial: HowItWorksStepResponseDto) {
    Object.assign(this, partial);
  }
}
