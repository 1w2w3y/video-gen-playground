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

The UI also exposes a **Settings panel** where the user can switch provider and update the Azure endpoint at runtime (stored in server memory, not persisted to disk).

## 6. API Abstraction Layer

Both providers offer similar capabilities but differ in parameter naming and endpoint paths. The backend normalizes these behind a unified internal API.

### 6.1 Unified Internal API (Backend → Frontend)

| Route | Method | Description |
|---|---|---|
| `POST /api/videos` | Create | Submit a video generation job |
| `GET  /api/videos` | List | List all video jobs (with pagination) |
| `GET  /api/videos/:id` | Status | Get job status and metadata |
| `GET  /api/videos/:id/content` | Download | Stream the generated video binary |
| `DELETE /api/videos/:id` | Delete | Delete a video |
| `POST /api/videos/extensions` | Extend | Extend an existing video (OpenAI only initially) |
| `POST /api/videos/edits` | Edit | Remix/edit an existing video |
| `GET  /api/config` | Config | Return current provider, endpoint, capabilities |
| `PUT  /api/config` | Config | Update provider/endpoint at runtime |

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
- **Submit button** → creates job, navigates to Jobs panel

#### Panel 2: Video Jobs (`/jobs`)

- Table/card list of all submitted jobs
- Columns: ID (short), prompt (truncated), status badge, resolution, duration, created time
- Auto-refresh status every 5 seconds for non-terminal jobs (polling)
- Click a job → **Job Detail** view:
  - Full prompt text
  - Status with progress indicator
  - When completed: embedded `<video>` player with download button
  - Action buttons: **Extend** (creates extension job), **Edit/Remix**, **Delete**

#### Panel 3: Extend Video (`/extend/:id`)

- Opened from a completed job's detail view
- Shows source video preview
- **Continuation prompt** — text area
- **Additional duration** — dropdown
- Submit → creates extension job

#### Panel 4: Edit/Remix Video (`/edit/:id`)

- Opened from a completed job's detail view
- Shows source video preview
- **Edit prompt** — text area describing the change
- Submit → creates edit job

#### Panel 5: Settings (`/settings`)

- **Provider** toggle: Azure AI Foundry / OpenAI
- **Azure endpoint** — text input (only shown when provider = azure)
- **Azure deployment name** — text input
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

- Translation files: `src/i18n/en.json` and `src/i18n/zh.json`
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

- API keys and tokens are **never sent to the browser**. All API calls go through the Express backend.
- The Settings panel API key input is write-only (never sent back to the frontend after being set).
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
- [x] Video extension support
- [x] Video edit/remix support
- [x] Delete videos
- [x] Chinese translation (i18n)

### Phase 3: Polish — Complete
- [x] ManagedIdentityCredential for remote deployment
- [x] Runtime endpoint configuration
- [x] Error handling improvements
- [x] Loading states and skeleton screens
- [x] Unit tests (Vitest) and E2E tests (Playwright)

## 12. File Structure

```
video-gen-playground/
├── src/
│   ├── client/                  # React frontend
│   │   ├── components/
│   │   │   ├── layout/          # Layout, Sidebar
│   │   │   ├── videos/          # CreateVideo, JobList, JobDetail, ExtendVideo, EditVideo
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
│       │   ├── videos.ts
│       │   └── config.ts
│       ├── config.ts            # Server config singleton
│       └── index.ts             # Express entry point
├── e2e/                         # Playwright E2E tests
│   └── smoke.spec.ts
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── CLAUDE.md
├── SPEC.md
└── README.md
```

## 13. API Reference Summary

### Azure AI Foundry Sora-2

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /openai/v1/videos` | Create | Submit a video generation job |
| `GET  /openai/v1/videos` | List | List all video jobs |
| `GET  /openai/v1/videos/{id}` | Status | Get job status and metadata |
| `GET  /openai/v1/videos/{id}/content?variant=video` | Download | Stream the generated video |
| `DELETE /openai/v1/videos/{id}` | Delete | Delete a video |
| `POST /openai/v1/videos/extensions` | Extend | Extend an existing video |
| `POST /openai/v1/videos/edits` | Edit | Edit/remix an existing video |

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
| `POST /v1/videos/extensions` | Extend video |
| `POST /v1/videos/edits` | Edit/remix video |

Auth: `Authorization: Bearer <api_key>`

Supported resolutions: 1280×720, 720×1280, 1920×1080, 1080×1920, 1792×1024, 1024×1792
Duration: 8, 16, or 20 seconds
Models: `sora-2`, `sora-2-pro`
