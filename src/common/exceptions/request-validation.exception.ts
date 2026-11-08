import { HttpStatus } from '@nestjs/common';
import { BaseException, TranslationArgs } from './base.exception';

export interface ValidationViolation {
  field: string;
  key: string;
  args: TranslationArgs;
  fallbackMessage: string;
}

export class RequestValidationException extends BaseException {
  constructor(public readonly violations: ValidationViolation[]) {
    super('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
  }
}
