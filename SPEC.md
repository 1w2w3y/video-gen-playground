# Video Gen Playground — Project Spec

## 1. Project Overview

A web-based UI for generating videos using the Sora-2 model via **Azure AI Foundry** and **OpenAI** APIs. The app exposes all major API capabilities through an intuitive interface with English/Chinese language support.

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript | Component model, ecosystem, type safety |
| UI library | Tailwind CSS v4 + custom components | Clean defaults, easy theming, minimal bundle |
| Build tool | Vite | Fast dev server, simple config |
| Backend | Node.js (Express) | Proxies API calls, holds secrets, handles auth token acquisition |
| i18n | react-i18next | Mature, supports lazy loading, JSON resource bundles |
| Auth library | `@azure/identity` | Provides `ManagedIdentityCredential` and `AzureCliCredential` |
| State management | React Context + `useState`/`useReducer` | Sufficient for this scope — no global store needed |

## 3. Architecture

```
┌──────────────────────────────────────────────┐
│  Browser (React SPA)                         │
│  ┌────────────┐  ┌────────────┐              │
│  │ Video Gen  │  │ Video List │  ...panels   │
│  └─────┬──────┘  └─────┬──────┘              │
│        └───────┬───────┘                     │
│           fetch /api/*                       │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│  Express Backend (same process)              │
│  ┌──────────────────────────────────────┐    │
│  │ /api/videos/*   →  ApiAdapter        │    │
│  │                    ├─ AzureAdapter    │    │
│  │                    └─ OpenAIAdapter   │    │
│  ├──────────────────────────────────────┤    │
│  │ /api/admin/*    →  Admin routes      │    │
│  │                    (gated by env var) │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ AuthProvider                         │    │
│  │  ├─ ManagedIdentityCredential        │    │
│  │  └─ AzureCliCredential              │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
 Azure AI Foundry      OpenAI API
```

The backend acts as a **proxy** so that:
- Secrets and tokens never reach the browser.
- The Entra ID token acquisition happens server-side.
- A unified internal API is presented to the frontend regardless of which provider is active.

## 4. Authentication

### 4.1 Azure AI Foundry (Entra ID)

| Environment | Credential type | How it works |
|---|---|---|
| **Local dev** | `AzureCliCredential` | Uses token from `az login` session — zero config |
| **Remote / deployed** | `ManagedIdentityCredential` | Pass `AZURE_CLIENT_ID` env var to select the user-assigned managed identity |

Token acquisition flow (server-side):
```
1. On each request to Azure AI Foundry:
   a. Call credential.getToken("https://cognitiveservices.azure.com/.default")
   b. Cache token until near expiry
   c. Attach as  Authorization: Bearer <token>
```

The credential selection logic:
```
if (process.env.AZURE_CLIENT_ID) {
  // Remote: use managed identity with the specified client ID
  credential = new ManagedIdentityCredential(process.env.AZURE_CLIENT_ID);
} else {
  // Local: use az cli login
  credential = new AzureCliCredential();
}
```

### 4.2 OpenAI Direct

Standard API key auth: `Authorization: Bearer $OPENAI_API_KEY`. The key is stored server-side in an environment variable.

## 5. Configuration

All configuration via environment variables (with `.env` file support):

| Variable | Required | Default | Description |
|---|---|---|---|
| `PROVIDER` | No | `azure` | `azure` or `openai` |
| `AZURE_ENDPOINT` | If azure | — | e.g. `https://amg-team-ai-foundry-2508-eus2.openai.azure.com` |
| `AZURE_CLIENT_ID` | No | — | User-assigned managed identity client ID (remote deploy only) |
| `AZURE_DEPLOYMENT_NAME` | No | `sora-2` | Model deployment name in Azure AI Foundry |
| `OPENAI_API_KEY` | If openai | — | OpenAI API key |
| `PORT` | No | `3000` | Server port |
| `ADMIN_ENABLED` | No | `false` | Enable admin panel to list/delete all jobs from all users |

The UI also exposes a **Settings panel** where the user can switch provider and update the deployment name at runtime (stored in server memory, not persisted to disk). The Azure endpoint is not exposed in the config API response — only a boolean indicating whether it is configured.

