# VisionClaude Web Voice Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-protected web client to the VisionClaude gateway — serving the Aside landing page at `/`, a session-gated voice chat placeholder at `/app`, and Deepgram STT/TTS endpoints.

**Architecture:** express-session handles login state server-side. Static files in `public/` serve the landing page publicly. `/app` is protected by `requireAuth` middleware. `/chat` accepts either a valid session or the existing GATEWAY_API_KEY header for backwards compatibility.

**Tech Stack:** Express, express-session, Node 22, Deepgram API, browser Web Speech API, vanilla JS in app.html

---

### Task 1: Add express-session dependency and env var

**Files:**
- Modify: `ClaudeVision/server/package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install express-session**

```bash
cd /Users/adamforman/Documents/visionclaude/ClaudeVision/server
npm install express-session @types/express-session
```

Expected: `package.json` now lists `express-session` in dependencies and `@types/express-session` in devDependencies.

- [ ] **Step 2: Add ADMIN_PASSWORD to .env.example**

Open `/Users/adamforman/Documents/visionclaude/.env.example` and add below `GATEWAY_API_KEY`:

```
ADMIN_PASSWORD=choose-a-strong-password
```

- [ ] **Step 3: Verify package.json has both entries**

```bash
grep -E "express-session|ADMIN" /Users/adamforman/Documents/visionclaude/ClaudeVision/server/package.json
grep ADMIN /Users/adamforman/Documents/visionclaude/.env.example
```

Expected: both lines present.

- [ ] **Step 4: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/package.json ClaudeVision/server/package-lock.json .env.example
git commit -m "feat: add express-session dependency and ADMIN_PASSWORD env var"
```

---

### Task 2: Create session middleware

**Files:**
- Create: `ClaudeVision/server/src/middleware/session.ts`

- [ ] **Step 1: Create the middleware directory**

```bash
mkdir -p /Users/adamforman/Documents/visionclaude/ClaudeVision/server/src/middleware
```

- [ ] **Step 2: Create session.ts**

Create `/Users/adamforman/Documents/visionclaude/ClaudeVision/server/src/middleware/session.ts`:

```typescript
import session from "express-session";
import type { RequestHandler } from "express";

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}

export const sessionMiddleware = session({
  secret: process.env.GATEWAY_API_KEY || "visionclaude-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000,
  },
});

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session?.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/adamforman/Documents/visionclaude/ClaudeVision/server
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If you see `Cannot find module 'express-session'`, run `npm install` first.

- [ ] **Step 4: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/src/middleware/session.ts
git commit -m "feat: add session middleware with requireAuth"
```

---

### Task 3: Create auth routes

**Files:**
- Create: `ClaudeVision/server/src/routes/auth.ts`

- [ ] **Step 1: Create auth.ts**

Create `/Users/adamforman/Documents/visionclaude/ClaudeVision/server/src/routes/auth.ts`:

```typescript
import { Router } from "express";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", (req, res) => {
    const { password } = req.body as { password?: string };
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      res.status(500).json({ error: "ADMIN_PASSWORD not configured" });
      return;
    }
    if (!password || password !== adminPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    req.session.authenticated = true;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: "Session error" });
        return;
      }
      res.json({ ok: true });
    });
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  router.get("/check", (req, res) => {
    res.json({ authenticated: !!req.session?.authenticated });
  });

  return router;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adamforman/Documents/visionclaude/ClaudeVision/server
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/src/routes/auth.ts
git commit -m "feat: add auth routes (login, logout, session check)"
```

---

### Task 4: Create voice routes

**Files:**
- Create: `ClaudeVision/server/src/routes/voice.ts`

- [ ] **Step 1: Create voice.ts**

Create `/Users/adamforman/Documents/visionclaude/ClaudeVision/server/src/routes/voice.ts`:

