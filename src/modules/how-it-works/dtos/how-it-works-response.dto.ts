import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';
import { HowItWorksStepResponseDto } from './how-it-works-step-response.dto';

export class HowItWorksResponseDto {
  mediaType: MediaType | null;
  media: ResolvedMediaUrls | null;
  steps: HowItWorksStepResponseDto[];

  constructor(partial: HowItWorksResponseDto) {
    Object.assign(this, partial);
  }
}
