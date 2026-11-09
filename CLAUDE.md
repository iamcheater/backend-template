# CLAUDE.md — Backend Template

This file provides guidance to Claude Code when working with code in this repository.

These rules keep a client backend secure, predictable and easy to extend without breaking what already works. Violating one is a blocking review finding. When the code and this file disagree, fix whichever is wrong in the same change. Never leave them out of step.

---

## What this is

A starting point for client backends. It ships the core every client gets: admin authentication and admin management, media uploads to S3, notifications (Telegram by default), website revalidation, health checks, localization, and one example content module as the reference every new feature copies.

It is one of three templates. Every client gets three separate repositories cloned from them:

| Repo | Stack | Deploys to |
| --- | --- | --- |
| Backend (this) | NestJS · TypeORM · PostgreSQL | Railway |
| Website | Next.js · TypeScript · SCSS | Vercel |
| Admin dashboard | React · Vite · Redux Toolkit | Vercel |

The backend **owns** all content and data. The admin dashboard edits it through admin-only endpoints. The website reads it through public endpoints and posts its forms here.

## Scope: build the minimum the business needs

The first version (the MVP) is built quickly from this template, and deeper work comes later through support. So:

- Build only what the business needs to run and earn.
- A feature that is nice but not necessary is **not** built in the MVP. Write it down for later support work instead.
- Extra capabilities (end-user accounts, email notifications, per-page SEO, stronger admin security) are added later as separate modules, never by rewiring the core.
- If a prompt asks for something outside the agreed scope, stop and ask before building it.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | NestJS 11 |
| Language | TypeScript (CommonJS build) |
| Runtime | Node.js 22 |
| Database | PostgreSQL |
| ORM | TypeORM 0.3 + `typeorm-transactional` |
| Admin auth | Passport JWT (`@nestjs/jwt`, `passport-jwt`), bcrypt |
| Validation | `class-validator`, `class-transformer`, Joi (config) |
| Events | `@nestjs/event-emitter` |
| File storage | AWS S3 SDK v3, `sharp` for image variants |
| i18n | `nestjs-i18n` |
| Security | Helmet, `@nestjs/throttler` |
| API docs | `@nestjs/swagger` |
| Testing | Jest, Supertest, `ts-jest` |
| Linting | ESLint (flat config), Prettier |

Do not add a dependency without saying why in the PR.

**Dependency pinning is deliberate, not stale.** `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/typeorm` and `@nestjs/swagger` may be pinned below their npm `latest` tags because newer majors can ship ESM-only (`"type": "module"`) and break this project's CommonJS `tsconfig.json` / `ts-jest` setup. `@nestjs/event-emitter` is pinned to `~3.1.0` for the same reason: 12.x is ESM-only. Never run a bare `npm update` or `npm install <pkg>@latest` on them. Before upgrading, check that the new version's `package.json` has no `"type": "module"`.

## Commands

```bash
npm run start:dev           # Watch mode (development)
npm run start:debug         # Debug with Node inspector
npm run build               # Compile TypeScript to dist/
npm run start:prod          # Run the compiled build

npm test                    # Unit tests (all)
npx jest path/to.spec.ts    # One unit test file
npm run test:e2e            # E2E tests (test/jest-e2e.json); needs NODE_ENV=test and a dedicated test database in the shell env
npm run test:cov            # Coverage report

npm run migration:generate  # Generate a migration from entity changes
npm run migration:run       # Apply pending migrations
npm run migration:revert    # Revert the last migration
npm run migration:check     # Fail if entities differ from the migrated schema (CI runs this)
npm run seed:all            # Run all seeders, each independently
npm run seed:all -- <name>  # Run only the named seeder(s)

npm run migration:run:prod  # Production equivalents run compiled JS from dist/
npm run seed:prod

npm run lint                # ESLint with autofix
npm run lint:check          # ESLint without autofix (CI runs this)
npm run format              # Prettier
```

## Environment files

Every project (backend, website, admin) keeps the same three files. All three always exist, even before a develop or production deployment does, and all three are **gitignored**:

| File | Used for |
| --- | --- |
| `.env.local` | Local development: your local database and local services |
| `.env.develop` | The develop deployment on Railway, for QA and client review |
| `.env.prod` | Production. The source of the values entered into Railway |

