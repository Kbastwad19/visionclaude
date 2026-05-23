# VisionClaude Docker Deployment Design
**Date:** 2026-05-23  
**Domain:** ai.datafeed.cloud  
**Status:** Approved

## Overview
Deploy the VisionClaude gateway server (Node.js/Express/TypeScript) in a Docker container on a Plesk server, exposed via HTTPS at ai.datafeed.cloud with Let's Encrypt SSL managed by Plesk Nginx.

## Architecture
```
Ray-Ban Glasses
       │  HTTPS (443)
       ▼
ai.datafeed.cloud
       │
Plesk Nginx (SSL termination, Let's Encrypt auto-renewed)
       │  proxy_pass → 127.0.0.1:18790
       ▼
Docker container: visionclaude (ClaudeVision/server)
  • Node.js/Express on port 18790
  • GATEWAY_API_KEY gates all endpoints
  • Calls Anthropic API with your key
  • Deepgram API key in .env (integration added in Phase 2)
```

## Files Created
- `ClaudeVision/server/Dockerfile` — Node 22 Alpine, builds TypeScript, prunes devDeps
- `docker-compose.yml` — single service, port bound to 127.0.0.1 only, env_file
- `.env.example` — template for ANTHROPIC_API_KEY, DEEPGRAM_API_KEY, GATEWAY_API_KEY, PORT
- `deploy.sh` — git pull + docker compose up --build -d

## Environment Variables
| Variable | Required | Purpose |
|---|---|---|
| ANTHROPIC_API_KEY | Yes | Claude API access |
| DEEPGRAM_API_KEY | No (Phase 2) | STT + Aura TTS — server integration not yet built |
| GATEWAY_API_KEY | Yes | Endpoint authentication |
| PORT | No (default 18790) | Internal port |

## Plesk Configuration
1. Create `ai.datafeed.cloud` as Blank website in Plesk
2. Enable Let's Encrypt SSL
3. Add to Apache & Nginx Settings → Additional nginx directives:
```nginx
location / {
    proxy_pass http://127.0.0.1:18790;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection upgrade;
}
```

## Deployment
**One-time setup (SSH):**
```bash
git clone https://github.com/mrdulasolutions/visionclaude.git /var/www/visionclaude
cd /var/www/visionclaude
cp .env.example .env
nano .env   # fill in your keys
docker compose up --build -d
```

**To update:**
```bash
cd /var/www/visionclaude && ./deploy.sh
```

**Health check:**
```bash
curl -H "X-Gateway-Key: YOUR_KEY" https://ai.datafeed.cloud/health
```

## Phase 2 (Future)
Multi-tenant login page at ai.datafeed.cloud where users self-register and provide their own Anthropic + Deepgram API keys. Each user gets a unique gateway token. Stack: React + TypeScript + Vite + Tailwind + Express + PostgreSQL.
