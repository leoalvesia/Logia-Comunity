# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the full stack (Docker)

```bash
# Build and start all services (API :8001, Web :3001, Postgres :5433, Redis :6380, pgAdmin :5051)
docker-compose -f docker-compose.community.yml up -d

# Rebuild a specific service after code changes — ALWAYS required, no hot reload in production build
docker-compose -f docker-compose.community.yml build api   # or web / worker
docker-compose -f docker-compose.community.yml up -d --force-recreate api

# Run DB migrations (required after adding new migration files)
docker exec logia_community_api bash -c "cd /workspace/app && alembic -c alembic/alembic.ini upgrade head"

# Create new migration (run inside container after model changes)
docker exec logia_community_api bash -c "cd /workspace/app && alembic -c alembic/alembic.ini revision --autogenerate -m 'description'"

# View logs
docker-compose -f docker-compose.community.yml logs -f api
docker-compose -f docker-compose.community.yml logs -f web

# Stop everything
docker-compose -f docker-compose.community.yml down
```

URLs: API docs → http://localhost:8001/docs · Web → http://localhost:3001 · pgAdmin → http://localhost:5051

### Critical Docker details
- **Web is a production build** (`npm run build` + `npm start`). There is NO hot reload. Every change to `apps/web` or `packages/` requires `docker-compose build web` + `force-recreate`.
- **API is also a production build** — same rule applies. Code changes require `docker-compose build api`.
- API module path inside container: `app.*` (not `apps.api.*`). Container working dir is `/workspace`, app code at `/workspace/app/`.
- Alembic must run from `/workspace/app/` with `-c alembic/alembic.ini`.
- `Web` uses `Dockerfile.web` at monorepo root (not `apps/web/Dockerfile`) — npm workspaces require monorepo context.
- `bcrypt` pinned to `3.2.2` — passlib 1.7.4 is incompatible with bcrypt 4.x.
- **Alembic revision IDs must be ≤ 32 characters** — the `alembic_version` table uses `VARCHAR(32)`. Use short IDs like `003_video_provider`, not `003_add_video_provider_to_lessons`.

## Local dev (without Docker)

### Backend (`apps/api`)
```bash
# Must run from /logia-community (workspace root) so relative imports work
cd apps/api && pip install -r requirements.txt
DATABASE_URL=postgresql+asyncpg://logia:logia_dev_password@localhost:5433/logia \
  uvicorn app.main:app --reload --port 8000

alembic -c alembic/alembic.ini upgrade head
```

### Frontend (`apps/web`)
```bash
# Run from monorepo root
npm install
cd apps/web && npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
```

## Architecture

### Deployment (production)

```bash
# 1. Create secrets in Modal (once)
modal secret create logia-secrets DATABASE_URL=... REDIS_URL=... JWT_SECRET=... STRIPE_SECRET_KEY=... ...

# 2. Deploy API + scheduled tasks
modal deploy apps/api/modal_app.py

# 3. Frontend on Vercel — connect repo, set env vars:
#    NEXT_PUBLIC_API_URL  → Modal app URL (shown after deploy)
#    NEXT_PUBLIC_WS_URL   → same URL (Modal supports WebSockets)
#    NEXT_PUBLIC_STRIPE_PRICE_DISPLAY → "R$ 97/mês"
```

Serve locally (hot reload): `modal serve apps/api/modal_app.py`

### Request flow
```
Browser → Vercel (Next.js)
  ├── REST  → Modal (FastAPI) → Supabase PostgreSQL
  ├── WS    → Modal (FastAPI /ws) → Upstash Redis pub/sub
  └── Video → YouTube / Vimeo iframe (no upload, no CDN cost)
```

### Async tasks
- **Email notifications** (welcome, comment): called via FastAPI `BackgroundTasks` → `app/workers/tasks.py`
- **Hourly event reminders**: Modal scheduled function in `modal_app.py` → `run_event_reminders()` in `tasks.py`
- **No Celery, no separate worker process**

### Backend (`apps/api`) — module path `app.*` in Docker

- `main.py` — FastAPI entry: CORS, slowapi rate limiting (100/min/IP), WebSocket manager, Redis pub/sub listener, all routers
- `core/config.py` — Pydantic Settings; all env vars with defaults; `allowed_origins` is comma-separated string → `allowed_origins_list` property
- `core/auth.py` — `get_current_active_user` dep, `require_role("admin")` decorator, `hash_password` / `verify_password` (bcrypt via passlib); Redis token helpers: `store_refresh_token`, `revoke_refresh_token`, `is_refresh_token_valid`, `blacklist_access_token`, `is_access_token_blacklisted`
- `core/require_paid.py` — FastAPI dep that raises 403 when `profile.is_paid == False`
- `models/` — SQLAlchemy v2 async ORM; UUID PKs throughout; `profile.py` has Stripe subscription columns + `is_paid` bool
- `routers/payments.py` — Stripe checkout session, billing portal, subscription status
- `routers/webhooks.py` — handles 7 Stripe event types; `_resolve_profile()` tries `metadata.user_id` first then `stripe_customer_id`; idempotency via `stripe_event_id_last`
- `routers/courses.py` — lesson CRUD; `PATCH /lessons/{id}` accepts `video_provider` (youtube|vimeo) and `video_url` (the video ID); no upload endpoints
- `services/courses_service.py` — only `generate_slug()` remains; Bunny/R2 code removed
- `services/points_service.py` — always use `award_points()` for gamification; triggers level-up check + WebSocket broadcast
- `alembic/versions/` — `001_initial_schema.py`, `002_subscription_fields.py`, `003_add_video_provider_to_lessons.py` (revision: `003_video_provider`)

