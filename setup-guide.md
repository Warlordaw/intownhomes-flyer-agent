# InTownHomes Flyer Agent — Setup Guide

## What You're Setting Up

A Teams agent where salespeople type listing details → get a branded comparison PDF → it gets emailed to the buyer. Three pieces:

1. **PDF Generator** (Node.js server) — runs in the cloud, turns data into PDFs
2. **Power Automate Flow** — connects the agent to the PDF generator and Outlook
3. **Copilot Studio Agent** — the chat interface in Teams

---

## Part 1: Deploy the PDF Generator

### Option A: Azure App Service Free Tier (Recommended)

**Prerequisites:** An Azure account (free tier is fine)

1. Install the Azure CLI: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

2. Open a terminal in the `generator/` folder:

```bash
cd intownhomes-flyer-agent/generator
npm install
```

3. Test locally first:
```bash
npm run server
```
Open http://localhost:3001 — you should see `{"status":"ok","service":"InTownHomes Flyer Generator"}`

4. Test PDF generation:
```bash
npm test
```
Check the `output/` folder for the generated PDF.

5. Deploy to Azure:
```bash
# Login to Azure
az login

# Create a resource group
az group create --name intownhomes-flyer --location centralus

# Create the App Service plan (FREE tier)
az appservice plan create --name flyer-plan --resource-group intownhomes-flyer --sku F1 --is-linux

# Create the web app
az webapp create --name intownhomes-flyer-api --resource-group intownhomes-flyer --plan flyer-plan --runtime "NODE:20-lts"

# Deploy the code (from the generator/ folder)
az webapp up --name intownhomes-flyer-api --resource-group intownhomes-flyer
```

6. Note your URL: `https://intownhomes-flyer-api.azurewebsites.net`

**Important:** Puppeteer needs Chrome, which is included on Azure Linux App Service.
If you hit issues, add this app setting:
```bash
az webapp config appsettings set --name intownhomes-flyer-api --resource-group intownhomes-flyer --settings PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### Option B: Local + ngrok (For Testing Only)

```bash
cd generator
npm install
npm run server

# In another terminal:
npx ngrok http 3001
```
Use the ngrok HTTPS URL (changes each time you restart).

---

## Part 2: Create the Power Automate Flow

1. Go to https://make.powerautomate.com

2. Click **+ Create** → **Instant cloud flow**

3. Name it: `Generate and Email Flyer`

4. Trigger: **Run a flow from Copilot** (or "Manually trigger a flow")

5. Add all the input parameters listed in `flow/power-automate-flow.md`
   - 17 text inputs + 2 number inputs (ithPriceNum, compPriceNum)

6. Add an **HTTP** action:
   - Method: POST
   - URI: `https://intownhomes-flyer-api.azurewebsites.net/generate?format=base64`
   - Headers: `Content-Type: application/json`
   - Body: Copy the JSON from `flow/power-automate-flow.md` Step 1

7. Add a **Parse JSON** action:
   - Content: output of the HTTP action
   - Schema: copy from `flow/power-automate-flow.md` Step 2

8. Add **Send an email (V2)** from Office 365 Outlook:
   - To: `buyerEmail` from trigger inputs
   - Subject: `Your Custom Home Comparison — InTownHomes vs [compBuilder]`
   - Body: copy HTML from `flow/power-automate-flow.md` Step 3
   - Attachments:
     - Name: `Home-Comparison.pdf`
     - Content: use expression `base64ToBinary(body('Parse_JSON')?['base64'])`

9. Save and test the flow manually first with sample data.

---

## Part 3: Create the Copilot Studio Agent

1. Go to https://copilotstudio.microsoft.com

2. Click **+ Create** → **New agent**

3. Name: `InTownHomes Flyer Generator`

4. Description: `Create branded comparison flyers for InTownHomes vs competitor listings`

5. In **Topics**, create a new topic: **Create Comparison Flyer**

6. Add trigger phrases:
   - "create a flyer"
   - "compare a listing"
   - "generate a comparison"
   - "new flyer"
   - "compare homes"

7. Build the conversation flow using the steps in `agent/copilot-agent-definition.yaml`:
   - Use **Ask a question** nodes for each input
   - Use a **Message** node for the confirmation summary
   - Use a **Call an action** node to trigger the Power Automate flow
   - Use a final **Message** node for the success confirmation

8. In the **Call an action** node:
   - Select the "Generate and Email Flyer" flow you created
   - Map each variable to the corresponding flow input

9. **Test** the agent in the Copilot Studio test panel

10. **Publish** → make it available in Teams:
    - Settings → Channels → Microsoft Teams
    - Click "Turn on Teams"
    - Users can find it in the Teams app store (under "Built by your org")

---

## Testing End-to-End

1. Open Teams
2. Find the "InTownHomes Flyer Generator" agent
3. Type "create a flyer"
4. Enter the test data:
   - Buyer: John Davis, john.davis@gmail.com
   - InTownHomes: The Oakmont, 2347 Riverside Drive Houston TX 77008, $589000, 4/3.5/3245/3
   - Competitor: Meritage Homes, 1842 Garden Oaks Blvd Houston TX 77008, $464000, 4/3/2890/2
   - Agent: Your name, phone, email
5. Confirm → check that the email arrives with the PDF attached

---

## Project Structure

```
intownhomes-flyer-agent/
├── DESIGN-DOC.md                          ← Full design document
├── setup-guide.md                         ← This file
│
├── template/
│   └── comparison-template.html           ← Branded HTML template with {{vars}}
│
├── generator/
│   ├── package.json
│   ├── server.js                          ← HTTP API (normalize→validate→assemble→render)
│   └── lib/
│       ├── normalize.js                   ← Input normalization (prices, phones, specs)
│       ├── validate.js                    ← Validation + reasonableness checks
│       ├── assemble.js                    ← Compute payments, diffs, email draft
│       └── render.js                      ← Template fill + Puppeteer PDF render
│
├── teams-agent/
│   ├── ITH-Flyer-Agent.zip               ← Sideloadable Teams app package
│   └── appPackage/
│       ├── manifest.json                  ← Teams app manifest
│       ├── declarativeAgent.json          ← Copilot agent with system prompt
│       ├── apiPlugin.json                 ← API plugin definition
│       ├── openapi.yaml                   ← OpenAPI spec for /generate endpoint
│       ├── color.png                      ← App icon (replace with real logo)
│       └── outline.png                    ← App icon outline
│
├── agent/
│   └── copilot-agent-definition.yaml      ← Copilot conversation design reference
├── flow/
│   └── power-automate-flow.md             ← Power Automate step-by-step (Phase 2)
│
└── output/                                ← Generated PDFs (gitignored)
```

---

## Troubleshooting

**PDF is blank or missing styles:**
- Puppeteer needs `waitUntil: 'networkidle0'` to load fonts/icons from CDN
- Check that the Azure app has outbound internet access

**Power Automate HTTP action fails:**
- Verify the Azure URL is correct and the app is running
- Test with Postman first: POST to `/generate?format=base64` with the JSON body

**Email attachment is corrupt:**
- Make sure you're using `base64ToBinary()` in Power Automate, not raw base64 text

**Agent not showing in Teams:**
- After publishing in Copilot Studio, it can take up to 24 hours to appear
- Check Settings → Channels → Teams is enabled
- Users may need to search for it in the Teams app store under "Built by your org"
