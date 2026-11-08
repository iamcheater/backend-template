import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';

export class HeroSlideResponseDto {
  id: number;
  order: number;
  mediaType: MediaType;
  media: ResolvedMediaUrls;

  constructor(partial: HeroSlideResponseDto) {
    Object.assign(this, partial);
  }
}