### Frontend (`apps/web`)

- `lib/api.ts` — single typed fetch client; auto-refreshes JWT on 401; `getVideoUploadUrl` returns `{ upload_url, upload_headers }` — `upload_headers` must be forwarded in the XHR
- `lib/utils.ts` — 9-level system (Iniciante → Ícone); `levelName()`, `levelColor()`, `levelProgress()`, `pointsToNextLevel()`; also exports `extractVimeoId(url)` and `extractYoutubeId(url)` video URL parsers
- `stores/auth.ts` — Zustand; source of truth for `user` + tokens; tokens stored in `localStorage` as `logia_access_token` / `logia_refresh_token`
- `stores/notifications.ts` — Zustand; `addNotification`, `markAsRead`, `markAllAsRead`, `clearAll`, `wsConnected`
- `stores/gamification.ts` — Zustand; `triggerLevelUp()`, `addPointsToast()`; `ACTION_LABELS` maps backend action strings to Portuguese
- `hooks/useWebSocket.ts` — connects to `NEXT_PUBLIC_WS_URL`; handles `level_up` / `points_earned` events → updates both gamification store and auth store user object
- `hooks/useSubscription.ts` — React Query (stale 60s); exposes `isPaid`, `isPastDue`, `cancelAtPeriodEnd`
- `components/admin/LessonForm.tsx` — video section: provider select (youtube|vimeo); URL input, ID extracted via `extractYoutubeId`/`extractVimeoId` from `lib/utils.ts` before saving. Video section only visible when editing (not creating).
- `components/classroom/LessonPlayer.tsx` — renders `YoutubePlayer` (iframe) or `VimeoPlayer` (iframe) based on `lesson.video_provider`
- `components/gamification/LevelUpCelebration.tsx` — full-screen overlay; auto-dismiss 8s; `prefers-reduced-motion` aware
- `components/gamification/PointsToast.tsx` — bottom-right pill stack; milestone (≥50pts) uses teal `#4ECDC4`
- `components/members/MemberMap.tsx` — dynamically imported (SSR disabled); Mapbox + supercluster; requires `NEXT_PUBLIC_MAPBOX_TOKEN`
- `components/notifications/NotificationBell.tsx` — Radix Popover; `size="sm"` (mobile) or `"md"` (sidebar)
- `components/paywall/PaywallGate.tsx` — blurs children when `!isPaid`; renders upsell or past_due UI
- `app/checkout/success/page.tsx` — polls `paymentsApi.status()` up to 10× (1.5s interval) waiting for Stripe webhook to propagate

### Shared packages

- `packages/shared-types/index.ts` — TypeScript interfaces; import as `"shared-types"` (not `@logia/shared-types`). `Lesson.video_provider` is `"youtube" | "vimeo" | null`.
- `packages/ui-tokens/` — brand tokens; primary `#FF6B2B`, secondary `#1A1A2E`, accent `#4ECDC4`

### WebSocket event types
`new_post`, `new_comment`, `reaction_added`, `event_reminder`, `points_earned`, `level_up`, `video_processed`, `connected`, `ping`

### Video system

Two providers via `lessons.video_provider` (`VARCHAR(20)`, default `'youtube'`):

| Provider | `video_url` stores | Player |
|---|---|---|
| `youtube` | YouTube video ID (e.g. `dQw4w9WgXcQ`) | `<iframe src="https://www.youtube.com/embed/{id}">` |
| `vimeo` | Vimeo video ID (e.g. `1174384175`) | `<iframe src="https://player.vimeo.com/video/{id}">` |

Admin pastes full URL → frontend extracts ID via `extractYoutubeId`/`extractVimeoId` → saves ID to `video_url` + sets `video_provider`. No upload, no storage cost.

### Stripe webhook identity resolution
`_resolve_profile()` in `webhooks.py` first checks `event.data.object.metadata.user_id` (set at checkout session creation), then falls back to matching `stripe_customer_id`. Idempotency: return early if `profile.stripe_event_id_last == event.id`.

## Key conventions

