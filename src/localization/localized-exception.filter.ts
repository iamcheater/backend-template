import { inspect } from 'util';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import {
  BaseException,
  RequestValidationException,
  TranslationArgs,
} from 'src/common/exceptions';
import { resolveLanguage } from './resolve-language.util';

interface ResolvedError {
  status: number;
  key: string;
  args?: TranslationArgs;
}

interface FieldError {
  field: string;
  message: string;
}

const STATUS_KEYS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

const POSTGRES_ERRORS: Record<string, ResolvedError> = {
  '23505': { status: HttpStatus.CONFLICT, key: 'RECORD_ALREADY_EXISTS' },
  '23503': { status: HttpStatus.CONFLICT, key: 'RECORD_IN_USE' },
  '22P02': { status: HttpStatus.BAD_REQUEST, key: 'BAD_REQUEST' },
};

const INTERNAL_ERROR: ResolvedError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  key: 'INTERNAL_SERVER_ERROR',
};

const CLIENT_ERROR_MIN: number = HttpStatus.BAD_REQUEST;
const SERVER_ERROR_MIN: number = HttpStatus.INTERNAL_SERVER_ERROR;

const clientErrorStatusOf = (exception: unknown): number | undefined => {
  const { status, expose } = (exception ?? {}) as {
    status?: unknown;
    expose?: unknown;
  };

  return expose === true &&
    typeof status === 'number' &&
    status >= CLIENT_ERROR_MIN &&
    status < SERVER_ERROR_MIN
    ? status
    : undefined;
};

@Catch()
export class LocalizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LocalizedExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const lang = resolveLanguage(request);
    const { status, key, args } = this.resolve(exception);

    if (status >= SERVER_ERROR_MIN) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : inspect(exception),
      );
    }

    const body: Record<string, unknown> = {
      success: false,
      statusCode: status,
      message: this.translate(`error.${key}`, lang, args, key),
    };

    if (exception instanceof RequestValidationException) {
      body.errors = this.translateViolations(exception, lang);
    }

    response.status(status).json({
      ...body,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof BaseException) {
      return {
        status: exception.getStatus(),
        key: exception.translationKey,
        args: exception.translationArgs,
      };
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : clientErrorStatusOf(exception);

    if (status !== undefined) {
      const fallbackKey =
        status >= SERVER_ERROR_MIN ? INTERNAL_ERROR.key : 'REQUEST_FAILED';
      return { status, key: STATUS_KEYS[status] ?? fallbackKey };
    }

    if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string } | undefined)
        ?.code;
      return (code && POSTGRES_ERRORS[code]) || INTERNAL_ERROR;
    }

    return INTERNAL_ERROR;
  }

  private translateViolations(
    exception: RequestValidationException,
    lang: string,
  ): FieldError[] {
    return exception.violations.map((violation) => ({
      field: violation.field,
      message: this.translate(
        `validation.${violation.key}`,
        lang,
        violation.args,
        violation.fallbackMessage,
      ),
    }));
  }

  private translate(
    key: string,
    lang: string,
    args: TranslationArgs | undefined,
    defaultValue: string,
  ): string {
    return this.i18n.translate(key, { lang, args, defaultValue });
  }
}
