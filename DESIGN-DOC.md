# InTownHomes Comparison Flyer — Copilot Agent Design Document

## 1. Executive Recommendation

**Build a Copilot Studio declarative agent inside Teams** that collects listing data conversationally, generates a branded PDF comparison flyer via a lightweight Node.js API, and presents it for human review before the salesperson sends it to the buyer.

### Why this approach

| Option | Complexity | Time to POC | Cost | Verdict |
|--------|-----------|-------------|------|---------|
| **Copilot Studio + API Plugin + Node/Puppeteer** | Low-medium | 1-2 weeks | Free tier | **Recommended for POC** |
| Copilot Studio + Power Automate + Word template | Low | 1 week | Free | Worse formatting control |
| Custom Teams bot (Bot Framework SDK) | High | 3-4 weeks | Free | Over-engineered for POC |
| Power App with embedded Copilot | Medium | 2 weeks | Free | More UI work, less conversational |

**POC architecture:** Copilot Studio declarative agent → calls Node.js API → Puppeteer renders HTML template to PDF → returns to agent → salesperson reviews → sends via Outlook.

**Long-term architecture:** Same agent, add MLS API integration for auto-fill, Microsoft Graph for direct email send, SharePoint for flyer archive, Power BI for usage analytics.

### What the salesperson does in the POC

1. Opens the agent in Teams
2. Says "create a comparison flyer"
3. Types in both listing details (InTownHomes + competitor)
4. Reviews the generated PDF in Teams
5. Sends it to the buyer from their Outlook (agent drafts the email)

### What's automated vs manual

| Step | POC | Future |
|------|-----|--------|
| Listing data entry | Manual (salesperson types it) | Auto-fill from MLS API |
| Premium features (rainscreen, etc.) | Always included — baked into template | Same |
| Payment calculations | Auto-computed from price | Same |
| PDF generation | Automated | Same |
| Email to buyer | Salesperson reviews + sends | Auto-send with approval gate |
| Flyer archival | Manual save | Auto-save to SharePoint |

---

## 2. Solution Architecture

### POC Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Microsoft Teams                                         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Copilot Studio Declarative Agent               │     │
│  │                                                 │     │
│  │  1. Collects buyer info                         │     │
│  │  2. Collects InTownHomes listing details        │     │
│  │  3. Collects competitor listing details          │     │
│  │  4. Collects agent info                         │     │
│  │  5. Shows confirmation summary                  │     │
│  │  6. Calls API plugin → generateFlyer            │     │
│  │  7. Returns adaptive card with PDF link         │     │
│  └───────────────────┬─────────────────────────────┘     │
│                      │ POST /generate                    │
│                      ▼                                   │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Node.js API (Azure App Service Free Tier)      │     │
│  │                                                 │     │
│  │  ┌──────────────┐  ┌────────────────────────┐   │     │
│  │  │ Template     │  │ Generator              │   │     │
│  │  │ Engine       │──│ (Puppeteer)            │   │     │
│  │  │              │  │                        │   │     │
│  │  │ Fills {{vars}}│  │ HTML → PDF            │   │     │
│  │  └──────────────┘  └────────────────────────┘   │     │
│  │                                                 │     │
│  │  ┌──────────────┐  ┌────────────────────────┐   │     │
│  │  │ Mortgage     │  │ Validation             │   │     │
│  │  │ Calculator   │  │ Engine                 │   │     │
│  │  └──────────────┘  └────────────────────────┘   │     │
│  └───────────────────┬─────────────────────────────┘     │
│                      │                                   │
│                      ▼                                   │
│  Returns: { message, PDF base64, summary }               │
│                                                          │
│  Agent shows adaptive card:                              │
│  ┌─────────────────────────────────────────────────┐     │
│  │  ✅ Flyer Generated!                            │     │
│  │  Buyer: John Davis                              │     │
│  │  ITH: The Oakmont — $589,000                    │     │
│  │  Comp: Meritage — $464,000                      │     │
│  │                                                 │     │
│  │  [📄 Download PDF]  [📧 Draft Email]            │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### Long-Term Architecture (Phase 3)

