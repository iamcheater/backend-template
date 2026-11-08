import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class TalkToUsNotFoundException extends BaseException {
  constructor() {
    super('TALK_TO_US_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
