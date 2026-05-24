import { Router } from "express";

export function createAuthRouter() {
  const router = Router();

  router.post("/login", (req, res) => {
    const { password } = req.body as { password?: string };
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      res.status(503).json({ error: "ADMIN_PASSWORD not configured on server" });
      return;
    }

    if (password === adminPassword) {
      req.session.authenticated = true;
      req.session.save((err) => {
        if (err) {
          res.status(500).json({ error: "Session error" });
          return;
        }
        res.json({ ok: true });
      });
    } else {
      res.status(401).json({ error: "Incorrect password" });
    }
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("sid");
      res.json({ ok: true });
    });
  });

  router.get("/check", (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
  });

  // Temporary debug endpoint — remove after login is confirmed working
  router.get("/debug", (req, res) => {
    res.json({
      sessionID: req.sessionID,
      session: req.session,
      cookies: req.headers.cookie || "none",
      authenticated: !!req.session.authenticated,
    });
  });

  return router;
}