```
┌────────────────────────────────────────────────────────────────┐
│  Teams Copilot Agent                                           │
│       │                                                        │
│       ├──→ MLS/ILS API (Bridge, Spark, RESO)                  │
│       │       └── Auto-fill listing data from MLS #            │
│       │                                                        │
│       ├──→ SharePoint Knowledge Base                           │
│       │       └── Approved marketing language, community data  │
│       │                                                        │
│       ├──→ Node.js Generator API                               │
│       │       └── Template fill → Puppeteer → PDF              │
│       │                                                        │
│       ├──→ Microsoft Graph API                                 │
│       │       ├── Send email with PDF attachment               │
│       │       └── Save PDF to SharePoint document library      │
│       │                                                        │
│       └──→ Power Automate (optional orchestration)             │
│               └── Approval flow, logging, notifications        │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. User Workflow

### Step-by-step in Teams

```
SALESPERSON opens Teams → finds "ITH Flyer Generator" agent

AGENT: "Hi! I can create a branded comparison flyer for you.
        What would you like to do?"

        [Create a comparison flyer]  [Compare listings]  [Showing prep]

SALESPERSON clicks "Create a comparison flyer"

AGENT: "Great! Who is this flyer for?"
SALESPERSON: "John Davis, john.davis@gmail.com"

AGENT: "Got it. Now the InTownHomes listing:
        What's the plan name, address, price, beds/baths/sqft/garage?"
SALESPERSON: "The Oakmont, 2347 Riverside Dr Houston TX 77008,
              589000, 4 bed 3.5 bath 3245 sqft 3 car"

AGENT: "Now the competitor listing:
        Builder name, address, price, beds/baths/sqft/garage?"
SALESPERSON: "Meritage Homes, 1842 Garden Oaks Blvd Houston TX 77008,
              464000, 4 bed 3 bath 2890 sqft 2 car"

AGENT: "Last — your contact info for the flyer?"
SALESPERSON: "Sarah Mitchell, 713-555-0142, sarah@intownhomes.com"

AGENT: "Here's what I have:
        ┌──────────────────────────────────────────┐
        │ InTownHomes: The Oakmont Plan            │
        │ 2347 Riverside Dr — $589,000             │
        │ 4bd / 3.5ba / 3,245sqft / 3-car         │
        │                                          │
        │ vs.                                      │
        │                                          │
        │ Meritage Homes                           │
        │ 1842 Garden Oaks Blvd — $464,000         │
        │ 4bd / 3ba / 2,890sqft / 2-car            │
        │                                          │
        │ Sending to: John Davis                   │
        │ (john.davis@gmail.com)                   │
        └──────────────────────────────────────────┘

        Does this look correct?"

SALESPERSON: "Yes"

AGENT: [calls /generate API]

AGENT: "✅ Flyer generated!
        ┌──────────────────────────────────────────┐
        │ Home Comparison — John Davis             │
        │                                          │
        │ InTownHomes: The Oakmont — $589,000      │
        │ Meritage Homes — $464,000                │
        │ Price diff: $125,000                     │
        │ Monthly diff: $970 → $570 effective      │
        │                                          │
        │ [📄 Download PDF]  [📧 Draft Email]      │
        └──────────────────────────────────────────┘"

SALESPERSON clicks [📧 Draft Email]
→ Opens Outlook compose with pre-filled:
  - To: john.davis@gmail.com
  - Subject: Your Custom Home Comparison — InTownHomes vs Meritage Homes
  - Body: branded email template
  - Attachment: comparison PDF
→ SALESPERSON reviews, edits if needed, hits Send
```

### Missing/uncertain data handling

If the salesperson provides incomplete data:

```
AGENT: "I noticed you didn't provide the competitor's square footage.

        ⚠️ Missing: competitor sqft

        I can still generate the flyer, but the specs comparison
        will show 'N/A' for that field. Want to:

        [Add the missing info]  [Generate anyway]"
