import { ValidationPipe } from '@nestjs/common';
import { RequestValidationException } from '../exceptions';
import { toValidationViolations } from './validation-violations.util';

export const createAppValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) =>
      new RequestValidationException(toValidationViolations(errors)),
  });
