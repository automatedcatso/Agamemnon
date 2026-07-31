# Agamemnon

Agamemnon is a local-first academic command centre for a rotating Day Order college schedule. It combines a 2026 calendar, the supplied DO1–DO5 timetable, Saturday STEP class, deadline reminders, searchable study material, image-backed notes, and the Odysseus Gemini assistant.

## Run locally

1. Install dependencies with `npm install`.
2. Keep the Gemini key in `.env.local` as `GEMINI_API_KEY`; never prefix it with `NEXT_PUBLIC_`.
3. Run `npm run dev` and open `http://localhost:3000`.

The supplied key is already configured in the ignored local environment file in this workspace.

## What works in local test mode

- 2026 month and schedule calendar with official academic holidays.
- Automatic Day Order recomputation when a personal holiday is added.
- DO1–DO5 timetable plus the Saturday 12:30 PM–4:30 PM STEP block.
- Live progress and time-remaining labels for today’s classes.
- 75 local study files; 50 PDF/PPTX/DOCX files have content-level search indexes.
- Notes, image references, tasks, and personal holiday changes persist in browser storage.
- Odysseus uses Gemini server-side, can analyse an uploaded image, ground answers with Google Search, and retrieve relevant excerpts from the local study index.
- Browser notification permission and a service worker notification test.

## Vercel deployment

This package is prepared for a standard Vercel Next.js deployment. `public/materials` is included so Study Vault file links remain functional in production. Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in Vercel Project Settings → Environment Variables; the Gemini key remains server-side. See `DEPLOY_TO_VERCEL.md` for the full deployment and verification checklist.

Cross-device data sync and closed-browser scheduled push still require a hosted database, user authentication, persisted Web Push subscriptions, and a scheduler. The current notes, reminders, personal holidays, and chat history are browser-local.

## Validation

- `npm run build`
- `npm test`
- `npm audit --omit=dev`