```

---

## 4. Data Schema

### Flyer Input Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ComparisonFlyerInput",
  "type": "object",
  "required": [
    "buyer", "inTownHomesListing", "competitorListing", "agent"
  ],
  "properties": {
    "buyer": {
      "type": "object",
      "required": ["name", "email"],
      "properties": {
        "name":  { "type": "string", "minLength": 1 },
        "email": { "type": "string", "format": "email" }
      }
    },
    "inTownHomesListing": {
      "type": "object",
      "required": ["address", "price"],
      "properties": {
        "planName":   { "type": "string", "default": "InTownHomes Plan" },
        "address":    { "type": "string", "minLength": 1 },
        "price":      { "type": "number", "minimum": 1 },
        "beds":       { "type": "string" },
        "baths":      { "type": "string" },
        "sqft":       { "type": "string" },
        "garage":     { "type": "string" },
        "photoUrl":   { "type": "string", "format": "uri" },
        "mlsNumber":  { "type": "string" }
      }
    },
    "competitorListing": {
      "type": "object",
      "required": ["address", "price"],
      "properties": {
        "builderName": { "type": "string", "default": "Competitor" },
        "address":     { "type": "string", "minLength": 1 },
        "price":       { "type": "number", "minimum": 1 },
        "beds":        { "type": "string" },
        "baths":       { "type": "string" },
        "sqft":        { "type": "string" },
        "garage":      { "type": "string" },
        "photoUrl":    { "type": "string", "format": "uri" },
        "mlsNumber":   { "type": "string" }
      }
    },
    "agent": {
      "type": "object",
      "required": ["name", "phone", "email"],
      "properties": {
        "name":  { "type": "string" },
        "phone": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "downPaymentPct":  { "type": "number", "default": 0.20 },
        "interestRate":    { "type": "number", "default": 0.065 },
        "loanTermYears":   { "type": "integer", "default": 30 },
        "propertyTaxRate": { "type": "number", "default": 0.03 },
        "insuranceRate":   { "type": "number", "default": 0.0024 },
        "energySavingsMonthly": { "type": "number", "default": 200 }
      }
    }
  }
}
```

### Flyer Output Schema

```json
{
  "title": "ComparisonFlyerOutput",
  "type": "object",
  "properties": {
    "status":    { "enum": ["success", "success_with_warnings", "error"] },
    "message":   { "type": "string" },
    "filename":  { "type": "string" },

    "summary": {
      "type": "object",
      "properties": {
        "buyerName":          { "type": "string" },
        "buyerEmail":         { "type": "string" },
        "ithSummary":         { "type": "string" },
        "compSummary":        { "type": "string" },
        "priceDifference":    { "type": "string" },
        "monthlyDifference":  { "type": "string" },
        "effectiveDifference": { "type": "string" }
      }
    },

    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field":   { "type": "string" },
          "message": { "type": "string" },
          "severity": { "enum": ["missing", "uncertain", "needs_verification"] }
        }
      }
    },

    "pdf": {
      "type": "object",
      "properties": {
        "base64":     { "type": "string" },
        "contentType": { "type": "string", "const": "application/pdf" },
        "sizeBytes":  { "type": "integer" }
      }
    },

    "emailDraft": {
      "type": "object",
      "properties": {
        "to":          { "type": "string" },
        "subject":     { "type": "string" },
        "bodyHtml":    { "type": "string" },
        "attachmentName": { "type": "string" }
      }
    }
  }
}
```

### Validation Rules

| Field | Rule | On failure |
|-------|------|-----------|
| buyer.email | Valid email format | Block generation |
| *.price | > 0 and < 10,000,000 | Block generation |
| *.beds | 1-10 | Warn |
| *.baths | 1-10 | Warn |
| *.sqft | 100-50,000 | Warn |
| *.garage | 0-10 | Warn |
| *.address | Non-empty string | Block generation |
| agent.phone | Matches phone pattern | Warn |
| *.photoUrl | Valid URL or empty | Skip photo |

