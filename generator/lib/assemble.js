/**
 * assemble.js — Flyer data assembly
 *
 * Takes normalized input, computes all derived values (mortgage payments,
 * differences, appreciation), and produces the complete data object
 * ready for template rendering.
 */

/**
 * Calculate monthly mortgage payment breakdown.
 */
function calcPayment(price, downPct = 0.20, rate = 0.065, years = 30) {
  const principal = price * (1 - downPct);
  const monthlyRate = rate / 12;
  const n = years * 12;

  const pi = principal * (monthlyRate * Math.pow(1 + monthlyRate, n))
    / (Math.pow(1 + monthlyRate, n) - 1);

  const tax = (price * 0.03) / 12;        // ~3% Houston property tax
  const insurance = (price * 0.0024) / 12; // ~0.24% homeowners insurance

  return {
    total: Math.round(pi + tax + insurance),
    principal: Math.round(pi),
    tax: Math.round(tax),
    insurance: Math.round(insurance),
  };
}

function fmt(n) {
  if (n == null || isNaN(n)) return 'N/A';
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * Assemble the complete flyer data from normalized input.
 * Returns an object with all template variables populated.
 */
function assembleFlyerData(input) {
  const ithPayment = input.ithPriceNum
    ? calcPayment(input.ithPriceNum, input.downPaymentPct, input.interestRate, input.loanTermYears)
    : { total: 0, principal: 0, tax: 0, insurance: 0 };

  const compPayment = input.compPriceNum
    ? calcPayment(input.compPriceNum, input.downPaymentPct, input.interestRate, input.loanTermYears)
    : { total: 0, principal: 0, tax: 0, insurance: 0 };

  const energySavingsMonthly = 200; // $2,400/year ÷ 12

  const templateVars = {
    // Buyer & agent
    buyerName: input.buyerName || 'Valued Buyer',
    agentName: input.agentName || 'Your InTownHomes Agent',
    agentPhone: input.agentPhone || '',
    agentEmail: input.agentEmail || '',
    agentInitials: (input.agentName || 'ITH')
      .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),

    // InTownHomes listing
    ithPrice: fmt(input.ithPriceNum),
    ithPlan: input.ithPlan || 'InTownHomes Plan',
    ithAddress: input.ithAddress || '',
    ithBeds: input.ithBeds || 'N/A',
    ithBaths: input.ithBaths || 'N/A',
    ithSqft: input.ithSqft ? Number(String(input.ithSqft).replace(/,/g, '')).toLocaleString('en-US') : 'N/A',
    ithGarage: input.ithGarage || 'N/A',
    ithPhoto: input.ithPhoto || '',
    ithMonthly: fmt(ithPayment.total),
    ithPrincipal: fmt(ithPayment.principal),
    ithTax: fmt(ithPayment.tax),
    ithInsurance: fmt(ithPayment.insurance),
    ithEffective: fmt(ithPayment.total - energySavingsMonthly),
    ithAppreciation: fmt(Math.round((input.ithPriceNum || 0) * 0.182)),

    // Competitor listing
    compPrice: fmt(input.compPriceNum),
    compBuilder: input.compBuilder || 'Competitor',
    compAddress: input.compAddress || '',
    compBeds: input.compBeds || 'N/A',
    compBaths: input.compBaths || 'N/A',
    compSqft: input.compSqft ? Number(input.compSqft).toLocaleString('en-US') : 'N/A',
    compGarage: input.compGarage || 'N/A',
    compPhoto: input.compPhoto || '',
    compMonthly: fmt(compPayment.total),
    compPrincipal: fmt(compPayment.principal),
    compTax: fmt(compPayment.tax),
    compInsurance: fmt(compPayment.insurance),
    compEffective: fmt(compPayment.total + energySavingsMonthly),
    compAppreciation: fmt(Math.round((input.compPriceNum || 0) * 0.124)),

    // Computed comparisons
    priceDifference: fmt(Math.abs((input.ithPriceNum || 0) - (input.compPriceNum || 0))),
    monthlyDifference: fmt(Math.abs(ithPayment.total - compPayment.total)),
    effectiveDifference: fmt(Math.abs(
      (ithPayment.total - energySavingsMonthly) - (compPayment.total + energySavingsMonthly)
    )),
    priceDirLabel: (input.ithPriceNum || 0) >= (input.compPriceNum || 0)
      ? 'InTownHomes costs more'
      : 'InTownHomes costs less',
  };

  // Summary strings for the API response
  const summary = {
    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    ithSummary: `${templateVars.ithPlan} — ${templateVars.ithPrice} — ${templateVars.ithBeds}bd/${templateVars.ithBaths}ba/${templateVars.ithSqft}sqft`,
    compSummary: `${templateVars.compBuilder} — ${templateVars.compPrice} — ${templateVars.compBeds}bd/${templateVars.compBaths}ba/${templateVars.compSqft}sqft`,
    priceDifference: templateVars.priceDifference,
    monthlyDifference: templateVars.monthlyDifference,
    effectiveDifference: templateVars.effectiveDifference,
  };

  // Email draft
  const emailDraft = {
    to: input.buyerEmail,
    subject: `Your Custom Home Comparison — InTownHomes vs ${input.compBuilder || 'Competitor'}`,
    bodyHtml: buildEmailBody(input, templateVars),
    attachmentName: `Home-Comparison-${(input.buyerName || 'Buyer').replace(/\s+/g, '-')}.pdf`,
  };

  return { templateVars, summary, emailDraft };
}

function buildEmailBody(input, vars) {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Hi ${input.buyerName},</p>

  <p>Thank you for your interest in InTownHomes! Attached is your personalized
  home comparison showing our <strong>${vars.ithPlan}</strong> side-by-side
  with the ${input.compBuilder || 'competitor'} listing.</p>

  <p><strong>Quick highlights of what sets InTownHomes apart:</strong></p>
  <ul style="line-height: 1.8;">
    <li><strong>Rainscreen Siding System</strong> — advanced moisture protection ($15K value)</li>
    <li><strong>2x6 Wall Construction</strong> — 33% more insulation than standard</li>
    <li><strong>Navien Tankless Water Heater</strong> — save $450/year on energy</li>
    <li><strong>Spray Foam Insulation</strong> — airtight seal, R-21 walls</li>
    <li><strong>KitchenAid Appliances</strong> — pro-grade stainless steel</li>
    <li><strong>Quartz Countertops</strong> — kitchen and all bathrooms</li>
  </ul>

  <p>The monthly payment difference is only <strong>${vars.effectiveDifference}</strong>
  when you factor in energy savings — and you get <strong>$50K+ in premium features</strong>
  that the competition doesn't include.</p>

  <p>I'd love to schedule a tour so you can see the quality difference in person.
  Feel free to reply to this email or call me at <strong>${input.agentPhone}</strong>.</p>

  <p>Best regards,<br>
  <strong>${input.agentName}</strong><br>
  ${input.agentPhone}<br>
  <a href="mailto:${input.agentEmail}">${input.agentEmail}</a><br>
  InTownHomes — Houston, TX</p>
</div>`;
}

module.exports = { assembleFlyerData, calcPayment, fmt };
