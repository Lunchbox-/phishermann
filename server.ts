import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import sgMail from "@sendgrid/mail";
import path from "path";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Configuration (sourced from environment / .env)
// ---------------------------------------------------------------------------
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SMTP_FROM        = process.env.SMTP_FROM        || "precisionfluidcontrols@neoknightlabs.com";
const SMTP_FROM_NAME   = process.env.SMTP_FROM_NAME   || "PFC Valves";
const APP_URL          = (process.env.APP_URL         || "https://neoknightlabs.com").replace(/\/$/, "");
const ADMIN_SECRET     = process.env.ADMIN_SECRET     || "";

if (!SENDGRID_API_KEY) {
  console.error("[ERROR] SENDGRID_API_KEY is not set. Emails will not send.");
}
sgMail.setApiKey(SENDGRID_API_KEY);

// ---------------------------------------------------------------------------
// In-memory log store
// In a production deployment, replace with a persistent database.
// ---------------------------------------------------------------------------
interface LogEntry {
  uid: string;
  email: string;
  sentAt: string;
  clickedAt: string | null;
  ip: string | null;
}

const campaignLogs = new Map<string, LogEntry>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateUid(): string {
  return Math.random().toString(36).slice(2, 10) +
         Math.random().toString(36).slice(2, 10);
}

/** Middleware: require ?secret= on admin endpoints */
function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_SECRET) {
    // No secret configured — warn loudly but allow access so first-run works.
    console.warn("[WARN] ADMIN_SECRET is not set. Admin endpoints are unprotected.");
    next();
    return;
  }
  if (req.query.secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------
function buildEmail(trackingUrl: string): { subject: string; html: string; text: string } {
  const subject = "Action Required: Verify Your Network Credentials";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#003366;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">PFC Valves IT Department</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;">Dear Team Member,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#333;">
              Our systems have detected that your network account requires immediate verification following
              a routine security audit. You must confirm your credentials within <strong>24 hours</strong>
              to avoid a temporary suspension.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#333;">
              Please click the button below to verify your account:
            </p>

            <!-- CTA Button — table-based for maximum email client compatibility -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
              <tr>
                <td align="center" bgcolor="#d9534f" style="border-radius:4px;">
                  <a href="${trackingUrl}"
                     target="_blank"
                     style="display:inline-block;padding:13px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:4px;">
                    Verify My Account Now
                  </a>
                </td>
              </tr>
            </table>

            <hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              This message was sent automatically by the PFC Valves IT systems.<br>
              Do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `PFC Valves IT Department

Dear Team Member,

Our systems have detected that your network account requires immediate verification following a routine security audit. You must confirm your credentials within 24 hours to avoid a temporary suspension.

To verify your account, visit: ${trackingUrl}

This message was sent automatically. Do not reply.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Public: record a click ---
  app.post("/api/track", (req: Request, res: Response) => {
    const { uid } = req.body as { uid?: string };
    if (uid && campaignLogs.has(uid)) {
      const entry = campaignLogs.get(uid)!;
      if (!entry.clickedAt) {
        entry.clickedAt = new Date().toISOString();
        entry.ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
                   || req.socket.remoteAddress
                   || "unknown";
        console.log(`[SIMULATION] Click recorded — UID: ${uid}, IP: ${entry.ip}`);
      }
    }
    res.json({ status: "ok" });
  });

  // --- Admin: send a simulation email ---
  app.post("/api/send", requireAdminSecret, async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "A valid email address is required." });
      return;
    }

    const uid = generateUid();
    const trackingUrl = `${APP_URL}/?uid=${uid}`;
    const { subject, html, text } = buildEmail(trackingUrl);

    // Record the send before attempting delivery
    campaignLogs.set(uid, {
      uid,
      email,
      sentAt: new Date().toISOString(),
      clickedAt: null,
      ip: null,
    });

    try {
      await sgMail.send({
        from: { name: SMTP_FROM_NAME, email: SMTP_FROM },
        to: email,
        subject,
        html,
        text,
      });
      console.log(`[SIMULATION] Email sent — UID: ${uid}, To: ${email}`);
      res.json({ status: "sent", uid, trackingUrl });
    } catch (err: unknown) {
      console.error("[SIMULATION] SendGrid error:", err);
      campaignLogs.delete(uid);
      const message = err instanceof Error ? err.message : "Unknown SendGrid error";
      res.status(500).json({ error: message });
    }
  });

  // --- Admin: view logs ---
  app.get("/api/logs", requireAdminSecret, (_req: Request, res: Response) => {
    res.json(Array.from(campaignLogs.values()));
  });

  // --- Vite / static ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
    if (!ADMIN_SECRET) {
      console.warn("[WARN] Set ADMIN_SECRET in your .env to protect the admin dashboard.");
    }
  });
}

startServer();