## 6. API Abstraction Layer

Both providers offer similar capabilities but differ in parameter naming and endpoint paths. The backend normalizes these behind a unified internal API.

### 6.1 Unified Internal API (Backend → Frontend)

| Route | Method | Description |
|---|---|---|
| `POST /api/videos` | Create | Submit a video generation job |
| `GET  /api/videos/:id` | Status | Get job status and metadata |
| `GET  /api/videos/:id/content` | Download | Stream the generated video binary |
| `DELETE /api/videos/:id` | Delete | Delete a video |
| `POST /api/videos/edits` | Edit/Remix | Remix an existing video |
| `GET  /api/config` | Config | Return current provider, capabilities, admin status |
| `PUT  /api/config` | Config | Update provider/deployment at runtime |
| `GET  /api/admin/videos` | Admin | List all video jobs (gated by `ADMIN_ENABLED`) |
| `DELETE /api/admin/videos/:id` | Admin | Delete any video job (gated by `ADMIN_ENABLED`) |

**Note:** There is no `GET /api/videos` (list all) endpoint. Each client tracks its own job IDs in browser localStorage and queries individual job status via `GET /api/videos/:id`. This prevents users from seeing other users' jobs.

### 6.2 Parameter Mapping

| Unified (internal) | Azure AI Foundry | OpenAI |
|---|---|---|
| `prompt` | `prompt` | `prompt` |
| `width` × `height` | `size` (e.g. `"1280x720"`) | `size` (e.g. `"1280x720"`) |
| `duration` | `seconds` (as string) | `seconds` (as number) |
| `variants` | `n` | `n` |
| `model` | deployment name from config | `sora-2` / `sora-2-pro` |
| `inputImage` | base64 in request body | base64 in request body |

### 6.3 Status Mapping

| Unified | Azure | OpenAI |
|---|---|---|
| `queued` | `queued` | `queued` |
| `processing` | `preprocessing` / `running` / `processing` / `in_progress` | `in_progress` |
| `completed` | `succeeded` | `completed` |
| `failed` | `failed` / `cancelled` | `failed` / `expired` |

## 7. UI Design

### 7.1 Layout

Single-page app with a sidebar navigation:

```
┌─────────┬──────────────────────────────────┐
│ Sidebar │  Main Content Area               │
│         │                                  │
│ ▸ New   │  (active panel content)          │
│ ▸ Jobs  │                                  │
│ ▸ Admin │  (only if ADMIN_ENABLED)         │
│ ▸ Cfg   │                                  │
│         │                                  │
│ [EN|中] │                                  │
│         │                                  │
└─────────┴──────────────────────────────────┘
```

### 7.2 Panels

#### Panel 1: Create Video (`/`)

