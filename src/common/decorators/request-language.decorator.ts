import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { resolveLanguage } from 'src/localization/resolve-language.util';
import { SupportedLanguage } from 'src/localization/supported-language.enum';

export const RequestLanguage = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SupportedLanguage =>
    resolveLanguage(context.switchToHttp().getRequest<Request>()),
);
