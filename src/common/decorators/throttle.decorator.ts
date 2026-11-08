import { minutes, Throttle } from '@nestjs/throttler';

export const SubmissionThrottle = () =>
  Throttle({ default: { limit: 5, ttl: minutes(10) } });

export const LoginThrottle = () =>
  Throttle({ default: { limit: 10, ttl: minutes(15) } });
