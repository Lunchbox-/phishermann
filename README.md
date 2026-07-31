# Phisherman

An internal security awareness training tool for PFC Valves. Sends authorised phishing simulation emails to staff, tracks who clicks the link, and presents them with an educational landing page. Results are visible to administrators in a live dashboard.

> **Authorised use only.** This tool is intended exclusively for internal security training purposes within PFC Valves. Misuse is a violation of company policy.

---

## How It Works

1. An administrator sends a simulation email to a target address via the admin dashboard
2. The email contains a tracking link unique to that recipient
3. If the recipient clicks the link, the click is recorded (timestamp + IP)
4. The recipient is shown an educational page explaining what phishing is and how to spot it
5. The administrator can review results in real time on the dashboard

---

## Stack

- **Frontend** — React 19, Tailwind CSS, Vite
- **Backend** — Node.js, Express, TypeScript (`tsx`)
- **Email** — SendGrid HTTP API
- **Hosting** — Railway
- **Domain** — neoknightlabs.com (Google Domains)

---

## Environment Variables

Create a `.env` file in the project root with the following:

```env
# Base URL of the deployed app — used to build tracking links
APP_URL="https://neoknightlabs.com"

# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
SMTP_FROM="precisionfluidcontrols@neoknightlabs.com"
SMTP_FROM_NAME="PFC Valves"

# Admin dashboard protection — access via /admin?secret=YOUR_VALUE
ADMIN_SECRET="your-secret-here"
```

---

## Local Development

```bash
npm install
npm run dev
```

Server starts at `http://localhost:3000`.

Admin dashboard: `http://localhost:3000/admin?secret=your-secret`

---

## Deployment (Railway)

The app is deployed via [Railway](https://railway.com) with automatic deploys on push to `main`.

Build and start commands are defined in `railway.json`:
- **Build:** `npm install && npm run build`
- **Start:** `NODE_ENV=production tsx server.ts`

Set all environment variables listed above in the Railway service dashboard under **Variables**.

### Custom Domain

A CNAME record on `neoknightlabs.com` points to the Railway-assigned URL. Custom domain is configured in Railway under **Settings → Networking**.

---

## Admin Dashboard

Access at `/admin?secret=YOUR_ADMIN_SECRET`.

From the dashboard you can:
- Send a simulation email to any address
- View all sent emails with timestamps
- See who clicked and when, including their IP address

---

## Project Structure

```
├── server.ts          # Express backend — email sending, click tracking, API routes
├── src/
│   ├── App.tsx        # React frontend — landing page + admin dashboard
│   ├── main.tsx
│   └── index.css
├── railway.json       # Railway build/deploy config
├── vite.config.ts
├── package.json
└── TRAINING_PRINCIPLES.md   # Reference doc — phishing awareness training principles
```

---

## Notes

- Click logs are stored **in memory** and will reset on server restart/redeploy. For persistent results, the `campaignLogs` map in `server.ts` should be replaced with a database.
- The sender address (`precisionfluidcontrols@neoknightlabs.com`) must be verified in SendGrid under **Sender Authentication** before emails will deliver.
- The `.env` file is gitignored and must never be committed to the repository.
