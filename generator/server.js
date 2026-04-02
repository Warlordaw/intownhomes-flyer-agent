/**
 * server.js — HTTP API for the InTownHomes Flyer Generator
 *
 * Pipeline: Normalize → Validate → Assemble → Render → Respond
 *
 * Endpoints:
 *   GET  /                — health check
 *   POST /generate        — generate flyer (default: returns JSON + base64 PDF)
 *   POST /generate?format=base64  — returns base64 only (for Power Automate)
 *   POST /generate?format=email   — generates + emails via Microsoft Graph
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const { normalizeInput } = require('./lib/normalize');
const { validateFlyerInput } = require('./lib/validate');
const { assembleFlyerData } = require('./lib/assemble');
const { generatePdf } = require('./lib/render');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'InTownHomes Flyer Generator', version: '2.0.0' });
});

// Main generation endpoint
app.post('/generate', async (req, res) => {
  try {
    // ── Step 1: Normalize ────────────────────────
    const normalized = normalizeInput(req.body);

    // ── Step 2: Validate ─────────────────────────
    const validation = validateFlyerInput(normalized);

    if (!validation.isReady) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed — missing required fields',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // ── Step 3: Assemble ─────────────────────────
    const { templateVars, summary, emailDraft } = assembleFlyerData(normalized);

    // ── Step 4: Render PDF ───────────────────────
    const filename = `comparison-${Date.now()}.pdf`;
    const outputDir = path.join(__dirname, '..', 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, filename);

    await generatePdf(templateVars, outputPath);

    const pdfBuffer = fs.readFileSync(outputPath);
    const base64 = pdfBuffer.toString('base64');
    const sizeBytes = pdfBuffer.length;
    fs.unlinkSync(outputPath); // Clean up

    // ── Step 5: Respond ──────────────────────────

    // Base64-only response (for Power Automate)
    if (req.query.format === 'base64') {
      return res.json({ filename, contentType: 'application/pdf', base64 });
    }

    // Email response (generate + send via Graph)
    if (req.query.format === 'email') {
      const sent = await sendEmailWithGraph(normalized, emailDraft, base64);
      return res.json({
        status: sent ? 'success' : 'success_with_warnings',
        message: sent
          ? `Flyer generated and emailed to ${normalized.buyerEmail}`
          : `Flyer generated but email could not be sent (Graph API not configured). PDF is in the response.`,
        filename,
        ...summary,
        warnings: validation.warnings,
        pdf: { base64, contentType: 'application/pdf', sizeBytes },
        emailDraft: sent ? null : emailDraft,
      });
    }

    // Default: full response for Copilot agent
    res.json({
      status: validation.warnings.length > 0 ? 'success_with_warnings' : 'success',
      message: `Comparison flyer generated for ${normalized.buyerName}`,
      filename,
      ...summary,
      warnings: validation.warnings,
      info: validation.info,
      pdf: { base64, contentType: 'application/pdf', sizeBytes },
      emailDraft,
    });

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Microsoft Graph email sender (optional) ──────────
async function sendEmailWithGraph(data, emailDraft, pdfBase64) {
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const tenantId = process.env.GRAPH_TENANT_ID;
  const senderEmail = process.env.SENDER_EMAIL || data.agentEmail;

  if (!clientId || !clientSecret || !tenantId) {
    console.log('Graph API not configured — skipping email');
    return false;
  }

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      }
    );
    const { access_token } = await tokenRes.json();

    const emailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: emailDraft.subject,
            body: { contentType: 'HTML', content: emailDraft.bodyHtml },
            toRecipients: [{ emailAddress: { address: emailDraft.to } }],
            attachments: [{
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: emailDraft.attachmentName,
              contentType: 'application/pdf',
              contentBytes: pdfBase64,
            }],
          },
        }),
      }
    );

    if (emailRes.ok) {
      console.log(`Email sent to ${emailDraft.to}`);
      return true;
    }
    console.error('Graph email error:', await emailRes.text());
    return false;
  } catch (err) {
    console.error('Email error:', err);
    return false;
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`InTownHomes Flyer Generator v2.0.0`);
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`POST /generate — generate flyer (default: full response)`);
  console.log(`POST /generate?format=base64 — base64 PDF only`);
  console.log(`POST /generate?format=email — generate + email via Graph`);
});