`ConfigModule`, `database/ormconfig.ts` and the seeders load `.env.local` locally, through `loadEnvFile()` / `ENV_FILE_PATH` in `src/configurations/index.ts`. It is never loaded when `NODE_ENV=test`: e2e tests take every variable from the shell, as CI does, so they can never hit the local database or a real Telegram chat. On Railway, variables are entered in the service settings and injected by the platform. `.env.develop` and `.env.prod` are reference files: keeping them in the project makes it easy to compare what differs between environments.

`.env.example` **is** committed. It lists every key with an empty or safe placeholder value.

| Variable | Used for |
| --- | --- |
| `PORT`, `NODE_ENV` | App port; `local`, `develop`, `production` or `test` |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` | Database connection |
| `ADMIN_JWT_SECRET`, `ADMIN_JWT_EXPIRES_IN` | Admin token signing and lifetime (default `14d`) |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Seed-only: the first super admin |
| `CORS_ORIGINS`, `TRUST_PROXY`, `INTERNAL_API_KEY` | HTTP and rate-limit settings |
| `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE` | Which languages this client uses (e.g. `hy,en,ru` and `hy`) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Notification channel |
| `ADMIN_DASHBOARD_URL` | Links in notifications (inline "View" buttons) |
| `WEBSITE_URL`, `WEBSITE_REVALIDATE_SECRET` | Website revalidation calls |
| `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `MEDIA_PUBLIC_BASE_URL` | S3 storage and public media URLs |
| `MEDIA_MAX_IMAGE_SIZE_MB`, `MEDIA_MAX_VIDEO_CHUNK_SIZE_MB` | Upload size limits |

**A new env variable has four touch points**, all in the same change:

1. The relevant loader in `src/configurations/index.ts`.
2. The Joi schema in `src/utils/joi/config-validation.schema.ts`, so startup fails loudly on a missing or invalid value.
3. `.env.example`.
4. All three env files.

## Deploy

Railway, with PostgreSQL provisioned alongside the backend. `railway.json`:

- builds with `npm run build`;
- runs `npm run migration:run:prod && npm run seed:prod` as the pre-deploy command, so every deploy migrates and seeds before the new version starts;
- starts with `npm run start:prod`;
- health-checks `/health/db`.

The develop environment is used for QA and client review. Before any client goes live, **turn on backups for the production database on Railway and test a restore once.**

---

## Folder structure

```
project-root/
├── src/
│   ├── main.ts                    bootstrap: transactional context, trust proxy, body limit, helmet, CORS, Swagger
│   ├── app.module.ts              root module; every module is registered here
│   │
│   ├── core/                      what every client gets. Do not change without the lead's approval
│   │   ├── admin-auth/            admin login, admin JWT strategy, guards (incl. the global default-deny guard)
│   │   ├── admin/                 admin accounts and admin management
│   │   ├── media/                 S3 presigned uploads, media assets, image variants, file deletion
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts  registers the channels (NOTIFICATION_CHANNELS)
│   │   │   ├── notifier.service.ts    the one entry point features call
│   │   │   └── channels/
│   │   │       └── telegram/          the default channel (telegram.channel.ts)
│   │   ├── revalidation/          calls the website's revalidate route
│   │   └── health/                /health and /health/db
│   │
│   ├── features/                  client-specific modules. This is where new work goes
│   │   └── example-content/       the reference module every new feature copies
│   │
│   ├── integrations/              event listeners: react to feature events, never called directly
│   │   ├── integrations.module.ts
│   │   └── website-revalidation.listener.ts
│   │
│   ├── common/                    shared infrastructure, no feature logic
│   │   ├── decorators/            @Public, @RequestLanguage, @TranslatedColumn, throttle decorators
│   │   ├── dtos/                  PageDto, PageOptionsDto, PageMetaDto
│   │   ├── entities/              AbstractEntity, TimestampEntity, SectionEntity
│   │   ├── enums/
│   │   ├── events/                ContentChangedEvent and event names
│   │   ├── exceptions/            BaseException, RequestValidationException
│   │   ├── guards/                AppThrottlerGuard
│   │   ├── interceptors/          TransformInterceptor
│   │   ├── interfaces/
│   │   ├── pipes/                 app validation pipe
│   │   ├── response/              shared response shape
│   │   ├── sections/              SectionService base
│   │   ├── transformers/
│   │   ├── types/                 TranslatedText, TranslatedTextPatch, utility types
│   │   ├── utils/
│   │   ├── validators/            IsStrongPassword, IsValidPhone, IsTranslatedText, IsNotPastDate
│   │   └── common.module.ts
│   │
│   ├── configurations/index.ts    config loaders
│   ├── localization/              language resolution, LocalizedExceptionFilter, translated-text utils
│   ├── i18n/<lang>/               error.json, validation.json, fallback.json
│   └── utils/
│       ├── helper-functions/
│       └── joi/                   config validation schema
│
├── database/
│   ├── ormconfig.ts               the single TypeORM DataSource definition
│   ├── migrations/
│   └── seeders/
│       ├── seeder.module.ts
│       ├── seed-all.ts
│       └── <feature>/
│
├── test/                          e2e specs + jest-e2e.json + setup
│   ├── global-setup-e2e.ts        runs the migrations once before the suite (NODE_ENV=test only)
│   ├── helpers/                   createAdmin, loginAdmin, overrideEnv, waitFor
│   └── fixtures/                  test-only modules (e2e-section exercises the section base)
├── .github/workflows/ci.yml
├── railway.json
└── nest-cli.json                  copies i18n assets to dist; Swagger CLI plugin
```