```typescript
import { Router } from "express";
import express from "express";

export function createVoiceRouter(): Router {
  const router = Router();

  router.post(
    "/transcribe",
    express.raw({ type: "*/*", limit: "10mb" }),
    async (req, res) => {
      const deepgramKey = process.env.DEEPGRAM_API_KEY;
      if (!deepgramKey) {
        res.status(503).json({ error: "Deepgram not configured" });
        return;
      }
      try {
        const response = await fetch(
          "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${deepgramKey}`,
              "Content-Type":
                (req.headers["content-type"] as string) || "audio/webm",
            },
            body: req.body as Buffer,
          }
        );
        const data = (await response.json()) as {
          results?: {
            channels?: { alternatives?: { transcript?: string }[] }[];
          };
        };
        const transcript =
          data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
        res.json({ transcript });
      } catch {
        res.status(500).json({ error: "Transcription failed" });
      }
    }
  );

  router.post("/speak", async (req, res) => {
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      res.status(503).json({ error: "Deepgram not configured" });
      return;
    }
    const { text } = req.body as { text?: string };
    if (!text) {
      res.status(400).json({ error: "text required" });
      return;
    }
    try {
      const response = await fetch(
        "https://api.deepgram.com/v1/speak?model=aura-asteria-en",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${deepgramKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );
      const audioBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(Buffer.from(audioBuffer));
    } catch {
      res.status(500).json({ error: "TTS failed" });
    }
  });

  return router;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/adamforman/Documents/visionclaude/ClaudeVision/server
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/src/routes/voice.ts
git commit -m "feat: add voice routes (Deepgram STT + Aura TTS)"
```

---

### Task 5: Wire everything into index.ts

**Files:**
- Modify: `ClaudeVision/server/src/index.ts`

The existing file has `app.use(gatewayAuth())` applied globally. We need to:
1. Add session middleware before routes
2. Serve static files publicly
3. Mount auth and voice routes
4. Move gatewayAuth() off global scope — apply it only to /config and /tools
5. Make /chat accept either session OR gateway key
6. Protect /app with requireAuth (server-side redirect)

- [ ] **Step 1: Update the imports block** (lines 1–14 of index.ts)

Replace the existing imports with:

```typescript
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { MCPManager } from "./mcp-manager.js";
import { ClaudeClient } from "./claude-client.js";
import { ConversationStore } from "./conversation.js";
import { SkillLoader } from "./skill-loader.js";
import { gatewayAuth, rateLimiter, RequestQueue } from "./middleware.js";
import { showBanner, showServerInfo, c } from "./console-theme.js";
import { createChatRouter } from "./routes/chat.js";
import { createHealthRouter } from "./routes/health.js";
import { createConfigRouter } from "./routes/config.js";
import { createToolsRouter } from "./routes/tools.js";
import { createAuthRouter } from "./routes/auth.js";
import { createVoiceRouter } from "./routes/voice.js";
import { sessionMiddleware, requireAuth } from "./middleware/session.js";
import type { ServerConfig } from "./types.js";
import type { RequestHandler } from "express";
```

- [ ] **Step 2: Replace the Express app setup block** (lines 72–105 of index.ts)

Replace from `// ── Express app ──` down to the skills/reload endpoint (just before `// ── Start server ──`) with:

```typescript
  // ── Express app ──
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(sessionMiddleware);

  // ── Public static files (landing page, JSX) ──
  const publicDir = path.join(import.meta.dirname, "..", "public");
  app.use(express.static(publicDir));

  // ── Public routes ──
  app.use("/health", createHealthRouter(mcpManager, conversations, skillLoader));
  app.use("/auth", createAuthRouter());

  // ── Session-protected web routes ──
  app.get("/app", requireAuth, (_req, res) => {
    res.sendFile(path.join(publicDir, "app.html"));
  });
  app.use("/voice", requireAuth, createVoiceRouter());

  // ── API routes: accept session OR gateway key ──
  const webOrApiAuth: RequestHandler = (req, res, next) => {
    if (req.session?.authenticated) { next(); return; }
    gatewayAuth()(req, res, next);
  };
  app.use(rateLimiter(30));
  app.use("/chat", webOrApiAuth, createChatRouter(claudeClient, conversations, requestQueue));

  // ── Admin API routes: gateway key only ──
  app.use("/config", gatewayAuth(), createConfigRouter(claudeClient));
  app.use("/tools", gatewayAuth(), createToolsRouter(mcpManager));

  // Skills endpoints
  app.get("/skills", (_req, res) => {
    res.json({ skills: skillLoader.getSkillList(), count: skillLoader.count });
  });
  app.post("/skills/reload", (_req, res) => {
    skillLoader.reload();
    const newPrompt = DEFAULT_SYSTEM_PROMPT + skillLoader.buildSystemPromptSection();
    claudeClient.updateConfig({ systemPrompt: newPrompt });
    res.json({ message: "Skills reloaded", skills: skillLoader.getSkillList(), count: skillLoader.count });
  });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/adamforman/Documents/visionclaude/ClaudeVision/server
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Common fix — if you see `import.meta.dirname` error, ensure tsconfig has `"target": "ES2022"` or higher (it already does).

- [ ] **Step 4: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/src/index.ts
git commit -m "feat: wire session, static files, auth/voice routes into index.ts"
```