---

## 5. Prompts

### 5A. System Prompt (Declarative Agent Instructions)

```
You are a sales assistant for InTownHomes, a premium home builder in Houston, TX.
Your sole job is to help salespeople create comparison flyer PDFs.

CONTEXT:
Every InTownHomes build includes these standard premium features — the salesperson
does NOT need to enter these, and they are ALWAYS shown on the flyer:
- Rainscreen siding system ($15K value) — advanced moisture management
- 2x6 wall construction — 33% more insulation than standard 2x4
- Navien tankless water heater — saves ~$450/year on energy
- Spray foam insulation — R-21 walls, R-38 attic (vs R-13/R-30 standard)
- KitchenAid stainless steel appliances (pro-grade)
- Quartz countertops in kitchen and all bathrooms
- Luxury vinyl plank flooring throughout the home
- Smart home package — Nest thermostat, smart locks, security cameras

COLLECTION FLOW:
1. BUYER INFO: Full name and email address.
2. INTOWNHOMES LISTING: Plan name, address, price, beds, baths, sqft, garage.
3. COMPETITOR LISTING: Builder name, address, price, beds, baths, sqft, garage.
4. AGENT INFO: Salesperson name, phone, email.
5. CONFIRM: Show a formatted summary and ask for confirmation.
6. GENERATE: Call the generateFlyer action. Report success with the adaptive card.

RULES:
- Be conversational and efficient. Ask multiple related fields at once.
- Parse multi-field answers intelligently (e.g. "4 bed 3.5 bath 3245 sqft").
- Format prices with $ and commas in the confirmation summary.
- Calculate and mention the price difference in the summary.
- If a field is missing, tell the user which field and offer to proceed with N/A.
- NEVER invent property details. Only use what the salesperson provides.
- NEVER send the flyer directly. Always return it for review first.
- If the user says "start over", clear all collected data and restart.
```

### 5B. Extraction Prompt (Raw Listing Text → Structured Data)

This is used if the salesperson pastes a raw MLS description instead of typing structured fields.

```
Extract property listing details from the following text. Return ONLY a JSON object
with these fields. Use null for any field you cannot confidently extract.

Required fields:
- address: full street address with city, state, zip
- price: number only, no $ or commas
- beds: number of bedrooms as string
- baths: number of bathrooms as string (e.g. "3.5")
- sqft: living square footage as string
- garage: number of garage spaces as string
- builderName: builder or seller name if mentioned

Also extract if present:
- planName: floor plan or model name
- mlsNumber: MLS/ILS listing number
- yearBuilt: year built
- lotSize: lot size in sqft or acres

For each extracted field, add a confidence score:
- "high": clearly stated in the text
- "medium": inferred from context
- "low": uncertain, needs verification

Return format:
{
  "extracted": { ...fields... },
  "confidence": { ...field: "high"|"medium"|"low"... },
  "missing": ["field1", "field2"],
  "warnings": ["any concerns about the data"]
}

TEXT TO EXTRACT FROM:
---
{{rawListingText}}
---
```

### 5C. Content Generation Prompt (NOT used in POC)

For future use — generating marketing copy from approved templates:

```
You are writing marketing content for an InTownHomes comparison flyer.

RULES:
- ONLY use language from the approved content library below.
- NEVER invent statistics, awards, or claims.
- If the content library doesn't cover a topic, say "[NEEDS APPROVED COPY]".
- Keep tone professional, confident, and buyer-focused.
- Maximum 2 sentences per section.

APPROVED CONTENT LIBRARY:
{{knowledgeBaseContent}}

SECTION TO WRITE: {{sectionName}}
PROPERTY DATA: {{propertyData}}
```

### 5D. Review Prompt (Validation & QA)