**`core/` vs `features/` is the team's main boundary.** Day-to-day work happens in `features/`. Changing anything in `core/`, `common/`, `localization/`, `database/ormconfig.ts`, `main.ts` or the CI config needs the lead's approval: if a prompt requires it, stop and ask first.

### Module layout: the pattern every module follows

```
feature/
├── feature.module.ts
├── feature.service.ts
├── feature.controller.ts
├── feature.service.spec.ts     co-located unit test
├── entities/index.ts
├── dtos/index.ts
├── exceptions/index.ts
├── enums/                      (if needed)
├── guards/                     (if needed)
├── decorators/                 (if needed)
├── interfaces/                 (if needed)
└── utils/                      (if needed)
```

- **Every sub-folder is a barrel.** It exports its public API through `index.ts`. Import from the folder (`src/features/example-content/entities`), never from a file inside it. The same applies to `src/common/*` and `src/core/*`.
- **New modules are registered** in `src/app.module.ts`'s `imports`. Nothing is auto-discovered except entities (see **Database**).
- **Path aliases:** `src/*` resolves to `src/` in `tsconfig.json`, `jest.config.js` and `test/jest-e2e.json`. Use `src/...` imports across module boundaries and relative imports only inside one module. `database/` code imports `src` through relative paths.

### Naming: `admin-auth` vs `auth`

- `src/core/admin-auth/` is admin authentication. It ships with the template.
- `auth` is **reserved** for end-user authentication (customers, members). It does not exist in the template. If a client needs it, it is added as `src/features/auth/` with its own entity, strategy, guard and token type.
- Everything in each track is prefixed with its owner: `AdminJwtStrategy`, `AdminJwtAuthGuard`, `@AdminUser()`, `AdminJwtPayload`; and later `UserJwtStrategy`, `UserJwtAuthGuard`, `@AuthUser()`. **There is never a bare `JwtStrategy` or `JwtAuthGuard`** that could mean either.

---

## The rules

### 1. Admin authentication is its own track

- Admins live in their own table (`AdminEntity`), fully separate from any end-user table.
- Admin routes are protected by `@UseGuards(AdminJwtAuthGuard, RolesGuard)`, using the `'admin-jwt'` Passport strategy, which resolves against `AdminService`.
- The admin JWT payload carries `sub`, `role` and a `type: 'admin'` discriminator. `AdminJwtStrategy.validate()` checks `type` explicitly, so a future end-user token can never authenticate as an admin, even if both are signed with related secrets or ids collide.
- **Tokens expire.** `ADMIN_JWT_EXPIRES_IN` (default `14d`) sets the lifetime. Admins sign in again when it runs out. There are no refresh tokens in the MVP.
- **The guard loads the admin on every request.** If the admin no longer exists, the request gets `401`. Deleting an admin therefore locks them out immediately, without waiting for their token to expire.
- **Roles come from the database, never from the token.** `RolesGuard` with `@Roles(...)` reads the role from the freshly loaded `AdminEntity`, so a demoted admin loses access on their next request.
- **401 and 403 are different on purpose.** Missing, malformed, expired, wrong-`type` token, or a deleted admin: `401` ("sign in again"). A valid admin whose role is not allowed: `403` ("you don't have permission"). Never collapse them into one exception.
- Login routes use `@LoginThrottle()`.

**Admin roles:** `admin` and `super_admin`.

