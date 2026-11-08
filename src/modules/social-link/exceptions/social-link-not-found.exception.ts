import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class SocialLinkNotFoundException extends BaseException {
  constructor() {
    super('SOCIAL_LINK_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
