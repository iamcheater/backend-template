import {
  ArgumentsHost,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { QueryFailedError } from 'typeorm';
import {
  RequestValidationException,
  TooManyRequestsException,
} from 'src/common/exceptions';
import { UploadTooLargeException } from 'src/modules/media/exceptions';
import { LocalizedExceptionFilter } from './localized-exception.filter';

describe('LocalizedExceptionFilter', () => {
  let filter: LocalizedExceptionFilter;
  let translate: jest.Mock;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    translate = jest.fn(
      (key: string, options: { args?: Record<string, unknown> }) =>
        `${key}${options.args ? JSON.stringify(options.args) : ''}`,
    );
    filter = new LocalizedExceptionFilter({
      translate,
    } as unknown as I18nService);
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/test', method: 'GET', headers: {} }),
      }),
    } as unknown as ArgumentsHost;
    jest.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  });

  const body = () => json.mock.calls[0][0] as Record<string, unknown>;

  it('translates a BaseException key with its args', () => {
    filter.catch(new UploadTooLargeException(10), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(body()).toMatchObject({
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'error.UPLOAD_TOO_LARGE{"maxSizeMb":10}',
      path: '/test',
    });
  });

  it('maps a built-in HttpException to a generic key by status', () => {
    filter.catch(new NotFoundException('Cannot GET /nope'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(body().message).toBe('error.NOT_FOUND');
  });

  it('maps an unauthenticated request to the UNAUTHORIZED key', () => {
    filter.catch(new UnauthorizedException(), host);

    expect(body()).toMatchObject({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'error.UNAUTHORIZED',
    });
  });

  it('returns 429 for throttled requests', () => {
    filter.catch(new TooManyRequestsException(), host);

    expect(body()).toMatchObject({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'error.TOO_MANY_REQUESTS',
    });
  });

  it('returns one message plus translated field errors for validation failures', () => {
    filter.catch(
      new RequestValidationException([
        {
          field: 'name',
          key: 'maxLength',
          args: { max: 100 },
          fallbackMessage: 'name must be shorter',
        },
      ]),
      host,
    );

    expect(body()).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'error.VALIDATION_FAILED',
      errors: [{ field: 'name', message: 'validation.maxLength{"max":100}' }],
    });
    expect(translate).toHaveBeenCalledWith(
      'validation.maxLength',
      expect.objectContaining({ defaultValue: 'name must be shorter' }),
    );
  });

  it.each([
    ['23505', HttpStatus.CONFLICT, 'error.RECORD_ALREADY_EXISTS'],
    ['23503', HttpStatus.CONFLICT, 'error.RECORD_IN_USE'],
    ['22P02', HttpStatus.BAD_REQUEST, 'error.BAD_REQUEST'],
    ['99999', HttpStatus.INTERNAL_SERVER_ERROR, 'error.INTERNAL_SERVER_ERROR'],
  ])(
    'maps Postgres error %s to %i',
    (code, expectedStatus, expectedMessage) => {
      filter.catch(
        new QueryFailedError(
          'SELECT 1',
          [],
          Object.assign(new Error(), { code }),
        ),
        host,
      );

      expect(body()).toMatchObject({
        success: false,
        statusCode: expectedStatus,
        message: expectedMessage,
      });
    },
  );

  it('keeps the status of client errors raised by the body parser', () => {
    filter.catch(
      Object.assign(new Error('request entity too large'), {
        status: 413,
        expose: true,
        type: 'entity.too.large',
      }),
      host,
    );

    expect(body()).toMatchObject({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'error.PAYLOAD_TOO_LARGE',
    });
  });

  it('hides unknown errors behind a 500 and logs them', () => {
    filter.catch(new Error('connection refused at 10.0.0.1'), host);

    expect(body()).toMatchObject({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'error.INTERNAL_SERVER_ERROR',
    });
    expect(JSON.stringify(body())).not.toContain('10.0.0.1');
    expect(filter['logger'].error).toHaveBeenCalled();
  });

  it('omits errors for non-validation failures', () => {
    filter.catch(new NotFoundException(), host);

    expect(body()).not.toHaveProperty('errors');
  });
});
