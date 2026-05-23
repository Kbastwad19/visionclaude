import express, { Router } from "express";

export function createVoiceRouter() {
  const router = Router();

  // POST /voice/speak — Deepgram Aura TTS
  router.post("/speak", async (req, res) => {
    const { text } = req.body as { text?: string };
    const deepgramKey = process.env.DEEPGRAM_API_KEY;

    if (!deepgramKey) {
      res.status(503).json({ error: "DEEPGRAM_API_KEY not configured" });
      return;
    }
    if (!text) {
      res.status(400).json({ error: "text is required" });
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

      if (!response.ok) {
        res.status(502).json({ error: "Deepgram TTS failed" });
        return;
      }

      res.setHeader("Content-Type", "audio/mpeg");
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch {
      res.status(502).json({ error: "TTS request failed" });
    }
  });

  // POST /voice/transcribe — Deepgram Nova STT fallback
  router.post(
    "/transcribe",
    express.raw({ type: "*/*", limit: "10mb" }),
    async (req, res) => {
      const deepgramKey = process.env.DEEPGRAM_API_KEY;

      if (!deepgramKey) {
        res.status(503).json({ error: "DEEPGRAM_API_KEY not configured" });
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

        if (!response.ok) {
          res.status(502).json({ error: "Deepgram STT failed" });
          return;
        }

        const data = (await response.json()) as {
          results?: {
            channels?: Array<{
              alternatives?: Array<{ transcript?: string }>;
            }>;
          };
        };
        const transcript =
          data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
        res.json({ text: transcript });
      } catch {
        res.status(502).json({ error: "STT request failed" });
      }
    }
  );

  return router;
}