```
Review this comparison flyer data for completeness and accuracy.

FLYER DATA:
{{flyerDataJson}}

CHECK FOR:
1. Missing required fields — list each one
2. Price that seems unreasonable for Houston market ($200K-$2M typical)
3. Sqft that seems unreasonable (800-8000 typical for single-family)
4. Beds/baths mismatch with sqft (e.g. 5 beds in 1200 sqft)
5. Address format issues (missing city, state, or zip)
6. Agent contact info completeness

Return:
{
  "isReady": true/false,
  "issues": [
    { "field": "...", "message": "...", "severity": "error|warning|info" }
  ],
  "suggestions": ["..."]
}
```

---

## 6. Build Plan

### Phase 1: POC (1-2 weeks)

| Task | Time | Owner |
|------|------|-------|
| Deploy Node.js API to Azure App Service (free tier) | 2 hours | Dev |
| Create Copilot Studio agent with conversation topics | 4 hours | Dev |
| Connect API plugin to Copilot Studio | 2 hours | Dev |
| Sideload Teams app to test tenant | 1 hour | IT Admin |
| Test end-to-end with 3 real listing comparisons | 4 hours | Sales + Dev |
| Fix template layout issues from testing | 4 hours | Dev |
| **Total** | **~17 hours** | |

**POC delivers:** Salesperson can create a PDF in Teams, download it, and manually email it.

### Phase 2: Internal Workflow (2-4 weeks after POC)

| Task | Time |
|------|------|
| Add Microsoft Graph email integration (send from agent) | 8 hours |
| Add SharePoint document library for flyer archive | 4 hours |
| Add paste-listing-text extraction (LLM parsing) | 8 hours |
| Add photo URL support (MLS photos in the flyer) | 4 hours |
| Replace placeholder icons with real InTownHomes branding | 2 hours |
| Add configurable mortgage rates (not hardcoded) | 2 hours |
| User testing with full sales team | 8 hours |
| **Total** | **~36 hours** |

**Phase 2 delivers:** Email send from Teams, flyer archive, smarter input handling.

### Phase 3: Automation & Polish (4-8 weeks after Phase 2)

| Task | Time |
|------|------|
| MLS API integration (auto-fill from MLS number) | 16 hours |
| SharePoint knowledge base for approved marketing content | 8 hours |
| Power Automate approval workflow (manager review) | 8 hours |
| Analytics dashboard (flyers generated, sent, opened) | 8 hours |
| Multi-template support (different flyer styles) | 16 hours |
| Mobile-optimized flyer format | 8 hours |
| **Total** | **~64 hours** |

---

## 7. Template Strategy

### Recommendation: HTML → Puppeteer → PDF

**Why not Word templates:**
- Word content controls can't reproduce the gradient backgrounds, teal borders, side-by-side cards, and comparison table layout from the proof of concept
- Puppeteer renders pixel-perfect PDFs from HTML with full CSS support
- The HTML template is already built and working

**Why not Power Automate document generation:**
- Plumsail/Encodian connectors cost money
- Limited layout control compared to HTML/CSS
- Adds a dependency on a third-party connector

**Why HTML → PDF is best for this POC:**
- Full CSS control (gradients, grids, icons, colors)
- Free (Puppeteer is open source)
- The template is already built and tested
- Easy to iterate on the design
- Works on Azure App Service free tier

### Template field map

| Template Section | Fields Used |
|-----------------|------------|
| Header | agentName, agentPhone, logo (static) |
| Hero | buyerName |
| Quick Stats | priceDifference (computed), energySavings (static $2,400), ROI (static 18%), daysToMoveIn (static 45) |
| Side-by-Side Cards | ithPrice, ithPlan, ithAddress, ithMonthly, ithBeds, ithBaths, ithSqft, ithGarage, compPrice, compBuilder, compAddress, compMonthly, compBeds, compBaths, compSqft, compGarage |
| Feature Comparison Table | Static content (rainscreen, 2x6, tankless, spray foam, smart home, KitchenAid, flooring, countertops) |
| ROI Section | ithAppreciation (computed), compAppreciation (computed) |
| Payment Comparison | ithMonthly, ithPrincipal, ithTax, ithInsurance, ithEffective, compMonthly, compPrincipal, compTax, compInsurance, compEffective |
| Bottom Banner | monthlyDifference, effectiveDifference |
| Feature Explainers | Static content |
| CTA Footer | ithAddress, agentPhone |
| Agent Footer | agentName, agentPhone, agentEmail, agentInitials |

