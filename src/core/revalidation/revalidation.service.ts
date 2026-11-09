import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const REVALIDATE_PATH = '/api/revalidate';
export const REVALIDATE_SECRET_HEADER = 'x-revalidate-secret';
const REVALIDATE_TIMEOUT_MS = 5000;

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);
  private readonly websiteUrl?: string;
  private readonly secret?: string;

  constructor(configService: ConfigService) {
    this.websiteUrl = configService
      .get<string>('website.url')
      ?.replace(/\/+$/, '');
    this.secret = configService.get<string>('website.revalidateSecret');
  }

  async revalidate(tags: string[]): Promise<void> {
    if (tags.length === 0) {
      return;
    }

    if (!this.websiteUrl || !this.secret) {
      this.logger.warn(
        `Website revalidation is not configured (WEBSITE_URL/WEBSITE_REVALIDATE_SECRET); skipping tags: ${tags.join(', ')}`,
      );
      return;
    }

    try {
      const response = await fetch(`${this.websiteUrl}${REVALIDATE_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [REVALIDATE_SECRET_HEADER]: this.secret,
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.error(
          `Website revalidation failed with status ${response.status} for tags: ${tags.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Website revalidation threw an error for tags: ${tags.join(', ')}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
