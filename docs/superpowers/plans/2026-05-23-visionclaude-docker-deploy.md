# VisionClaude Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the VisionClaude gateway server in Docker on a Plesk server at https://ai.datafeed.cloud, accessible from Meta Ray-Ban Smart Glasses.

**Architecture:** VisionClaude's Express/TypeScript gateway runs in a Docker container bound to localhost:18790. Plesk Nginx terminates SSL (Let's Encrypt) and proxies HTTPS traffic to the container. The container reads API keys from a .env file on the server.

**Tech Stack:** Node.js 22 Alpine, Docker Compose, Plesk Nginx, Let's Encrypt, Anthropic API, Deepgram (Phase 2)

---

### Task 1: Push Docker files to GitHub

The Docker files were created locally at `/Users/adamforman/Documents/visionclaude`. They need to be on GitHub so the Plesk server can pull them.

**Files:**
- Modify: `ClaudeVision/server/Dockerfile` (already created)
- Modify: `docker-compose.yml` (already created)
- Modify: `.env.example` (already created)
- Modify: `deploy.sh` (already created)

- [ ] **Step 1: Fork visionclaude to your GitHub account**

Go to https://github.com/mrdulasolutions/visionclaude and click **Fork**. Fork it to your own GitHub account (e.g. `adamforman/visionclaude`).

- [ ] **Step 2: Change the remote in the local clone**

```bash
cd /Users/adamforman/Documents/visionclaude
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/visionclaude.git
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

- [ ] **Step 3: Verify the new remote**

```bash
git remote -v
```

Expected:
```
origin  https://github.com/YOUR_GITHUB_USERNAME/visionclaude.git (fetch)
origin  https://github.com/YOUR_GITHUB_USERNAME/visionclaude.git (push)
```

- [ ] **Step 4: Stage and commit the Docker files**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/Dockerfile docker-compose.yml .env.example deploy.sh docs/
git commit -m "feat: add Docker deployment for Plesk (ai.datafeed.cloud)"
```

- [ ] **Step 5: Push to your fork**

```bash
git push origin main
```

Expected: Files appear on `https://github.com/YOUR_GITHUB_USERNAME/visionclaude`

---

### Task 2: Create Plesk subdomain with SSL

- [ ] **Step 1: Create the subdomain in Plesk**

In Plesk → **Websites & Domains** → **Add Domain** → choose **Blank website**.
Set domain name to: `ai.datafeed.cloud`

- [ ] **Step 2: Enable Let's Encrypt SSL**

In Plesk, go to `ai.datafeed.cloud` → **SSL/TLS Certificates** → **Let's Encrypt**.
Check both:
- `ai.datafeed.cloud`
- `www.ai.datafeed.cloud`

Click **Get it free**. Wait for green padlock confirmation.

- [ ] **Step 3: Verify SSL is working**

Open https://ai.datafeed.cloud in a browser. You should see a Plesk placeholder page with a valid SSL certificate (padlock icon). A 404 or default page is fine — SSL just needs to be green.

---

### Task 3: Deploy the container on the Plesk server

SSH into your Plesk server for all steps in this task.

- [ ] **Step 1: SSH into the server**

```bash
ssh root@YOUR_SERVER_IP
```

- [ ] **Step 2: Verify Docker is installed**

```bash
docker --version && docker compose version
```

Expected (versions may differ):
```
Docker version 24.0.0, build abc1234
Docker Compose version v2.20.0
```

If Docker is not installed, install it:
```bash
curl -fsSL https://get.docker.com | sh
```

- [ ] **Step 3: Clone your fork**

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/visionclaude.git /var/www/visionclaude
cd /var/www/visionclaude
```

- [ ] **Step 4: Create the .env file**

```bash
cp .env.example .env
nano .env
```

Fill in your values:
```
ANTHROPIC_API_KEY=sk-ant-YOUR_ACTUAL_KEY
DEEPGRAM_API_KEY=YOUR_DEEPGRAM_KEY
GATEWAY_API_KEY=choose-a-long-random-secret-string
PORT=18790
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

- [ ] **Step 5: Build and start the container**

```bash
docker compose up --build -d
```

Expected output ends with:
```
✔ Container visionclaude-visionclaude-1  Started
```

- [ ] **Step 6: Verify the container is running**

```bash
docker compose ps
```

Expected:
```
NAME                        STATUS          PORTS
visionclaude-visionclaude-1 Up X seconds    127.0.0.1:18790->18790/tcp
```

- [ ] **Step 7: Check the health endpoint locally**

```bash
curl http://localhost:18790/health
```

Expected:
```json
{"status":"ok"}
```

If you get `Connection refused`, check logs:
```bash
docker compose logs --tail=50
```

- [ ] **Step 8: Commit nothing — verify only**

No git commit needed for this task. The .env file must NEVER be committed.

---

### Task 4: Configure Plesk Nginx reverse proxy

- [ ] **Step 1: Open Nginx settings for ai.datafeed.cloud**

In Plesk → `ai.datafeed.cloud` → **Apache & Nginx Settings**.

Scroll to **Additional Nginx directives** (the second Nginx directives box — for HTTPS).

- [ ] **Step 2: Paste the proxy config**

Clear any existing content in the box and paste exactly:

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

- [ ] **Step 3: Apply and verify no errors**

Click **Apply**. Plesk will test the Nginx config before applying.

Expected: Green success message. If you see a red error, the config text has a typo — re-paste from Step 2 exactly.

---

### Task 5: End-to-end verification

- [ ] **Step 1: Health check over HTTPS**

From your Mac terminal (not the server):

```bash
curl -H "X-Gateway-Key: YOUR_GATEWAY_API_KEY" https://ai.datafeed.cloud/health
```

Replace `YOUR_GATEWAY_API_KEY` with what you set in .env.

Expected:
```json
{"status":"ok"}
```

- [ ] **Step 2: Test a chat request**

```bash
curl -X POST https://ai.datafeed.cloud/chat \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Key: YOUR_GATEWAY_API_KEY" \
  -d '{"message": "Say hello in one word"}'
```

Expected: JSON response with Claude's reply. If you get `401 Unauthorized`, your Gateway key doesn't match what's in .env.

- [ ] **Step 3: Verify unauthenticated requests are blocked**

```bash
curl https://ai.datafeed.cloud/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

Expected: `401` or `403` response — not a Claude reply.

- [ ] **Step 4: Configure glasses app to point to new server**

In the VisionClaude app or Ray-Ban companion app, update the server URL from `localhost:18790` to `https://ai.datafeed.cloud`. Set the Gateway Key to match your `GATEWAY_API_KEY` value.

---

### Task 6: Set up auto-deploy for future updates

- [ ] **Step 1: Make deploy.sh executable on the server** (SSH)

```bash
chmod +x /var/www/visionclaude/deploy.sh
```

- [ ] **Step 2: Test the deploy script**

```bash
cd /var/www/visionclaude && ./deploy.sh
```

Expected output:
```
Pulling latest...
Already up to date.
Building and starting container...
✔ Container visionclaude-visionclaude-1  Started
Done. Recent logs:
[server startup logs]
```

Future updates: push changes to GitHub on your Mac, then SSH → `cd /var/www/visionclaude && ./deploy.sh`.
