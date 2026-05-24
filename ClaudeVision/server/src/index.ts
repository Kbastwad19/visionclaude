import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { MCPManager } from "./mcp-manager.js";
import { ClaudeClient } from "./claude-client.js";
import { ConversationStore } from "./conversation.js";
import { SkillLoader } from "./skill-loader.js";
import { gatewayAuth, rateLimiter, requireAuth, requireAnyAuth, RequestQueue } from "./middleware.js";
import { showBanner, showServerInfo, c } from "./console-theme.js";
import { createChatRouter } from "./routes/chat.js";
import { createHealthRouter } from "./routes/health.js";
import { createConfigRouter } from "./routes/config.js";
import { createToolsRouter } from "./routes/tools.js";
import { createAuthRouter } from "./routes/auth.js";
import { createVoiceRouter } from "./routes/voice.js";
import type { ServerConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "18790", 10);

const DEFAULT_SYSTEM_PROMPT = `You are Claude, an AI voice assistant for smart glasses.

RESPONSE STYLE:
- Keep responses concise (1-3 sentences for simple questions, more for detailed analysis).
- Speak naturally as if having a conversation — the user hears your response via text-to-speech.
- Don't use markdown, bullet points, or formatting — your response is spoken aloud.
- Don't say "In the image I can see..." — just describe directly, like a friend would.

TOOLS:
- When the user asks you to do something that requires a tool (send email, check calendar, etc.), use the appropriate tool.`;

async function main() {
  showBanner();

  const mcpManager = new MCPManager();
  await mcpManager.initialize();

  const skillLoader = new SkillLoader();
  skillLoader.load();

  const systemPrompt = DEFAULT_SYSTEM_PROMPT + skillLoader.buildSystemPromptSection();

  const config: ServerConfig = {
    systemPrompt,
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    maxTokens: 4096,
  };

  const claudeClient = new ClaudeClient(mcpManager, config);
  const conversations = new ConversationStore();
  const requestQueue = new RequestQueue(2);

  const app = express();
  app.set("trust proxy", 1); // trust Nginx reverse proxy for secure cookies
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // ── Session ──
  app.use(session({
    name: "sid",
    secret: process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "aside-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Nginx handles HTTPS at the edge
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // ── Public: static landing page ──
  app.use(express.static(path.join(__dirname, "../public")));

  // ── Public: auth endpoints ──
  app.use("/auth", createAuthRouter());

  // ── Public: health ──
  app.use("/health", createHealthRouter(mcpManager, conversations, skillLoader));

  // ── Voice chat page (client-side auth check in app.html) ──
  app.get("/app", (_req, res) => {
    res.sendFile(path.join(__dirname, "../public/app.html"));
  });

  // ── Rate limiter (applied to all API routes below) ──
  app.use(rateLimiter(30));

  // ── Session or gateway key: chat + voice ──
  app.use("/chat", requireAnyAuth, createChatRouter(claudeClient, conversations, requestQueue));
  app.use("/voice", requireAuth, createVoiceRouter());

  // ── Gateway key only: native app admin routes ──
  app.use(gatewayAuth());
  app.use("/config", createConfigRouter(claudeClient));
  app.use("/tools", createToolsRouter(mcpManager));

  app.get("/skills", (_req, res) => {
    res.json({ skills: skillLoader.getSkillList(), count: skillLoader.count });
  });

  app.post("/skills/reload", (_req, res) => {
    skillLoader.reload();
    const newPrompt = DEFAULT_SYSTEM_PROMPT + skillLoader.buildSystemPromptSection();
    claudeClient.updateConfig({ systemPrompt: newPrompt });
    res.json({ message: "Skills reloaded", skills: skillLoader.getSkillList(), count: skillLoader.count });
  });

  // ── Start ──
  const server = app.listen(PORT, "0.0.0.0", () => {
    const mcpServers = mcpManager.getServerNames();
    const toolCount = mcpManager.getToolsForClaude().length;
    showServerInfo(PORT, mcpServers.length, toolCount, skillLoader.count);
  });

  const shutdown = async () => {
    console.log(c.orange("\n   ▸ Shutting down VisionClaude Gateway..."));
    conversations.destroy();
    await mcpManager.shutdown();
    server.close(() => {
      console.log(c.dim("   Gateway stopped.\n"));
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(c.error("Fatal error:"), err);
  process.exit(1);
});