- **Prompt** — multiline text area
- **Resolution** — dropdown (filtered by current provider's supported sizes)
  - Azure: 1280×720, 720×1280, 1792×1024, 1024×1792
  - OpenAI: 1280×720, 720×1280, 1920×1080, 1080×1920, 1792×1024, 1024×1792
- **Duration** — dropdown
  - Azure: 4, 8, or 12 seconds
  - OpenAI: 8, 16, or 20 seconds
- **Variants** — number input (1–4)
- **Model** — dropdown (OpenAI: `sora-2`, `sora-2-pro`; Azure: deployment name)
- **Input image** (optional) — file upload for image-to-video, with preview
- **Submit button** → creates job, saves job ID to localStorage, navigates to Jobs panel

#### Panel 2: Video Jobs (`/jobs`)

- Card list of jobs tracked in browser localStorage
- Each card shows: prompt (truncated), status badge, resolution, duration, created time
- Auto-refresh status every 5 seconds for non-terminal jobs (polling)
- Click a job → **Job Detail** view:
  - Full prompt text
  - Status with progress indicator
  - When completed: embedded `<video>` player with download button
  - Action buttons: **Remix** (creates remix job), **Delete**

#### Panel 3: Remix Video (`/edit/:id`)

- Opened from a completed job's detail view
- Shows source video preview
- **Remix prompt** — text area describing the change
- Submit → calls `POST /videos/{id}/remix` on the remote API, creates a new job

#### Panel 4: Admin Jobs (`/admin/jobs`) — gated by `ADMIN_ENABLED`

- Sortable table of **all** jobs from the remote API (including other users' jobs)
- Columns: checkbox, ID, Prompt, Status, Resolution, Duration, Created, Actions
- Click column headers to sort ascending/descending
- Multi-select with select-all checkbox and bulk delete button
- Prompts are loaded in background (list API doesn't return them)

#### Panel 5: Settings (`/settings`)

- **Provider** toggle: Azure AI Foundry / OpenAI
- **Azure endpoint** — shows configured/not configured status; input to change (value not displayed)
- **Azure deployment name** — text input (value displayed and editable)
- **OpenAI API key** — password input (only shown when provider = openai; stored server-side)
- Save button → `PUT /api/config`

### 7.3 Shared UI Elements

- **Toast notifications** for errors and success messages
- **Loading spinners / skeleton screens** during API calls
- **Status badges**: colored chips for `queued` (gray), `processing` (blue/animated), `completed` (green), `failed` (red)
- **Responsive**: works on desktop; mobile is not a priority but should not break

## 8. Internationalization (i18n)

Two display languages: **English** (`en`) and **Chinese** (`zh`).

### Implementation

- Translation files: `src/client/i18n/en.json` and `src/client/i18n/zh.json`
- Language toggle in sidebar footer (persisted to `localStorage`)
- All user-visible strings go through `t()` function — no hardcoded text
- Date/time formatting respects locale
- UI prompts, labels, error messages, status text, tooltips all translated

### Scope

Only the **UI chrome** is translated. User-entered prompts and API-returned data (error messages, video metadata) are displayed as-is.

## 9. Error Handling

| Scenario | Behavior |
|---|---|
| Auth token expired / invalid | Auto-refresh token; if fails, show "Re-authenticate" message |
| 429 rate limit | Show toast with retry-after time; disable submit button temporarily |
| Job failed | Show error reason from API in job detail view |
| Network error | Toast with retry option |
| Invalid input (client-side) | Inline form validation before submit |

## 10. Security Considerations

- API keys, tokens, and Azure endpoint URLs are **never sent to the browser**. All API calls go through the Express backend.
- The config API returns `hasAzureEndpoint` (boolean) instead of the actual endpoint URL.
- The Settings panel API key input is write-only (never sent back to the frontend after being set).
- The job list endpoint is removed — clients track their own job IDs in localStorage and query individual status, preventing users from seeing other users' jobs.
- Admin endpoints are gated by `ADMIN_ENABLED` env var (default `false`); returns 403 when disabled.
- Input validation on the backend for all user-supplied parameters.
- CORS restricted to same-origin in production.

## 11. Development Phases

### Phase 1: Foundation (MVP) — Complete
- [x] Project scaffolding (Vite + React + TypeScript + Tailwind)
- [x] Express backend with proxy architecture
- [x] Azure AI Foundry adapter (text-to-video only)
- [x] Entra ID auth (AzureCliCredential for local dev)
- [x] Create Video panel (prompt, resolution, duration, variants)
- [x] Jobs list with status polling and video playback
- [x] Basic English UI

### Phase 2: Full Feature Set — Complete
- [x] OpenAI adapter
- [x] Provider switching in Settings panel
- [x] Image-to-video upload
- [x] Video remix support (via Sora 2 remix API)
- [x] Delete videos
- [x] Chinese translation (i18n)

### Phase 3: Polish — Complete
- [x] ManagedIdentityCredential for remote deployment
- [x] Runtime endpoint configuration
- [x] Error handling improvements
- [x] Loading states and skeleton screens
- [x] Unit tests (Vitest) and E2E tests (Playwright)

### Phase 4: Security & Admin — Complete
- [x] Job isolation — localStorage-based job tracking instead of listing all jobs
- [x] Hide Azure endpoint from config API response
- [x] Admin panel with sortable table, multi-select, and bulk delete (gated by ADMIN_ENABLED)
- [x] Fix remix API to use correct Sora 2 endpoint (`POST /videos/{id}/remix`)
- [x] Remove unsupported extend video feature

## 12. File Structure

```
video-gen-playground/
├── src/
│   ├── client/                  # React frontend
│   │   ├── components/
│   │   │   ├── layout/          # Layout, Sidebar
│   │   │   ├── videos/          # CreateVideo, JobList, JobDetail, EditVideo, AdminJobList
│   │   │   ├── settings/        # SettingsPanel
│   │   │   └── ui/              # StatusBadge, Toast
│   │   ├── i18n/
│   │   │   ├── en.json
│   │   │   ├── zh.json
│   │   │   └── index.ts
│   │   ├── lib/                 # API client, constants, utils (+ unit tests)
│   │   ├── test-setup.ts        # Vitest setup for jsdom environment
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── server/                  # Express backend
│       ├── adapters/
│       │   ├── types.ts         # Unified video API types
│       │   ├── azure.ts         # Azure AI Foundry adapter
│       │   ├── openai.ts        # OpenAI adapter
│       │   └── index.ts         # Adapter factory
│       ├── auth/
│       │   └── azure-credential.ts
│       ├── routes/
│       │   ├── videos.ts        # /api/videos (create, get, delete, edit)
│       │   ├── admin.ts         # /api/admin/videos (list all, delete)
│       │   └── config.ts        # /api/config
│       ├── config.ts            # Server config singleton
│       └── index.ts             # Express entry point
├── e2e/                         # Playwright E2E tests
│   └── smoke.spec.ts
├── .github/workflows/
│   └── docker-publish.yml  # CI: build & push Docker image to GHCR
├── Dockerfile              # Multi-stage build (build frontend → production image)
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── CLAUDE.md
├── spec.md
└── README.md
```

## 13. Docker & CI/CD

### Docker Image

The app is packaged as a multi-stage Docker image (`Dockerfile`):
1. **Build stage** — installs all deps, runs `npm run build` to produce the frontend bundle
2. **Production stage** — installs production deps only, copies server source and built frontend

Image: `ghcr.io/1w2w3y/video-gen-playground`

### CI Pipeline (GitHub Actions)

`.github/workflows/docker-publish.yml` runs on every push to `main`:
1. Checks out the repo
2. Logs in to GitHub Container Registry using the built-in `GITHUB_TOKEN`
3. Builds and pushes the Docker image with three tags:
   - `0.YYMM.<run_number>` — versioned (e.g. `0.2603.1`)
   - `sha-<commit>` — git commit SHA
   - `latest`

The workflow can also be triggered manually via `workflow_dispatch`.

## 14. API Reference Summary

### Azure AI Foundry Sora-2

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /openai/v1/videos` | Create | Submit a video generation job |
| `GET  /openai/v1/videos` | List | List all video jobs |
| `GET  /openai/v1/videos/{id}` | Status | Get job status and metadata |
| `GET  /openai/v1/videos/{id}/content?variant=video` | Download | Stream the generated video |
| `DELETE /openai/v1/videos/{id}` | Delete | Delete a video |
| `POST /openai/v1/videos/{id}/remix` | Remix | Remix an existing video with a new prompt |

Auth: `Authorization: Bearer <entra_token>` with scope `https://cognitiveservices.azure.com/.default`

Supported resolutions: 1280×720, 720×1280, 1792×1024, 1024×1792
Duration: 4, 8, or 12 seconds

### OpenAI Sora-2

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /v1/videos` | Create video |
| `GET  /v1/videos/{id}` | Get status |
| `GET  /v1/videos/{id}/content?variant=video` | Download video |
| `GET  /v1/videos` | List videos |
| `DELETE /v1/videos/{id}` | Delete video |
| `POST /v1/videos/{id}/remix` | Remix video |

Auth: `Authorization: Bearer <api_key>`

Supported resolutions: 1280×720, 720×1280, 1920×1080, 1080×1920, 1792×1024, 1024×1792
Duration: 8, 16, or 20 seconds
Models: `sora-2`, `sora-2-pro`
