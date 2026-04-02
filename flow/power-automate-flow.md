# Power Automate Flow: Generate and Email Flyer

## Flow Overview
This flow is triggered by the Copilot Studio agent, generates a PDF via the
Node.js server, and emails it to the buyer via Outlook.

---

## Trigger
**Type:** When a flow is run from Copilot (Instant — manually triggered)

**Inputs (all text except prices which are numbers):**
| Input           | Type   | Example                                    |
|-----------------|--------|--------------------------------------------|
| buyerName       | Text   | John Davis                                 |
| buyerEmail      | Text   | john.davis@gmail.com                       |
| ithPlan         | Text   | The Oakmont Plan                           |
| ithAddress      | Text   | 2347 Riverside Drive, Houston, TX 77008    |
| ithPriceNum     | Number | 589000                                     |
| ithBeds         | Text   | 4                                          |
| ithBaths        | Text   | 3.5                                        |
| ithSqft         | Text   | 3245                                       |
| ithGarage       | Text   | 3                                          |
| compBuilder     | Text   | Meritage Homes                             |
| compAddress     | Text   | 1842 Garden Oaks Blvd, Houston, TX 77008   |
| compPriceNum    | Number | 464000                                     |
| compBeds        | Text   | 4                                          |
| compBaths       | Text   | 3                                          |
| compSqft        | Text   | 2890                                       |
| compGarage      | Text   | 2                                          |
| agentName       | Text   | Sarah Mitchell                             |
| agentPhone      | Text   | (713) 555-0142                             |
| agentEmail      | Text   | sarah@intownhomes.com                      |

---

## Step 1: HTTP Request (Generate PDF)

**Action:** HTTP — POST

**URI:** `https://<your-server-url>/generate?format=base64`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "buyerName": "@{triggerBody()['buyerName']}",
  "buyerEmail": "@{triggerBody()['buyerEmail']}",
  "ithPlan": "@{triggerBody()['ithPlan']}",
  "ithAddress": "@{triggerBody()['ithAddress']}",
  "ithPriceNum": @{triggerBody()['ithPriceNum']},
  "ithBeds": "@{triggerBody()['ithBeds']}",
  "ithBaths": "@{triggerBody()['ithBaths']}",
  "ithSqft": "@{triggerBody()['ithSqft']}",
  "ithGarage": "@{triggerBody()['ithGarage']}",
  "compBuilder": "@{triggerBody()['compBuilder']}",
  "compAddress": "@{triggerBody()['compAddress']}",
  "compPriceNum": @{triggerBody()['compPriceNum']},
  "compBeds": "@{triggerBody()['compBeds']}",
  "compBaths": "@{triggerBody()['compBaths']}",
  "compSqft": "@{triggerBody()['compSqft']}",
  "compGarage": "@{triggerBody()['compGarage']}",
  "agentName": "@{triggerBody()['agentName']}",
  "agentPhone": "@{triggerBody()['agentPhone']}",
  "agentEmail": "@{triggerBody()['agentEmail']}"
}
```

---

## Step 2: Parse JSON Response

**Action:** Parse JSON

**Content:** `@{body('HTTP')}`

**Schema:**
```json
{
  "type": "object",
  "properties": {
    "filename": { "type": "string" },
    "contentType": { "type": "string" },
    "base64": { "type": "string" }
  }
}
```

---

## Step 3: Send Email with PDF Attachment

**Action:** Office 365 Outlook — Send an email (V2)

**To:** `@{triggerBody()['buyerEmail']}`

**Subject:** `Your Custom Home Comparison — InTownHomes vs @{triggerBody()['compBuilder']}`

**Body (HTML):**
```html
<p>Hi @{triggerBody()['buyerName']},</p>

<p>Thank you for your interest in InTownHomes! Attached is your personalized
home comparison showing our <strong>@{triggerBody()['ithPlan']}</strong>
side-by-side with the @{triggerBody()['compBuilder']} listing.</p>

<p>Highlights of what sets InTownHomes apart:</p>
<ul>
  <li><strong>Rainscreen Siding System</strong> — advanced moisture protection</li>
  <li><strong>2x6 Wall Construction</strong> — 33% more insulation than standard</li>
  <li><strong>Navien Tankless Water Heater</strong> — save $450/year on energy</li>
  <li><strong>Spray Foam Insulation</strong> — airtight seal, lower energy bills</li>
</ul>

<p>I'd love to schedule a tour so you can see the quality difference in person.
Feel free to reply to this email or call me at @{triggerBody()['agentPhone']}.</p>

<p>Best regards,<br>
<strong>@{triggerBody()['agentName']}</strong><br>
@{triggerBody()['agentPhone']}<br>
InTownHomes — Houston, TX</p>
```

**Attachments:**
- **Name:** `Home-Comparison-@{triggerBody()['buyerName']}.pdf`
- **Content:** `@{base64ToBinary(body('Parse_JSON')?['base64'])}`

---

## Step 4: Return Success to Copilot

**Action:** Respond to Copilot

**Output:**
```
Flyer sent to @{triggerBody()['buyerEmail']} successfully.
```

---

## Hosting the PDF Generator

The HTTP endpoint in Step 1 needs to be accessible from Power Automate.
Options (free or near-free):

### Option A: Azure Functions (recommended)
- Free tier: 1M executions/month
- Deploy the generator as a serverless function
- See `setup-guide.md` for instructions

### Option B: Run locally with ngrok (for testing)
```bash
cd generator
npm install
npm run server
# In another terminal:
ngrok http 3001
```
Use the ngrok URL in the Power Automate HTTP action.

### Option C: Azure App Service (Free tier)
- F1 free tier: 60 min CPU/day (plenty for flyer generation)
- Deploy the Express server directly