---

## 8. SharePoint Knowledge Base Structure

### Document Library: "InTownHomes Sales Content"

```
📁 InTownHomes Sales Content/
├── 📁 Standard Features/
│   ├── rainscreen-siding.md
│   ├── 2x6-wall-construction.md
│   ├── navien-tankless-water-heater.md
│   ├── spray-foam-insulation.md
│   ├── smart-home-package.md
│   ├── kitchenaid-appliances.md
│   ├── quartz-countertops.md
│   └── luxury-vinyl-plank.md
│
├── 📁 Communities/
│   ├── riverside-heights.md
│   ├── garden-oaks.md
│   └── oak-forest.md
│
├── 📁 Competitor Analysis/
│   ├── meritage-homes.md
│   ├── david-weekley.md
│   ├── perry-homes.md
│   └── competitor-template.md
│
├── 📁 Templates/
│   ├── comparison-flyer-template.html
│   ├── email-template.html
│   └── one-pager-template.html
│
├── 📁 Brand Assets/
│   ├── logo-color.png
│   ├── logo-white.png
│   ├── brand-guidelines.pdf
│   └── color-palette.md
│
└── 📁 Approved Copy/
    ├── taglines.md
    ├── energy-savings-claims.md
    ├── warranty-info.md
    └── disclaimers.md
```

### SharePoint List: "Floor Plans"

| Column | Type | Example |
|--------|------|---------|
| PlanName | Text | The Oakmont |
| BasePriceFrom | Currency | $549,000 |
| BasePriceTo | Currency | $629,000 |
| Beds | Number | 4 |
| Baths | Text | 3.5 |
| SqFtFrom | Number | 3,100 |
| SqFtTo | Number | 3,400 |
| Garage | Number | 3 |
| Stories | Number | 2 |
| PhotoUrl | URL | https://... |
| FloorPlanPdf | URL | https://... |
| Status | Choice | Active / Coming Soon / Sold Out |
| Communities | Lookup | Riverside Heights; Garden Oaks |

---

## 9. Copilot Studio Topic Design

### Topic: "Create Comparison Flyer"

**Trigger phrases:**
- create a flyer
- create a comparison
- compare a listing
- make a comparison flyer
- generate a flyer
- new flyer
- compare homes

**Nodes:**

```
[Trigger] ──→ [Message: "Let's create a flyer! Who is it for?"]
                │
                ▼
          [Question: buyer name] ──→ Save to `buyerName`
                │
                ▼
          [Question: buyer email] ──→ Save to `buyerEmail`
                │
                ▼
          [Message: "Now the InTownHomes listing details."]
                │
                ▼
          [Question: plan name] ──→ Save to `ithPlan`
          [Question: address] ──→ Save to `ithAddress`
          [Question: price] ──→ Save to `ithPriceNum` (number)
          [Question: beds, baths, sqft, garage] ──→ Parse into 4 vars
                │
                ▼
          [Message: "Now the competitor listing."]
                │
                ▼
          [Question: builder name] ──→ Save to `compBuilder`
          [Question: address] ──→ Save to `compAddress`
          [Question: price] ──→ Save to `compPriceNum` (number)
          [Question: beds, baths, sqft, garage] ──→ Parse into 4 vars
                │
                ▼
          [Message: "Your info for the flyer:"]
                │
                ▼
          [Question: agent name, phone, email] ──→ 3 vars
                │
                ▼
          [Message: Formatted summary with all data]
          [Question: "Does this look correct? (Yes/No)"]
                │
                ├── Yes ──→ [Action: Call generateFlyer API plugin]
                │                │
                │                ▼
                │           [Message: Adaptive card with results]
                │
                └── No ──→ [Message: "What would you like to change?"]
                            ──→ Loop back to relevant question
```

