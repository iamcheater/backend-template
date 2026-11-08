import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';

export class TalkToUsResponseDto {
  title: string | null;
  text: string | null;
  mediaType: MediaType | null;
  media: ResolvedMediaUrls | null;

  constructor(partial: TalkToUsResponseDto) {
    Object.assign(this, partial);
  }
}
