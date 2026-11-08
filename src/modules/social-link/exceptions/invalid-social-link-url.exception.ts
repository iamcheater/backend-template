import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class InvalidSocialLinkUrlException extends BaseException {
  constructor(platform: string) {
    super('INVALID_SOCIAL_LINK_URL', HttpStatus.BAD_REQUEST, { platform });
  }
}
