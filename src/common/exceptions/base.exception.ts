import { HttpException, HttpStatus } from '@nestjs/common';

export type TranslationArgs = Record<string, string | number>;

export abstract class BaseException extends HttpException {
  constructor(
    public readonly translationKey: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly translationArgs?: TranslationArgs,
  ) {
    super(translationKey, status);
  }
}
