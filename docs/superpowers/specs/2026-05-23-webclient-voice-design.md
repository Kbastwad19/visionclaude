# VisionClaude Web Voice Client Design
**Date:** 2026-05-23  
**URL:** https://ai.datafeed.cloud  
**Status:** Approved

## Overview
A browser-based voice client served by the existing VisionClaude gateway. The root `/` serves a beautiful "Aside" branded landing page. A password-protected login button grants access to `/app` — the voice chat interface for Meta Ray-Ban Gen 2 glasses. All API keys stay server-side.

## Architecture

```
Glasses mic/speaker ←→ Bluetooth ←→ Phone browser
                                          │
              https://ai.datafeed.cloud/        (landing page)
              https://ai.datafeed.cloud/app     (voice chat, session-gated)
                                          │
                              POST /login (password → session cookie)
                              POST /logout
                              POST /chat (text, session-gated)
                              POST /voice/transcribe (Deepgram STT fallback)
                              POST /voice/speak (Deepgram TTS)
                                          │
                              Express gateway (Docker)
                              ├── session middleware (in-memory)
                              ├── ADMIN_PASSWORD env var
                              ├── GATEWAY_API_KEY stays server-side
                              └── Anthropic API + Deepgram API
```

## Pages

### Landing page (`/`)
The "Aside" branded marketing page (`public/index.html` + JSX files). Served as static files. Login button opens a modal — modal wired to `POST /login` with a password field (single-user, no email/OTP needed). On success, redirect to `/app`.

**Files in `public/`:**
- `index.html` — HTML shell loading React + Babel from CDN
- `app.jsx` — main React app (hero, nav, capabilities, how-it-works, specs, footer, login modal)
- `flow.jsx` — DataFlow and LiveCaptureCard components
- `tweaks-panel.jsx` — design tweaks panel

**Login modal change:** replace email+OTP form with a single password field. Keep all visual design intact. Wire submit to `POST /login`.

### Voice chat (`/app`)
Minimal placeholder page served from `public/app.html`. Contains:
- A "Talk to Claude" button (tap to start mic)
- Session check on load — if not authenticated, redirect to `/`
- Adam provides full voice UI design separately

## STT Flow
1. Browser captures audio via MediaRecorder API
2. Try browser Web Speech API first (free, works on iOS Safari / Android Chrome)
3. If unavailable: POST audio blob to `/voice/transcribe` → Deepgram STT
4. Transcribed text sent to `POST /chat`

## TTS Flow
1. Claude's text response received from `/chat`
2. If DEEPGRAM_API_KEY set: POST text to `/voice/speak` → Deepgram Aura TTS → play audio
3. Fallback: browser SpeechSynthesis API

## New Files
| File | Purpose |
|---|---|
| `src/routes/auth.ts` | POST /login, POST /logout, GET /auth/check |
| `src/routes/voice.ts` | POST /voice/transcribe (Deepgram STT), POST /voice/speak (Deepgram TTS) |
| `src/middleware/session.ts` | express-session config, requireAuth middleware |
| `public/index.html` | Aside landing page (from design files) |
| `public/app.jsx` | Landing page React app |
| `public/flow.jsx` | Flow diagram components |
| `public/tweaks-panel.jsx` | Design tweaks panel |
| `public/app.html` | Placeholder voice chat page (session-gated) |

## Modified Files
| File | Change |
|---|---|
| `public/app.jsx` | Replace email+OTP modal with password field, wire to POST /login |
| `src/index.ts` | Mount auth/voice routes, serve /public static, add session middleware |
| `package.json` | Add express-session, @types/express-session |
| `.env.example` | Add ADMIN_PASSWORD |

## Environment Variables
| Variable | Required | Purpose |
|---|---|---|
| ADMIN_PASSWORD | Yes | Login password for web client |
| DEEPGRAM_API_KEY | No | STT + Aura TTS (browser fallback if absent) |

## Security
- ADMIN_PASSWORD checked server-side only
- GATEWAY_API_KEY and API keys never sent to browser
- Session stored in-memory (single server, single user)
- Session cookie: httpOnly, secure, sameSite=strict
- All /chat, /voice/*, /app routes behind requireAuth
- /login, /, /health, static assets are public
- Session expires after 24 hours
