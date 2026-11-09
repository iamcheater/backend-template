import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ContentChangedEvent, EventName } from 'src/common/events';
import { RevalidationService } from 'src/core/revalidation/revalidation.service';

@Injectable()
export class WebsiteRevalidationListener {
  constructor(private readonly revalidationService: RevalidationService) {}

  @OnEvent(EventName.CONTENT_CHANGED, { async: true, promisify: true })
  handleContentChanged(event: ContentChangedEvent): Promise<void> {
    return this.revalidationService.revalidate([event.tag]);
  }
}
