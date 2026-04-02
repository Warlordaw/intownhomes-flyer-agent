/**
 * render.js — HTML template rendering and PDF generation
 *
 * Fills the HTML template with assembled data and uses Puppeteer
 * to render it to a PDF.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', 'template', 'comparison-template.html');

/**
 * Fill the HTML template with the assembled template variables.
 */
function fillTemplate(templateVars) {
  let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(templateVars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }

  // Handle conditional photo blocks
  html = html.replace(
    /\{\{#if ithPhoto\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    templateVars.ithPhoto ? '$1' : '$2'
  );
  html = html.replace(
    /\{\{#if compPhoto\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    templateVars.compPhoto ? '$1' : '$2'
  );

  return html;
}

/**
 * Render filled HTML to a PDF file using Puppeteer.
 * Returns the output path.
 */
async function renderPdf(filledHtml, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(filledHtml, { waitUntil: 'networkidle0', timeout: 30000 });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  return outputPath;
}

/**
 * Generate a PDF from template variables.
 * Convenience function combining fill + render.
 */
async function generatePdf(templateVars, outputPath) {
  const html = fillTemplate(templateVars);
  await renderPdf(html, outputPath);
  return outputPath;
}

module.exports = { fillTemplate, renderPdf, generatePdf };
