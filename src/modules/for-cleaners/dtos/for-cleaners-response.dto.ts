import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';
import { CleanerExpectationResponseDto } from './cleaner-expectation-response.dto';

export class ForCleanersResponseDto {
  title: string | null;
  description: string | null;
  mediaType: MediaType | null;
  media: ResolvedMediaUrls | null;
  expectations: CleanerExpectationResponseDto[];

  constructor(partial: ForCleanersResponseDto) {
    Object.assign(this, partial);
  }
}
