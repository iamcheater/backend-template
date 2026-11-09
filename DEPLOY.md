# Deploying the backend

How to deploy a backend built from this template. There are two environments, both on Railway:

| Environment | Branch | Backend | Website / admin | `NODE_ENV` |
|---|---|---|---|---|
| **Dev / QA** | `develop` | Railway (this file) | Vercel | `develop` |
| **Production** | `main` | Railway | Vercel | `production` |

Work lands on `develop`, gets tested on Railway, then is merged to `main` for production. Everything runs from the compiled `dist/` build: nothing on the server needs `ts-node`.

## 0. Dev pipeline (Railway)

Push to `develop` → GitHub Actions CI (`.github/workflows/ci.yml`) → Railway deploys. Nothing reaches the dev environment unless CI is green.

- **CI** runs on every PR and every push to `main`/`develop`:
  - `checks` job: lint (`lint:check`, no autofix), build, unit tests.
  - `database` job, against a throwaway Postgres:
    1. Applies every migration to an empty database.
    2. Runs `migration:check`, which fails if an entity changed without a migration.
    3. Runs every seeder.
    4. Runs the e2e tests.
- **Railway** builds and deploys from `railway.json`:
  1. `npm run build`.
  2. Pre-deploy: `migration:run:prod`, then `seed:prod`. If this fails, the deploy stops and the previous version keeps serving.
  3. Starts the new container and waits for `/health/db` to return 200 before switching traffic to it. If it never does, the deploy fails and the old version stays live.

One-time setup, done in the dashboards:

1. **GitHub → repo Settings → Branches → add a rule for `main`.** Require a pull request before merging, and require the `Lint, build, unit tests` and `Migrations and e2e tests` status checks to pass. The checks only show up in the list after CI has run once. Optionally require the same status checks on `develop`.
2. **Railway → backend service → Settings:**
   - Source: this repo, branch `develop`.
   - Turn on **Wait for CI**, so Railway only deploys a commit after its GitHub Actions checks pass.
3. **Railway → add a Postgres database** to the same project. Set the backend's `POSTGRES_*` variables from it with references, e.g. `POSTGRES_HOST=${{Postgres.PGHOST}}`. Turn on its backups.
4. **Railway → backend service → Variables:** set everything from section 1. Don't set `PORT`; Railway provides it and the app reads it.

**Migrations run before the new code starts, while the old code is still serving.** For a moment the old code runs against the new schema, so keep each migration compatible with the previous release. Add a column as nullable or with a default first, and drop or rename columns in a later release, once no running code uses them.

## 1. Environment

`.env.example` is the template for the three git-ignored env files, which have the same variables in the same order: `.env.local` for local development, and `.env.develop` / `.env.prod` as the reference copies of what is set in Railway's Variables tab. Values that matter for a deploy:

| Variable | Dev | Production |
|---|---|---|
| `NODE_ENV` | `develop`. Migrations only, Swagger `/docs` stays on for QA. | `production`. Migrations only, Swagger `/docs` hidden. |
| `PORT` | Don't set; Railway provides it | Don't set; Railway provides it |
| `POSTGRES_*` | Railway Postgres, via references | Production database |
| `ADMIN_JWT_SECRET` | Own random string | Own random string, never shared with dev |
| `ADMIN_JWT_EXPIRES_IN` | Optional, defaults to `14d` | Optional, defaults to `14d` |
| `SUPPORTED_LANGUAGES` / `DEFAULT_LANGUAGE` | Same as production | The client's languages, e.g. `hy,en,ru` and `hy`. Startup fails if the default is not in the list. |
| `WEBSITE_URL` | The Vercel dev website | The production website |
| `WEBSITE_REVALIDATE_SECRET` | 32+ random characters, same value as the dev website | 32+ random characters, same value as the production website, never shared with dev |
| `CORS_ORIGINS` | The Vercel dev website and admin origins (exact URLs; preview URLs aren't matched) | e.g. `https://example.com,https://www.example.com,https://admin.example.com` |

The rest apply to both environments, with separate values per environment:

| Variable | Value |
|---|---|
| `CORS_ORIGINS` | Startup fails if empty. |
| `TRUST_PROXY` | `1` on Railway (its edge proxy is one hop). Add one per extra proxy, e.g. `2` with Cloudflare in front. Wrong value = every visitor shares one rate limit. |
| `INTERNAL_API_KEY` | 32+ random characters. Set the same value as `INTERNAL_API_KEY` on the website server (never `NEXT_PUBLIC_*`). |
| `ADMIN_DASHBOARD_URL` | Admin base URL, for "View" buttons in Telegram messages |
| `TELEGRAM_*` | Dev uses its own bot or chat, so QA submissions don't notify the real team |
| `AWS_*`, `MEDIA_*` | Dev uses its own bucket (or prefix) and IAM key. The bucket must allow public `s3:GetObject`: media URLs are permanent public links, not signed ones. |
| `MEDIA_PUBLIC_BASE_URL` | Optional. Defaults to `https://<AWS_S3_BUCKET>.s3.<AWS_REGION>.amazonaws.com`; set it to the CloudFront domain (e.g. `https://media.example.com`) once one fronts the bucket. |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | Only needed until the first deploy creates the super admin. Remove them afterwards. Once a super admin exists, the seeder skips without them, so deploys keep working. |

Generate secrets with `openssl rand -hex 32`.

## 2. Deploy steps

On Railway these run automatically (see section 0). To deploy by hand on any other host:

```bash
npm ci
npm run build
npm run migration:show:prod   # [ ] = pending, [X] = applied
npm run migration:run:prod
npm run seed:prod             # safe to re-run; only fills in what's missing
npm run start:prod            # or restart the process manager (pm2/systemd) running `node dist/src/main`
curl -f http://localhost:3060/health
```

Run migrations **before** starting the new build: the new code expects the new schema.

## 3. Seeders

`seed:prod` runs every seeder independently: one failing seeder is reported and the others still run. The command exits non-zero if any failed, so a deploy script notices.

```bash
npm run seed:prod                 # all seeders
npm run seed:prod -- super-admin  # just the named one(s)
```

Available: `super-admin`. Each feature that needs fixed rows adds its own seeder to `database/seeders/seed-all.ts`.

Every seeder only creates rows that are missing and never overwrites what an admin has edited. That's why re-running after a failure, or on every deploy, is safe.

## 4. Rollback

```bash
npm run migration:revert:prod   # reverts the most recent migration only; repeat for more
```

Then redeploy the previous build. Revert migrations **before** switching to older code, because older code doesn't know about newer columns.

On Railway, run the revert from the service's shell or locally with `railway run npm run migration:revert:prod`. Then pick the previous deployment in the Deployments tab and choose **Redeploy**. Note that the next deploy's pre-deploy step re-applies any migration that is still in the code. So for a lasting rollback, also revert the commit on `develop`.

## 5. Migrations: the single baseline

The template ships one `InitialSchema` baseline (`admins`, `media_assets`). A new client project keeps it and adds every later schema change in its own migration on top of it, one per task (see CLAUDE.md). `synchronize` is off everywhere, so the schema only ever comes from migrations. Once production holds real data, never squash migrations.