---

### Task 6: Update login modal in app.jsx

**Files:**
- Modify: `ClaudeVision/server/public/app.jsx`

The existing `LoginModal` component (around line 515) uses email + 6-digit OTP. Replace it with a password form wired to `POST /auth/login`.

- [ ] **Step 1: Find the LoginModal component**

Open `/Users/adamforman/Documents/visionclaude/ClaudeVision/server/public/app.jsx` and locate the `const LoginModal` definition (around line 515).

- [ ] **Step 2: Replace the entire LoginModal component**

Replace from `const LoginModal = ...` to the closing `};` of that component with:

```jsx
const LoginModal = ({ open, onClose, p, accent }) => {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) { setPassword(""); setError(""); setLoading(false); }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/app";
      } else {
        setError("Incorrect password.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: `${p.ink}aa`, backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24,
      animation: "fadeIn 220ms ease"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: p.bg, borderRadius: 18, padding: 40, maxWidth: 440, width: "100%",
        border: `1px solid ${p.line}`, position: "relative",
        animation: "popIn 280ms cubic-bezier(.2,.9,.3,1.2)"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "transparent", border: "none",
          color: p.muted, fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1
        }}>×</button>
        <Aperture size={28} color={accent} />
        <h3 style={{
          fontFamily: "var(--display-font)", fontSize: 32, fontWeight: 400,
          letterSpacing: "-0.02em", color: p.ink, margin: "16px 0 8px", lineHeight: 1.05
        }}>
          Log in to <em>Aside</em>.
        </h3>
        <p style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 14, color: p.muted, lineHeight: 1.5, margin: "0 0 28px" }}>
          Enter your password to access the voice interface.
        </p>
        <form onSubmit={submit}>
          <label style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, letterSpacing: "0.1em", color: p.muted, textTransform: "uppercase" }}>
            Password
          </label>
          <input
            autoFocus type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%", marginTop: 6, padding: "14px 16px", borderRadius: 10,
              border: `1px solid ${p.line}`, background: p.panel, color: p.ink,
              fontFamily: "'Inter Tight', sans-serif", fontSize: 16, outline: "none",
              boxSizing: "border-box"
            }} />
          {error && (
            <p style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 13, color: "#E05C5C", margin: "8px 0 0" }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} style={{
            marginTop: 16, width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: accent, color: p.ink, fontFamily: "'Inter Tight', sans-serif",
            fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? "Logging in…" : "Log in →"}
          </button>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/public/app.jsx
git commit -m "feat: replace email OTP login modal with password form"
```

---

### Task 7: Create app.html placeholder

**Files:**
- Create: `ClaudeVision/server/public/app.html`

- [ ] **Step 1: Create app.html**

