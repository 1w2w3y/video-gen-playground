# Video Gen Playground

A web UI for generating videos using the **Sora-2** model via Azure AI Foundry or OpenAI APIs.

![Create Video](e2e/screenshots/01-create-video.png)

## Features

- **Text-to-video** generation with configurable resolution, duration, and variants
- **Image-to-video** — upload an image as the first frame
- **Video remix** — apply targeted edits to existing videos via the Sora 2 remix API
- **Job management** — poll status, view, download, and delete generated videos
- **Job isolation** — each user only sees their own jobs (stored in browser localStorage)
- **Admin panel** — optional admin UI to list and bulk-delete all jobs from the remote API
- **Dual provider support** — Azure AI Foundry (Entra ID auth) and OpenAI (API key)
- **Bilingual UI** — English and Chinese, auto-detected from browser language
- **Runtime configuration** — switch provider and deployment without restarting

## Quick Start

### Option A: Docker (recommended)

```bash
docker pull ghcr.io/1w2w3y/video-gen-playground:latest

docker run -p 3000:3000 \
  -e AZURE_ENDPOINT=https://your-resource.openai.azure.com \
  ghcr.io/1w2w3y/video-gen-playground:latest
```

Open http://localhost:3000 in your browser.

### Option B: From source

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set AZURE_ENDPOINT at minimum

# Start dev servers (frontend on :5173, backend on :3000)
npm run dev
```

Open http://localhost:5173 in your browser.

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `PROVIDER` | No | `azure` | `azure` or `openai` |
| `AZURE_ENDPOINT` | If azure | — | e.g. `https://your-resource.openai.azure.com` |
| `AZURE_DEPLOYMENT_NAME` | No | `sora-2` | Model deployment name |
| `AZURE_CLIENT_ID` | No | — | Managed identity client ID (remote deploy) |
| `OPENAI_API_KEY` | If openai | — | OpenAI API key |
| `PORT` | No | `3000` | Backend server port |
| `ADMIN_ENABLED` | No | `false` | Enable admin panel to manage all jobs |

## Authentication

| Environment | Method |
|---|---|
| Local development | Azure CLI token (`az login`) — zero config |
| Remote / deployed | Managed identity via `AZURE_CLIENT_ID` env var |
| OpenAI provider | API key via `OPENAI_API_KEY` env var |

## Architecture

```
Browser (React SPA)  →  Express Backend (/api/*)  →  Azure AI Foundry / OpenAI API
                         ├─ AzureAdapter
                         ├─ OpenAIAdapter
                         └─ EntraID Auth (@azure/identity)
```

The backend proxies all API calls so that tokens and keys never reach the browser.

### Security

- API keys, tokens, and Azure endpoint URLs are **never sent to the browser**
- The job list endpoint (`GET /api/videos`) is removed — clients track their own job IDs in localStorage and query individual job status
- Admin endpoints (`/api/admin/*`) are gated by the `ADMIN_ENABLED` env var (default off)

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, react-router-dom, react-i18next
- **Backend**: Express, @azure/identity
- **Testing**: Vitest (unit), Playwright (E2E)

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express backend only |
| `npm run build` | Type-check and build frontend |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Run E2E tests (Playwright, requires dev server) |

## Docker Image

The Docker image is published to GitHub Container Registry on every push to `main`.

```
ghcr.io/1w2w3y/video-gen-playground
```

**Tags:**
- `latest` — most recent build from `main`
- `0.YYMM.<run>` — versioned (e.g. `0.2603.1`)
- `sha-<commit>` — git commit SHA

**Run with environment variables:**

```bash
docker run -p 3000:3000 \
  -e PROVIDER=azure \
  -e AZURE_ENDPOINT=https://your-resource.openai.azure.com \
  -e AZURE_DEPLOYMENT_NAME=sora-2 \
  ghcr.io/1w2w3y/video-gen-playground:latest
```

## Project Structure

```
src/
├── client/                 # React frontend
│   ├── components/         # Layout, videos, settings, UI components
│   ├── i18n/               # en.json, zh.json, init
│   └── lib/                # API client, constants, utils
└── server/                 # Express backend
    ├── adapters/           # Azure + OpenAI adapter implementations
    ├── auth/               # Entra ID credential provider
    └── routes/             # /api/videos, /api/admin, /api/config
```

## License

[MIT](LICENSE)
