import { MediaType } from 'src/modules/media/enums';
import { ResolvedMediaUrls } from 'src/modules/media/interfaces';
import { ServiceComponentResponseDto } from './service-component-response.dto';

export class ServiceResponseDto {
  id: number;
  title: string;
  description: string;
  order: number;
  mediaType: MediaType;
  media: ResolvedMediaUrls;
  components: ServiceComponentResponseDto[];

  constructor(partial: ServiceResponseDto) {
    Object.assign(this, partial);
  }
}
