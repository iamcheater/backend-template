import { timingSafeEqual } from 'crypto';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { minutes, ThrottlerModuleOptions } from '@nestjs/throttler';
import { Request } from 'express';

export const INTERNAL_API_KEY_HEADER = 'x-internal-key';

const UNTHROTTLED_ENVIRONMENTS = ['local', 'test'];

export const DEFAULT_THROTTLE = { limit: 120, ttl: minutes(1) };

const hasValidInternalKey = (
  request: Request,
  internalApiKey: string | undefined,
): boolean => {
  const providedKey = request.headers[INTERNAL_API_KEY_HEADER];

  if (!internalApiKey || typeof providedKey !== 'string') {
    return false;
  }

  const expected = Buffer.from(internalApiKey);
  const provided = Buffer.from(providedKey);

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
};

export const createThrottlerOptions = (
  configService: ConfigService,
): ThrottlerModuleOptions => {
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'local';
  const internalApiKey = configService.get<string>('app.internalApiKey');

  return {
    throttlers: [DEFAULT_THROTTLE],
    skipIf: (context: ExecutionContext) =>
      UNTHROTTLED_ENVIRONMENTS.includes(nodeEnv) ||
      hasValidInternalKey(
        context.switchToHttp().getRequest<Request>(),
        internalApiKey,
      ),
  };
};
