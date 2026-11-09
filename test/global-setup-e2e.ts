import { execSync } from 'child_process';

export default function globalSetup(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'E2E tests run only with NODE_ENV=test against a dedicated test database (see the CI workflow for the variables).',
    );
  }

  try {
    execSync('npm run migration:run', { stdio: 'pipe', env: process.env });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `Running migrations before the e2e suite failed:\n${stdout?.toString() ?? ''}${stderr?.toString() ?? ''}`,
    );
  }
}