- **Token invalidation**: logout requires `{ refresh_token }` body. Blacklists access token jti (`blacklist:{jti}`, TTL = remaining seconds) and revokes refresh token (`refresh_token:{jti}` deleted from Redis). `get_current_user` checks blacklist on every request. Refresh endpoint rotates tokens (old jti deleted, new jti stored).
- **HTML**: `bleach` sanitizes on backend write; `DOMPurify` on frontend render — both are required
- **Soft deletes**: `posts`, `comments`, `profiles` have `deleted_at` — never hard delete
- **Points**: always `award_points(db, user_id, amount, action, reference_id)` — never update `profile.points` directly
- **Admin guards**: `require_role("admin")` on every admin endpoint — never rely on frontend-only role checks
- **Slugs**: courses use slugs in URLs; generated by `generate_slug()` in `courses_service.py`; uniqueness enforced in router
- **Timezone**: store UTC; display `America/Sao_Paulo`
- **Shared types import**: use `"shared-types"` (bare), not `"@logia/shared-types"` — tsconfig paths maps it correctly
- **Alembic revision IDs**: keep ≤ 32 chars (e.g. `003_video_provider`, not `003_add_video_provider_to_lessons`)

## LGPD (Lei Geral de Proteção de Dados)

Implementado em `routers/auth.py`:
- `GET /api/v1/auth/me/data-export` — exporta todos os dados pessoais como JSON (Art. 18 portabilidade)
- `DELETE /api/v1/auth/me` — anonimiza PII + cancela Stripe + define `status="deleted"` (Art. 18 eliminação)

## Deploy checklist (first production deploy)

```
CONFIGURAÇÃO (uma vez):
[ ] modal secret create logia-secrets DATABASE_URL=... REDIS_URL=... JWT_SECRET=$(openssl rand -hex 32) STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... STRIPE_PRICE_ID=... FRONTEND_URL=... RESEND_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
[ ] Adicionar GitHub secrets: MODAL_TOKEN_ID, MODAL_TOKEN_SECRET, VERCEL_TOKEN
[ ] Configurar vars no Vercel: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_STRIPE_PRICE_DISPLAY, NEXT_PUBLIC_MAPBOX_TOKEN

DEPLOY:
[ ] modal deploy apps/api/modal_app.py    # copiar URL do output
[ ] Conectar repo no Vercel → deploy automático
[ ] Rodar migrations: alembic -c alembic/alembic.ini upgrade head
[ ] Configurar webhook Stripe: <MODAL_URL>/api/v1/webhooks/stripe
      eventos: customer.subscription.*, invoice.payment_*

VALIDAÇÃO:
[ ] Login (Google OAuth + Magic Link)
[ ] Fluxo de pagamento (Stripe + webhook)
[ ] WebSocket (notificações em tempo real)
[ ] Endpoints admin (criar aula, evento)
```

## CI/CD (GitHub Actions)

Três workflows em `.github/workflows/`:
- `ci.yml` — em PRs: lint + type-check para API (ruff) e web (ESLint + tsc)
- `deploy-api.yml` — push em `main` com mudanças em `apps/api/**` → `modal deploy apps/api/modal_app.py`
- `deploy-web.yml` — push em `main` com mudanças em `apps/web/**` ou `packages/**` → `vercel deploy --prod`

Secrets necessários no GitHub:
- `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` — via `modal token new`
- `VERCEL_TOKEN` — nas configurações da conta Vercel

## Critical production fixes (applied 2026-03-26)

### Modal Python path
`modal_app.py` uses `add_local_dir("apps/api", remote_path="/root/app", copy=True)` + a `.pth` file to put `/root` on sys.path so `from app.main import app` works at runtime. Do not remove these lines.

### Supabase — use pooler URL (IPv4), not direct connection
Modal containers do not support IPv6. Supabase's direct connection (`db.<ref>.supabase.co:5432`) resolves to IPv6 and will fail with `Network is unreachable`.

**Always use the pooler URL:**
```
postgresql+asyncpg://postgres.<ref>:<password>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

`core/database.py` does NOT need `connect_args={"statement_cache_size": 0}`. The Supavisor pooler (port 6543) works correctly with asyncpg's default prepared statement cache. Setting `statement_cache_size=0` actually causes `DuplicatePreparedStatementError` because multiple pool connections try to create the same named statement on recycled server connections.

### Admin user
Created directly in DB: email `leoalvesia@gmail.com`, role `admin`, `is_paid=true`. Password hashed with bcrypt.

### Migrations
All 3 Alembic migrations were applied directly via Supabase SQL editor (not alembic CLI) due to Windows path issues. Do not re-run them — they are already applied.

## Environment variables

See `apps/api/.env.example` for the full list. Summary:

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Modal secret | **Pooler URL:** `postgresql+asyncpg://postgres.<ref>:<pw>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres` |
| `REDIS_URL` | Modal secret | `rediss://...` (Upstash) |
| `JWT_SECRET` | Modal secret | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | Modal secret | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Modal secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Modal secret | monthly price ID |
| `FRONTEND_URL` | Modal secret | Vercel deploy URL |
| `ALLOWED_ORIGINS` | Modal secret | comma-separated; must include Vercel URL |
| `RESEND_API_KEY` | Modal secret | optional; emails skipped if absent |
| `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | Modal secret | for storage |
| `NEXT_PUBLIC_API_URL` | Vercel env | Modal app URL |
| `NEXT_PUBLIC_WS_URL` | Vercel env | same as API URL |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Vercel env | optional; member map hidden if absent |
| `NEXT_PUBLIC_STRIPE_PRICE_DISPLAY` | Vercel env | e.g. `R$ 97/mês` |
