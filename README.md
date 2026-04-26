# Buena Property Context Engine

Hackathon demo for a source-backed property-management context engine. It ingests property data, normalizes records, extracts observations, materializes context artifacts, and exposes a chat/voice UI for agents and property managers.

## What Is Included

- `data/`: demo source dataset for judges.
- `workdir/`: prepared ingest artifacts so the project can be inspected quickly.
- `contexts/`: generated local context views. This remains ignored because users can regenerate it from `data/` and `workdir/`.
- `.env.example`: required environment variable names without secrets.

Secrets are intentionally not committed. Do not commit `.env`, API keys, local runtime state, or generated build output.

## Features

- Historic and incremental ingest pipeline.
- Source registry, normalized artifacts, entity links, observations, semantic triage, fact index, and change sets.
- `Context.md` materialization with managed-section hash protection.
- Manual context edits inside the artifact preview, saved as protected `<user>` blocks.
- Agent chat with narrow tools for context reads, corrections, local vendor search, and notes.
- Entity graph for property, building, unit, owner, tenant, contractor, invoice, and document relationships.
- Gradium voice input/output proxy through the backend so `GRADIUM_API_KEY` never reaches the browser.

## Requirements

- Node.js 22+
- npm
- GitHub CLI only if you need to manage the repository remotely

## Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` with the keys you want to use:

```bash
GEMINI_API_KEY=...
TAVILY_API_KEY=...
GRADIUM_API_KEY=...
```

`GEMINI_API_KEY` is required for the chat agent and semantic extraction. `TAVILY_API_KEY` enables local vendor search. `GRADIUM_API_KEY` enables voice transcription and speech playback.

## Run Locally

```bash
npm run dev
```

This starts:

- API server: `http://localhost:8787`
- Web app: Vite dev URL shown in the terminal

Open the web app and use:

- `/` for the project overview
- `/ingest` for historic/incremental ingest controls
- `/chat` for context chat, entity graph, artifact preview/editing, and voice controls

## Rebuild Context Artifacts

Run a baseline ingest:

```bash
npm run context:ingest:base
```

Run ingest through all included incremental deltas:

```bash
npm run context:ingest
```

Run only the latest incremental delta:

```bash
npm run context:ingest:latest
```

Generate simulated incremental data:

```bash
npm run context:simulate-incremental
```

## Manual Context Edits

In `/chat`, open the `CONTEXT.MD` panel and click `EDIT`. When saved, changed text is wrapped in protected blocks:

```md
<user id="USEREDIT-...-1" author="frontend-user" created_at="..." action="replace">
Human-confirmed correction.
</user>
```

Rules enforced by the app:

- `<user>` blocks are human-confirmed context.
- Ingestion must not delete, rewrite, move, or overwrite them.
- If generated evidence conflicts with a `<user>` block, the user block wins.
- Attempted writes that change protected blocks are blocked.

## Voice Agent

The `VOICE` button in `/chat` records microphone audio in the browser, sends 24kHz PCM to the backend, transcribes it with Gradium STT, submits the transcript to the agent, and plays the final response with Gradium TTS.

The Gradium key is used only by the backend. The browser never receives it.

## Build And Checks

```bash
npm run build
npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --skipLibCheck server/index.ts
```

## Repository

Remote repository:

```text
https://github.com/aditya-ladawa/buena-property-context-engine
```
