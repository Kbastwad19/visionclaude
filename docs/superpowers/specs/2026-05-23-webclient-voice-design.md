# VisionClaude Web Voice Client Design
**Date:** 2026-05-23  
**URL:** https://ai.datafeed.cloud/app  
**Status:** Approved

## Overview
A browser-based voice chat client served by the existing VisionClaude gateway. Users log in with a password, then talk to Claude via the Meta Ray-Ban Gen 2 glasses (Bluetooth mic/speaker paired to phone). The gateway key and API keys never reach the browser.

## Architecture

```
Glasses mic/speaker ←→ Bluetooth ←→ Phone browser
                                          │
                          https://ai.datafeed.cloud/app
                                          │
                              POST /login (password)
                              ← httpOnly session cookie
                                          │
                              POST /chat (text, session-gated)
                              POST /voice/transcribe (audio, Deepgram STT)
                              POST /voice/speak (text, Deepgram TTS)
                                          │
                              Express gateway (Docker)
                              ├── session middleware (in-memory)
                              ├── ADMIN_PASSWORD env var
                              ├── GATEWAY_API_KEY stays server-side
                              └── Anthropic API + Deepgram API
```

## STT Flow
1. Browser captures audio via MediaRecorder API
2. Try browser Web Speech API first (free, no key)
3. If unavailable (Firefox, some Android): send audio blob to POST /voice/transcribe → Deepgram STT
4. Transcribed text sent to POST /chat

## TTS Flow
1. Claude's text response received
2. Try Deepgram Aura TTS first (POST /voice/speak → returns audio buffer → play)
3. If DEEPGRAM_API_KEY not set: fall back to browser SpeechSynthesis API

## New Files
| File | Purpose |
|---|---|
| `src/routes/auth.ts` | POST /login, POST /logout, GET /auth/check |
| `src/routes/voice.ts` | POST /voice/transcribe (Deepgram STT), POST /voice/speak (Deepgram TTS) |
| `src/middleware/session.ts` | express-session config, requireAuth middleware |
| `public/index.html` | Login page + placeholder voice UI (vanilla JS) |

## Modified Files
| File | Change |
|---|---|
| `src/index.ts` | Mount auth/voice routes, serve /public static, add session middleware |
| `package.json` | Add express-session, @types/express-session |
| `.env.example` | Add ADMIN_PASSWORD |

## Environment Variables
| Variable | Required | Purpose |
|---|---|---|
| ADMIN_PASSWORD | Yes | Login password for web client |
| DEEPGRAM_API_KEY | No | STT + Aura TTS (browser fallback used if absent) |

## UI
- **Login page:** Password field + login button. Adam provides full design separately.
- **Post-login:** Placeholder page with single "Talk to Claude" button. Adam provides full voice UI design separately.
- HTTPS only (already enforced by Plesk Nginx)
- Session cookie: httpOnly, secure, sameSite=strict

## Security
- ADMIN_PASSWORD checked server-side only
- GATEWAY_API_KEY and API keys never sent to browser
- Session stored in-memory (single server, single user)
- All routes behind requireAuth middleware except /login and /health
- Session expires after 24 hours
