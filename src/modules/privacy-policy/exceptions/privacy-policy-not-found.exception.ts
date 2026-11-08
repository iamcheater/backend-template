import { HttpStatus } from '@nestjs/common';
import { BaseException } from 'src/common/exceptions';

export class PrivacyPolicyNotFoundException extends BaseException {
  constructor() {
    super('PRIVACY_POLICY_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}
