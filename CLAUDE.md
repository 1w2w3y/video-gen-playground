# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**video-gen-playground** — A web UI for Sora-2 video generation via Azure AI Foundry and OpenAI APIs. React + TypeScript frontend, Express backend proxy.

## Commands

- `npm run dev` — Start both frontend (Vite on :5173) and backend (Express on :3000) concurrently
- `npm run dev:client` — Start only the Vite dev server
- `npm run dev:server` — Start only the Express backend (tsx watch)
- `npm run build` — Type-check and build frontend to dist/client
- `npm run lint` — Run ESLint

## Architecture

- `src/client/` — React SPA (Vite + Tailwind CSS v4 + react-router-dom + react-i18next)
- `src/server/` — Express backend proxy (adapters for Azure/OpenAI, Entra ID auth)
- Backend adapters in `src/server/adapters/` normalize Azure and OpenAI API differences
- Auth: `@azure/identity` — ManagedIdentityCredential (remote, via AZURE_CLIENT_ID) or AzureCliCredential (local)
- i18n: English + Chinese in `src/client/i18n/en.json` and `zh.json`
- Vite proxies `/api/*` to Express in dev mode

## Configuration

Copy `.env.example` to `.env` and fill in values. Key vars: `PROVIDER`, `AZURE_ENDPOINT`, `AZURE_DEPLOYMENT_NAME`, `AZURE_CLIENT_ID`, `OPENAI_API_KEY`.