---

## 10. Power Automate Flow Outline (Phase 2)

For the POC, the API plugin handles everything. In Phase 2, add this flow:

### Flow: "Generate Flyer and Send Email"

```
Trigger: "When Copilot calls this flow"
  Inputs: all 19 fields

Step 1: HTTP POST to Azure API
  URL: https://<api>/generate?format=base64
  Body: { all fields as JSON }

Step 2: Parse JSON response
  Extract: base64, filename, message

Step 3: Create file in SharePoint
  Library: InTownHomes Sales Content / Generated Flyers
  Filename: Comparison-{buyerName}-{timestamp}.pdf
  Content: base64ToBinary(base64)

Step 4: Send email (Office 365 Outlook)
  To: buyerEmail
  Subject: "Your Custom Home Comparison — InTownHomes vs {compBuilder}"
  Body: branded HTML email template
  Attachment: the PDF from SharePoint

Step 5: Post to Teams channel (optional)
  Channel: #sales-flyers
  Message: "{agentName} sent a comparison flyer to {buyerName}"

Step 6: Return result to Copilot
  Output: { status: "sent", sharePointUrl: "...", message: "..." }
```

---

## 11. Risks and Assumptions

### Assumptions

| # | Assumption | Impact if wrong |
|---|-----------|----------------|
| 1 | All salespeople have Teams + Copilot licenses | Agent won't be accessible — need to verify M365 plan includes Copilot |
| 2 | Tenant allows sideloading custom Teams apps | IT admin needs to enable this in Teams admin center |
| 3 | Azure App Service free tier is sufficient | May need B1 tier ($13/mo) if Puppeteer is too resource-heavy for F1 |
| 4 | InTownHomes premium features are standard on all builds | Template hardcodes these — if some plans differ, need a knowledge base lookup |
| 5 | Houston property tax rate ~3% is accurate enough | Rate varies by county; could make configurable |
| 6 | Salespeople will manually enter data for POC | If they won't adopt without MLS auto-fill, Phase 3 becomes Phase 1 |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **MLS terms of use** — scraping or displaying MLS data in marketing materials may violate MLS board rules | High | POC uses manual entry only. Phase 3 MLS integration needs legal review. Never display MLS-copyrighted photos without authorization. |
| **Hallucinated property data** — AI could invent details not provided by the salesperson | High | System prompt explicitly forbids inventing data. Only user-provided values appear on the flyer. Static features (rainscreen, etc.) are baked into the template, not AI-generated. |
| **Competitor claims** — flyer shows competitor as inferior (red X marks) | Medium | Feature comparison is factual (standard features vs premium). Don't make false claims about competitor builds. Add a disclaimer to the flyer. |
| **Puppeteer on Azure free tier** — Chromium needs ~300MB RAM, F1 tier has 1GB | Medium | Test on F1 first. Fall back to B1 ($13/mo) if needed. Or use Azure Functions consumption plan. |
| **Email deliverability** — PDFs in emails may trigger spam filters | Low | Use Microsoft Graph to send from the salesperson's own Exchange mailbox (not a generic sender). |
| **Data privacy** — buyer email addresses are processed through the API | Low | API runs on company Azure tenant. No third-party data processors. Add privacy notice to email. |

### Blockers to confirm before starting

1. **IT Admin:** Is custom Teams app sideloading enabled? Can we get it enabled for a test group?
2. **IT Admin:** Do we have an Azure subscription, or do we need to create one?
3. **IT Admin:** Is Copilot Studio included in the current M365 licensing?
4. **Legal:** Can we use competitor builder names in comparison marketing materials?
5. **Sales:** Are the premium features (rainscreen, 2x6, Navien, spray foam) truly standard on every InTownHomes build, or do they vary by plan/community?
6. **Sales:** What mortgage assumptions should we use? (Current defaults: 20% down, 6.5%, 30-year)