Create `/Users/adamforman/Documents/visionclaude/ClaudeVision/server/public/app.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aside — Voice</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #F4EFE5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Inter Tight', sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #status {
      font-size: 13px;
      color: #7B7468;
      margin-bottom: 32px;
      font-family: ui-monospace, monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    #talk {
      width: 120px;
      height: 120px;
      border-radius: 999px;
      border: none;
      background: #6FE3A8;
      color: #1A1714;
      font-family: 'Inter Tight', sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 180ms ease, box-shadow 180ms ease;
      box-shadow: 0 10px 30px -12px #6FE3A8;
    }
    #talk:hover { transform: translateY(-2px); box-shadow: 0 16px 40px -12px #6FE3A8; }
    #talk:active { transform: scale(0.96); }
    #response {
      margin-top: 40px;
      max-width: 380px;
      text-align: center;
      font-size: 16px;
      line-height: 1.55;
      color: #1A1714;
      min-height: 48px;
    }
    #logout {
      position: fixed;
      top: 20px;
      right: 24px;
      background: transparent;
      border: 1px solid #D9D1C0;
      color: #7B7468;
      font-family: 'Inter Tight', sans-serif;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 999px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <button id="logout">Log out</button>
  <div id="status">Ready</div>
  <button id="talk">Talk</button>
  <div id="response"></div>

  <script>
    const CONVERSATION_ID_KEY = 'aside_conversation_id';
    let conversationId = sessionStorage.getItem(CONVERSATION_ID_KEY);
    let recognition = null;
    let isListening = false;

    // Session check
    fetch('/auth/check')
      .then(r => r.json())
      .then(d => { if (!d.authenticated) window.location.href = '/'; });

    // Logout
    document.getElementById('logout').onclick = () => {
      fetch('/auth/logout', { method: 'POST' })
        .then(() => window.location.href = '/');
    };

    const status = document.getElementById('status');
    const talkBtn = document.getElementById('talk');
    const responseEl = document.getElementById('response');

    async function sendToClaude(text) {
      status.textContent = 'Thinking…';
      const body = { text, conversation_id: conversationId || undefined };
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      conversationId = data.conversation_id;
      sessionStorage.setItem(CONVERSATION_ID_KEY, conversationId);
      return data.text || '';
    }

    async function speak(text) {
      // Try Deepgram TTS first
      try {
        const res = await fetch('/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          await audio.play();
          return;
        }
      } catch { /* fall through */ }
      // Browser TTS fallback
      const utt = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utt);
    }

    function startListening() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        status.textContent = 'Speech not supported in this browser';
        return;
      }
      recognition = new SpeechRecognition();
      recognition.lang = 'en-GB';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening = true;
        talkBtn.textContent = 'Listening…';
        status.textContent = 'Listening';
      };

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        status.textContent = `You: ${transcript}`;
        try {
          const reply = await sendToClaude(transcript);
          responseEl.textContent = reply;
          status.textContent = 'Ready';
          await speak(reply);
        } catch (err) {
          status.textContent = 'Error — try again';
        }
      };

      recognition.onerror = (e) => {
        status.textContent = `Error: ${e.error}`;
        isListening = false;
        talkBtn.textContent = 'Talk';
      };

      recognition.onend = () => {
        isListening = false;
        talkBtn.textContent = 'Talk';
      };

      recognition.start();
    }

    talkBtn.onclick = () => {
      if (isListening) {
        recognition?.stop();
      } else {
        startListening();
      }
    };
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/adamforman/Documents/visionclaude
git add ClaudeVision/server/public/app.html
git commit -m "feat: add voice chat placeholder page (app.html)"
```

---

### Task 8: Build and deploy to server

- [ ] **Step 1: Final TypeScript compile check**

```bash
cd /Users/adamforman/Documents/visionclaude/ClaudeVision/server
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 2: Push all commits to GitHub**

```bash
cd /Users/adamforman/Documents/visionclaude
git push origin main
```

- [ ] **Step 3: SSH into server and pull + rebuild**

```bash
# On the Plesk server (SSH as root)
cd /var/www/vhosts/ai.datafeed.cloud/visionclaude
git pull
docker compose up --build -d
```

Expected: container rebuilds and starts. Check with:
```bash
docker compose ps
curl http://localhost:18790/health
```

- [ ] **Step 4: Add ADMIN_PASSWORD to server .env**

```bash
# Still on server
nano /var/www/vhosts/ai.datafeed.cloud/visionclaude/.env
```

Add the line:
```
ADMIN_PASSWORD=your-chosen-password
```

Save, then restart the container to pick up the new env var:
```bash
docker compose restart
```

- [ ] **Step 5: Test the landing page**

Open `https://ai.datafeed.cloud` in a browser.

Expected: the Aside landing page loads with the hero, nav, and "Log in" button.

- [ ] **Step 6: Test login**

Click "Log in" → enter your ADMIN_PASSWORD → click "Log in →".

Expected: redirect to `https://ai.datafeed.cloud/app`.

- [ ] **Step 7: Test the voice page**

Expected: the `/app` page loads with a "Talk" button. Click it, speak a sentence, and Claude should respond with text and voice.

- [ ] **Step 8: Test that /app is protected**

In a private/incognito browser window (no session), visit `https://ai.datafeed.cloud/app` directly.

Expected: `{"error":"Unauthorized"}` — the server blocks unauthenticated access.

- [ ] **Step 9: Test logout**

On the /app page, click "Log out".

Expected: redirected to `/`. Visiting `/app` again should return Unauthorized.