- Only `super_admin` can create, list, view or delete admins.
- `createAdmin()` always creates `role: admin`. There is no API path that creates a `super_admin`. The first one comes from `database/seeders/admin/super-admin.seed.ts` using `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.
- A super admin cannot delete their own account (`AdminCannotDeleteSelfException`), to prevent lockout.
- `PATCH /admin/me` lets any admin edit their own profile. There is no by-id update route. `email` is immutable after creation.
- `PATCH /admin/me/password` takes `{ currentPassword, newPassword }`, loads the admin with the password opted in, compares with bcrypt and throws `AdminIncorrectCurrentPasswordException` (`400`) on a mismatch. Confirm-password matching is a frontend concern.

**Support-phase security (do not build in the MVP):** token versioning (a `tokenVersion` column, included in the token and compared by the guard, bumped on password change, password reset, "sign out everywhere", and admin removal or demotion), refresh tokens, 2FA and session lists. The current design deliberately leaves room for all of them. Adding token versioning later is one migration and a few lines in the guard, and every admin simply signs in once more.

### 2. Everything is guarded unless it is public website content

- Every admin endpoint requires the admin guard. Every endpoint that is not meant for the public website is guarded.
- **Default deny.** `AdminJwtDefaultGuard` is registered globally (`APP_GUARD` in `AdminAuthModule`): a route without `@Public()` requires an admin token even if its `@UseGuards` was forgotten. Admin routes are marked `@Public()` only to skip this global pass, and then apply `@UseGuards(AdminJwtAuthGuard, RolesGuard)` themselves, so the admin is loaded once per request.
- Public endpoints are only the ones the website reads (`.../active` content, site settings) and the website's form submissions. Mark them `@Public()` deliberately.
- Public form endpoints use `@SubmissionThrottle()` and spam protection checked on the backend.
- Public content may be read freely. Never expose a private record (a submission, an admin) through a public route.

### 3. Feature modules emit events; integrations react

- Features never call the website, revalidation, or any other side-effect service directly.
- When a feature creates, updates or deletes admin-managed content, it emits a `ContentChangedEvent` (from `src/common/events`) carrying the content's tag (e.g. `services`, `site-settings`).
- Emit through `EventEmitter2` (`@nestjs/event-emitter`): `eventEmitter.emit(EventName.CONTENT_CHANGED, new ContentChangedEvent(TAG))`.
- Listeners in `src/integrations/` react to events (registered in `IntegrationsModule`). `website-revalidation.listener.ts` calls `RevalidationService`, which sends `POST {WEBSITE_URL}/api/revalidate` with the JSON body `{ "tags": [...] }` and the header `x-revalidate-secret: {WEBSITE_REVALIDATE_SECRET}`. The website's route must check that header. Without `WEBSITE_URL` or the secret it skips with a warning.
- Emit the event only after the database write succeeds: inside a `@Transactional()` method, emit from `runOnTransactionCommit(...)` (as `SectionService.update` does), so a rolled-back write never revalidates.
- A failed side effect (website down, timeout) is logged, never thrown back into the admin's request. The admin's save always succeeds if the database write did.
- Tags are named after the content module and must match the website's cache tags. Keep them as constants in the emitting module.

### 4. Notifications go through `NotifierService`

- Features import `NotificationsModule` and call `NotifierService.notify({ title, fields?, adminPath? })` from `src/core/notifications`. They never import a channel (Telegram, email) directly. `adminPath` (e.g. `/requests?search=%2357`) becomes the "View" button. `notify` never rejects.
- Telegram is the default channel: messages go to the client's group through our bot, as HTML, with inline buttons where useful (e.g. "View" deep-linking into the admin dashboard via `ADMIN_DASHBOARD_URL`).
- Features pass plain text. Each channel escapes every value with its own helper before it goes into a message (Telegram: `escapeTelegramHtml` on the title, every label and every value), so a feature never builds channel markup.
- A channel that is not configured skips quietly with a warning log. A channel that fails logs the error and never fails the request that triggered it.
- Email is added later as another folder under `channels/`, when a client asks for it: a class implementing `NotificationChannel`, added to the `NOTIFICATION_CHANNELS` factory in `notifications.module.ts`. Adding a channel must not require changing any feature.

### 5. Content sections use the shared section base

- A page section that is one editable record (hero, about, contact block, legal text) extends `SectionEntity` from `src/common/entities` and uses the `SectionService` base from `src/common/sections`.
- The base provides get-for-admin, get-active-for-public (localized), update with translated-text merging, and the `ContentChangedEvent`: `getForAdmin()`, `getActiveForPublic(language)`, `update(patch)` and `ensureSeeded(defaults)`. A subclass sets `contentTag` and `translatedFields` and passes its repository and `EventEmitter2` to `super`.
- `SectionEntity` adds `isActive` (column `is_active`, default `true`). An inactive section returns `404 SECTION_NOT_FOUND` publicly, while admins still read and edit it. A nullable translated field that loses its last translation is stored as `null`.
- Section seeders call `ensureSeeded(defaults)`, which creates the row only when the table is empty and never overwrites it.
- A section row is created by a seeder, never by an API call. There is no create or delete route for a section.
- Lists of items (services, team members, FAQs) are regular feature modules modelled on `example-content`, not sections.

### 6. Translatable content is one JSONB object per field

- Every admin-managed text field that can differ by language is declared `@TranslatedColumn()` (a `jsonb` column) and typed `TranslatedText` (the default language is always present, guaranteed at runtime by `@IsTranslatedText()` because the default comes from config and cannot be a compile-time type) or `TranslatedTextPatch | null` for nullable fields, from `src/common/types`.
- Not translatable: user submissions, contact info, admin accounts.
- **Two response shapes, deliberately.** Admin endpoints return full `{ hy, en, ru }` objects so the dashboard edits every language from one response. Public endpoints take `@RequestLanguage()` and return plain strings through `localize(text, language)`, which falls back to the default language when a translation is missing or empty.
- **Writes merge, never replace.** DTO fields use `@TrimTranslatedText()` and `@IsTranslatedText({...})`. Create DTOs require the default language. Update DTOs use `partial: true`. Nullable fields add `allowClearingDefault: true`. Services always persist through `mergeTranslatedText(current, patch)`, also on create (with `current = null`). It drops keys set to `''`, which is how an admin removes a translation, so empty strings never reach the database. Pass the generic explicitly inside `repository.create({...})`.
- Uniqueness and search on a translated field use the JSONB operators (`title ->> 'en'`).
- Converting an existing text column to translated is a **hand-edited** migration (`ALTER COLUMN ... TYPE jsonb USING ...`), never a raw `migration:generate`, which would drop the column and lose data.

### 7. Languages come from config

- `SUPPORTED_LANGUAGES` and `DEFAULT_LANGUAGE` set which languages this client uses. A client can run on `hy` alone or on all three. Adding a language to a client is a config change, not a migration. Unset, they default to `hy,en,ru` and `en`. Startup fails if a listed language is not shipped or the default is not in the list.
- `LocalizationModule` applies them at startup (`configureLanguages` in `src/localization/language-settings.ts`). Code reads them through `getSupportedLanguages()` / `getDefaultLanguage()`, never a constant: language resolution, `localize`, `@IsTranslatedText()` (which also rejects languages the client does not use) and the i18n fallback all follow config.
- The template ships `src/i18n/hy`, `src/i18n/en` and `src/i18n/ru`. Every `src/i18n/<lang>/*.json` file has exactly the same key set. A new key goes into every language file in the same change.
- Adding a language the template does not ship means adding its i18n folder and its value to the language enum, together.
- **Request language resolution:** `language` / `x-language` header, then `Accept-Language`, then `DEFAULT_LANGUAGE`. A language not in `SUPPORTED_LANGUAGES` falls back to the default.

### 8. Errors: typed exceptions, translated keys, one response shape

- Feature code throws exceptions that extend `BaseException` (`src/common/exceptions`), passing an i18n **key** (not a message), an `HttpStatus`, and optional `translationArgs` for `{placeholder}`s. Never throw a raw `HttpException`.
- The key must exist in `src/i18n/<lang>/error.json` for every language. A missing key falls back silently to the raw key string, so a typo fails quietly. Check it.
- The global `LocalizedExceptionFilter` (`@Catch()`, registered as `APP_FILTER`) catches everything:
  - `BaseException`: its own key and status.
  - Other `HttpException`s and body-parser errors: a generic per-status key (`NOT_FOUND`, `PAYLOAD_TOO_LARGE`, …).
  - Postgres `23505` / `23503`: `409`. `22P02`: `400`.
  - Anything else: `500 INTERNAL_SERVER_ERROR`. The stack is logged, never sent.
- Every error response has one shape: `{ success: false, statusCode, message, errors?, path, timestamp }`. `errors: [{ field, message }]` appears only on validation failures, with dotted paths for nested fields.
- Validation messages come from `src/i18n/<lang>/validation.json`, keyed by class-validator constraint name, with `{min}` / `{max}` from the decorator. A new validator needs a key there in every language, or its English default leaks through.

### 9. Responses are wrapped by the interceptor

The global `TransformInterceptor` wraps every successful response into `{ success, data }`. Controllers return plain DTOs or entities and never build the envelope themselves.

### 10. Validation lives in DTOs

- `ValidationPipe` runs with `transform: true, whitelist: true`. Unknown properties are stripped. Validate with `class-validator` decorators in DTOs, never manually in services.
- Passwords: `IsStrongPassword` from `src/common/validators` (8+ characters, upper, lower, digit, symbol) on every field that sets or changes a password.
- Phones: `IsValidPhone` from `src/common/validators`, backed by `libphonenumber-js`. Numbers without a `+` country code are validated as Armenian; numbers with one are validated against that country. Do not replace it with a regex.
- Future dates (appointments, events): `IsNotPastDate` alongside `@IsDateString()`. It compares date-only strings to avoid time-zone skew.

### 11. Cross-cutting concerns are registered through DI

- `ValidationPipe`, `LocalizedExceptionFilter`, `TransformInterceptor` and `AppThrottlerGuard` are registered as `APP_PIPE` / `APP_FILTER` / `APP_INTERCEPTOR` / `APP_GUARD` in `CommonModule`, **not** with `app.useGlobal*()` in `main.ts`.
- This matters because e2e tests build `AppModule` directly and never run `main.ts`. Anything wired only in `main.ts` silently does not run in tests. Any new concern that must also hold in tests goes in a module as `APP_*`.
- Only process-level HTTP concerns stay in `main.ts`: `helmet()`, CORS, `trust proxy`, the body-size limit.

### 12. Rate limiting

- `AppThrottlerGuard` (`@nestjs/throttler`) allows 120 requests per minute per IP by default.
- `@SubmissionThrottle()` on public form endpoints, `@LoginThrottle()` on login routes.
- Skipped for `NODE_ENV` `local` / `test`, and for requests with a valid `x-internal-key` header (`INTERNAL_API_KEY`). Only the website's **server-side** content fetches send that header. Never use it from browser code, where it would be public.
- `TRUST_PROXY` must match the number of proxy hops in front of the app, or every visitor shares one IP and one limit.

### 13. CORS

`CORS_ORIGINS` (comma-separated) restricts CORS to that list. When `NODE_ENV=local` and it is unset, all origins are allowed for convenience. In any other environment an empty `CORS_ORIGINS` throws at startup.

### 14. Configuration access

- Read config through `ConfigService.get('<namespace>.<key>')`, never `process.env`, except in `src/configurations/index.ts`, `database/ormconfig.ts` and `database/seeders/**` (standalone CLI entry points outside Nest DI, which call `loadEnvFile()` from `src/configurations`).
- Seed-only secrets (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`) stay out of `ConfigService` entirely.

### 15. Media: S3 holds files, the database holds keys

- Files live in S3. The database stores only the key and metadata in `MediaAssetEntity`.
- Uploads go straight from the browser to S3 through a presigned URL: the admin requests one for an **upload purpose**, uploads, then attaches the returned key to the record.
- Each upload purpose defines its media type, allowed MIME types and size limit. A feature that needs uploads adds its purposes in its own `utils/` and registers them with the media module.
- `attachFromKey` checks that the key belongs to the declared purpose.
- Images get variants (thumbnail, medium, full) through `sharp`.
- Media is served through permanent public URLs (`MEDIA_PUBLIC_BASE_URL`, defaulting to the bucket URL), not expiring signed links.
- **Deleting a record, or replacing an image, also deletes its files from S3, variants included.** The S3 delete runs **after** the database delete or update succeeds, so a failed transaction never leaves a record pointing at a missing file. A failed S3 delete is logged, never thrown back to the admin. Use `MediaService.deleteAssets(assets)`: it deletes the `media_assets` rows inside the current transaction (or its own) and schedules the S3 deletes, original plus every variant, with `runOnTransactionCommit`. Call it from the same `@Transactional()` method that deletes or updates the record. `deleteStoredFiles(keys)` deletes files only, for rows that are already gone.

### 16. Swagger

- Swagger UI is at `/docs` (JSON at `/docs-json`) and is **not mounted** when `NODE_ENV=production`.
- The `@nestjs/swagger` CLI plugin in `nest-cli.json` infers schemas from DTO types and validators. **Do not hand-write `@ApiProperty()`** on DTO fields; it duplicates the plugin and drifts.
- Every controller gets `@ApiTags('<feature>')`. Every route that requires a token gets `@ApiBearerAuth()`, based on whether the route actually requires one.
- Swagger schemas describe the raw return type, not the `{ success, data }` envelope the interceptor adds.

### 17. No comments in code

No `//` or `/* */` comments, ever. Code explains itself through names and structure. Enforced by the `local/no-comments` ESLint rule. The only exceptions are tool directives: `eslint-disable(-next-line)`, `ts-expect-error`, `ts-ignore`, `ts-nocheck`, `prettier-ignore`. Reasoning goes in the PR or in this file.

---

## Database

**PostgreSQL** everywhere, with TypeORM 0.3 and `typeorm-transactional` (`initializeTransactionalContext()` in `main.ts`, `@Transactional()` on service methods that write more than once).

### IDs

Integer auto-increment primary keys. They are simple and searchable ("check request 57"), and guessing ids is not a risk because every non-public endpoint is guarded. No UUIDs and no secondary "readable number" columns.

### Base entities

- Entities extend a base from `src/common/entities`, never declaring id or timestamp columns themselves.
- `TimestampEntity` (adds `createdAt` / `updatedAt`) by default. `AbstractEntity` alone only for a table that genuinely has no timestamps. `SectionEntity` for single-record page sections.

### Entity registration

`database/ormconfig.ts` finds entities with a glob on `*.entity.ts`, so a new entity is picked up by the app, the migration CLI and the seeders automatically. **The only rule: every entity file is named `<name>.entity.ts`.** A differently named file is invisible to TypeORM, so no table is created and the app fails at runtime. `test/database.e2e-spec.ts` fails if any `@Entity` class lives in another file. The app's TypeORM factory also sets `autoLoadEntities: true`, so test-only fixture entities registered with `forFeature` join the DataSource. It changes nothing for `src/` entities, which the glob already loads.

`database/ormconfig.ts` is the single source of truth for connection options, imported by `app.module.ts`, the seeders and the migration CLI.

`migrations` must stay `[join(__dirname, 'migrations', '*.{ts,js}')]`, never a hardcoded `.ts`-only path. The same options run under `ts-node` (CLI, needs `.ts`) and compiled from `dist/` (the app, needs `.js`). A `.ts`-only glob works until the first migration file exists, then breaks every way of running the app.

### Synchronize is off everywhere

`synchronize` is `false` in every environment, local and test included. The schema comes only from migrations, so every developer's database matches what production builds. E2E test setup (`test/global-setup-e2e.ts`) runs the migrations against the test database before the suite, and refuses to run unless `NODE_ENV=test`.

### Migrations

- **One migration per completed task**, generated as soon as the entity change lands (`npm run migration:generate`), run locally, tested on `develop`, then run on production by the deploy.
- Never batch several tasks' schema changes into one migration, and never edit a migration that has already run on `develop` or production. Write a new one.
- Review every generated migration before committing. If it drops and re-adds a column that holds data, hand-edit it into an in-place `ALTER`.
- A new project starts from a single `InitialSchema` baseline migration. Never squash migrations once production holds real data.
- CI fails if entities differ from the migrated schema (`migration:check`).

### Seeders

- Seeders run on **every deploy**, so each one must be safe to rerun: it only creates rows that are missing and **never overwrites** what an admin has edited.
- `seed-all.ts` runs each seeder in its own try/catch, prints a summary and exits non-zero if any failed.
- Every `SectionEntity` row and every fixed reference row the app needs belongs in a seeder.

### Deletes

- **Hard delete by default.** Data nobody will ever access again is removed, not kept as orphans.
- **Soft delete (`deletedAt`) only where history genuinely matters** to the business, such as submissions or orders, and only when the client needs it.
- Deleting a record also deletes its media from S3 (see rule 15).

### Secrets in columns

Secret-bearing columns use `select: false` (e.g. `AdminEntity.password`), so they are excluded from every default query. A dedicated method (`findByEmailWithPassword`, using `createQueryBuilder().addSelect(...)`) opts back in only where the raw value is needed. Never strip secrets from a response after the query instead.

### Lists and pagination

List endpoints take a `PageOptionsDto` (page, limit, order, search) and return a `PageDto` with `PageMetaDto`. Search treats `#<id>` and a bare number as an id lookup and escapes `LIKE` wildcards. Admin list filters are query parameters on the list endpoint, so the dashboard and Telegram "View" buttons can deep-link into a filtered list.

