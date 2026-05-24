import { Router } from "express";
import type { MCPManager } from "../mcp-manager.js";
import type { ConversationStore } from "../conversation.js";
import type { SkillLoader } from "../skill-loader.js";

export function createHealthRouter(
  mcpManager: MCPManager,
  conversations: ConversationStore,
  skillLoader?: SkillLoader
): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const servers = mcpManager.getServerStatus();
    const toolCount = mcpManager.getAllDiscoveredTools().length;

    // LOW: Return only counts, not names/details, to avoid capability disclosure.
    res.json({
      status: "ok",
      uptime: Math.floor(process.uptime()),
      mcp: {
        serverCount: servers.length,
        totalTools: toolCount,
      },
      skills: {
        count: skillLoader?.count ?? 0,
      },
    });
  });

  return router;
}
