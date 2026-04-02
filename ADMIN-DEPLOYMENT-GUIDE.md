# InTownHomes Flyer Agent — Admin Deployment Guide

## What This Is

A Copilot agent for Teams that lets salespeople generate branded comparison flyer PDFs. The salesperson enters two listing details (InTownHomes + competitor), and the agent generates a professional PDF they can send to buyers.

The backend API is already deployed and running at:
**https://intownhomes-flyer-agent.onrender.com**

All that's needed is to install the agent in your Teams tenant.

---

## Step 1: Enable Custom App Sideloading (one-time setup)

1. Go to **https://admin.teams.microsoft.com**
2. Sign in with your M365 admin account
3. Navigate to: **Teams apps → Setup policies → Global (Org-wide default)**
4. Set **"Upload custom apps"** to **On**
5. Click **Save**
6. Wait ~15 minutes for the policy to propagate

If you want to limit this to specific users instead of everyone, create a new Setup policy, enable "Upload custom apps" on that policy, and assign it to the relevant users.

---

## Step 2: Upload the Agent to Teams

### Option A: Org-wide deployment (recommended)

1. Go to **https://admin.teams.microsoft.com**
2. Navigate to: **Teams apps → Manage apps**
3. Click **Upload new app**
4. Select the file: **ITH-Flyer-Agent.zip** (attached / included with this guide)
5. The app will appear in the app catalog for all users

### Option B: Individual sideload

1. Open **Microsoft Teams** (desktop or web)
2. Click **Apps** in the left sidebar
3. Click **Manage your apps** → **Upload an app** → **Upload a custom app**
4. Select **ITH-Flyer-Agent.zip**
5. Click **Add** to install it for your account

---

## Step 3: Verify It Works

1. Open Teams
2. Start a new chat with the **"ITH Flyer Generator"** agent (search for it in the Apps section or Copilot agents)
3. Type: **"Create a comparison flyer"**
4. Follow the prompts to enter test data:
   - Buyer: Test Buyer, test@example.com
   - InTownHomes: The Oakmont, 2347 Riverside Dr Houston TX 77008, $589,000, 4bd/3.5ba/3245sqft/3 garage
   - Competitor: Meritage Homes, 1842 Garden Oaks Blvd Houston TX 77008, $464,000, 4bd/3ba/2890sqft/2 garage
   - Agent: Your name, phone, email
5. Confirm and the PDF should be generated

---

## Architecture (for IT review)

```
Teams Copilot Agent (declarative agent in your tenant)
    │
    │  POST /generate (HTTPS, JSON)
    ▼
Render.com (ith-flyer-generator service)
    │
    │  Puppeteer renders HTML template → PDF
    ▼
Returns PDF as base64 in JSON response
```

- **No data is stored** on the server — PDFs are generated on the fly and returned immediately
- **No credentials are needed** — the API is stateless and doesn't access any Microsoft services
- The API runs on Render's free tier (Oregon, US)
- Source code: https://github.com/Warlordaw/intownhomes-flyer-agent

---

## Security Notes

- The API endpoint is public (no auth). For production, consider adding an API key or Azure AD authentication.
- Buyer email addresses are passed to the API for inclusion in the PDF but are not stored or logged.
- The API does NOT send emails — it only generates PDFs. The salesperson sends the email manually.
- All flyer content uses only data provided by the salesperson. No external data sources are queried.

---

## Requirements

- Microsoft 365 with Teams
- Copilot license (for the declarative agent to work in Copilot)
- Teams admin access (for Step 1 and 2)

---

## Files Included

- **ITH-Flyer-Agent.zip** — the Teams app package to upload
- **This guide** — deployment instructions

---

## Support

Contact Asher for any issues with the agent or API.
Source code and documentation: https://github.com/Warlordaw/intownhomes-flyer-agent