---

## Testing: required before anything is done

Tests are the safety net Claude Code relies on to make sure a change did not break something unrelated. People rarely read them; they must never be weakened.

- **The template ships e2e tests for all of core:** admin login, token expiry, deleted-admin lockout, guards and roles (401 vs 403), admin management, media uploads and deletion, the section base, the exception filter and error shape, validation messages, and language resolution.
- **Every new feature module adds an e2e spec**, copied from `test/example-content.e2e-spec.ts`, covering its public and admin endpoints, auth, validation and status codes.
- **Unit tests** are co-located (`*.service.spec.ts`, `*.controller.spec.ts`) for every service or controller with real logic, with repositories and dependencies mocked. Pure DTOs and barrels need none.
- **E2E tests need a dedicated database.** They run only with `NODE_ENV=test`, read every variable from the shell (never `.env.local`), and run the migrations themselves before the suite, e.g. `NODE_ENV=test POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_USERNAME=postgres POSTGRES_PASSWORD=postgres POSTGRES_DATABASE=<app>_e2e ADMIN_JWT_SECRET=e2e npm run test:e2e -- --runInBand`. A spec that needs other settings sets them with `overrideEnv` before compiling the app and restores them afterwards. A spec builds one `AppModule` at most, because `typeorm-transactional` registers the DataSource once per test file.
- **Run the full suite before declaring work done**, not only the new tests: `npm run lint:check`, `npm run build`, `npm test` and `npm run test:e2e`. Passing tests are part of "done", not a follow-up.
- **Never edit, skip or delete an existing test to make it pass.** If an existing test fails after a change, stop and report it: either the change broke something or the requirement changed, and a person decides which.
- No coverage threshold. The bar is meaningful tests for the logic that was written or changed.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main` and `develop`. Passing CI is **required** before a pull request can be merged.

1. **Checks:** `npm ci`, `npm run lint:check`, `npm run build`, `npm test`.
2. **Database:** against a Postgres service container: run all migrations on an empty database, `migration:check` (fails if an entity changed without a migration), run the seeders against the migrated schema, then the e2e suite with `--runInBand`.

---

## Request lifecycle

1. `main.ts` boots: transactional context, `trust proxy`, body-size limit, helmet, CORS, Swagger (non-production), listen.
2. `AppThrottlerGuard` applies the rate limit.
3. Admin routes: `AdminJwtAuthGuard` verifies the token (signature, expiry, `type: 'admin'`) and loads the admin; `RolesGuard` checks `@Roles(...)` against the loaded admin.
4. `ValidationPipe` validates and transforms the DTO.
5. The controller calls the service. The service writes, then emits events or calls `NotifierService`.
6. `TransformInterceptor` wraps the result in `{ success, data }`.
7. Any error goes through `LocalizedExceptionFilter`, which returns the translated error shape.
8. Listeners in `src/integrations/` handle emitted events (website revalidation) outside the request's success path.

---

## Adding a feature

Using a hypothetical `services` module (a list of services the client offers, managed in the admin, shown on the website):

1. **Module:** copy `src/features/example-content/` to `src/features/services/` and rename. Keep the module layout and barrels.
2. **Entity:** `entities/service.entity.ts` extending `TimestampEntity`. Translatable fields use `@TranslatedColumn()`. The file name ends in `.entity.ts`.
3. **DTOs:** create and update DTOs with `class-validator` decorators; translated fields use `@TrimTranslatedText()` and `@IsTranslatedText()` (`partial: true` on update). No `@ApiProperty()`.
4. **Exceptions:** `ServiceNotFoundException` and others extending `BaseException`; keys added to `error.json` in every language.
5. **Service:** CRUD through the repository, `mergeTranslatedText` on writes, `localize` for public reads. Emit `ContentChangedEvent` with the `services` tag after every write. Delete S3 files after a successful delete.
6. **Controller:** admin routes with `@UseGuards(AdminJwtAuthGuard, RolesGuard)` and `@ApiBearerAuth()`; a public `GET /services/active` with `@Public()` and `@RequestLanguage()`. `@ApiTags('services')` on the controller.
7. **Uploads (if any):** add upload purposes in the module's `utils/` and register them with the media module.
8. **Register:** add the module to `src/app.module.ts`.
9. **Migration:** `npm run migration:generate`, review it, `npm run migration:run`.
10. **Seeder (if needed):** an idempotent seeder under `database/seeders/services/`, registered in `seed-all.ts`.
11. **Tests:** unit spec for the service; e2e spec copied from the example module.
12. **Website:** confirm the website tags its services fetch with `services`, so revalidation reaches it.
13. Run `npm run lint:check && npm run build && npm test && npm run test:e2e`.

For a single editable page section (hero, about), extend `SectionEntity` and `SectionService` instead, and seed its row.
