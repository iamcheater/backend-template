import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class HeroSlideNotFoundException extends BaseException {
  constructor() {
    super('HERO_SLIDE_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
