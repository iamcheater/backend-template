import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';

export class StandardsResponseDto {
  text: string | null;
  mediaType: MediaType | null;
  media: ResolvedMediaUrls | null;

  constructor(partial: StandardsResponseDto) {
    Object.assign(this, partial);
  }
}
