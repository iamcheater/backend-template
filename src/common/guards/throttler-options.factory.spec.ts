import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createThrottlerOptions,
  INTERNAL_API_KEY_HEADER,
} from './throttler-options.factory';

const INTERNAL_KEY = 'k'.repeat(32);

const buildSkipIf = (config: Record<string, string | undefined>) => {
  const configService = {
    get: (key: string) => config[key],
  } as unknown as ConfigService;
  const options = createThrottlerOptions(configService);

  if (Array.isArray(options) || !options.skipIf) {
    throw new Error('expected throttler options with skipIf');
  }

  return options.skipIf;
};

const contextWithHeaders = (
  headers: Record<string, string>,
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

describe('createThrottlerOptions', () => {
  it('skips throttling locally', () => {
    const skipIf = buildSkipIf({ 'app.nodeEnv': 'local' });

    expect(skipIf(contextWithHeaders({}))).toBe(true);
  });

  it('throttles requests without an internal key outside local', () => {
    const skipIf = buildSkipIf({
      'app.nodeEnv': 'production',
      'app.internalApiKey': INTERNAL_KEY,
    });

    expect(skipIf(contextWithHeaders({}))).toBe(false);
  });

  it('skips throttling when the internal key matches', () => {
    const skipIf = buildSkipIf({
      'app.nodeEnv': 'production',
      'app.internalApiKey': INTERNAL_KEY,
    });

    expect(
      skipIf(contextWithHeaders({ [INTERNAL_API_KEY_HEADER]: INTERNAL_KEY })),
    ).toBe(true);
  });

  it('throttles when the internal key is wrong', () => {
    const skipIf = buildSkipIf({
      'app.nodeEnv': 'production',
      'app.internalApiKey': INTERNAL_KEY,
    });

    expect(
      skipIf(contextWithHeaders({ [INTERNAL_API_KEY_HEADER]: 'wrong' })),
    ).toBe(false);
  });

  it('never skips when no internal key is configured', () => {
    const skipIf = buildSkipIf({ 'app.nodeEnv': 'production' });

    expect(skipIf(contextWithHeaders({ [INTERNAL_API_KEY_HEADER]: '' }))).toBe(
      false,
    );
  });
});
