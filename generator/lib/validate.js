/**
 * validate.js — Input validation and review
 *
 * Checks flyer data for completeness, reasonableness, and flags
 * anything that needs human verification before generating.
 */

/**
 * Validate the normalized flyer input.
 * Returns { isReady, errors, warnings, info }
 */
function validateFlyerInput(data) {
  const errors = [];   // Block generation
  const warnings = []; // Generate but flag
  const info = [];     // FYI only

  // ── Required fields ──────────────────────────────
  if (!data.buyerName) {
    errors.push({ field: 'buyerName', message: 'Buyer name is required', severity: 'error' });
  }

  if (!data.buyerEmail || !isValidEmail(data.buyerEmail)) {
    errors.push({ field: 'buyerEmail', message: 'Valid buyer email is required', severity: 'error' });
  }

  if (!data.ithAddress) {
    errors.push({ field: 'ithAddress', message: 'InTownHomes address is required', severity: 'error' });
  }

  if (!data.ithPriceNum || data.ithPriceNum <= 0) {
    errors.push({ field: 'ithPriceNum', message: 'InTownHomes price must be a positive number', severity: 'error' });
  }

  if (!data.compAddress) {
    errors.push({ field: 'compAddress', message: 'Competitor address is required', severity: 'error' });
  }

  if (!data.compPriceNum || data.compPriceNum <= 0) {
    errors.push({ field: 'compPriceNum', message: 'Competitor price must be a positive number', severity: 'error' });
  }

  if (!data.agentName) {
    errors.push({ field: 'agentName', message: 'Agent name is required', severity: 'error' });
  }

  if (!data.agentPhone) {
    errors.push({ field: 'agentPhone', message: 'Agent phone is required', severity: 'error' });
  }

  if (!data.agentEmail) {
    errors.push({ field: 'agentEmail', message: 'Agent email is required', severity: 'error' });
  }

  // ── Reasonableness checks ────────────────────────

  // Price range for Houston market
  if (data.ithPriceNum && (data.ithPriceNum < 100_000 || data.ithPriceNum > 5_000_000)) {
    warnings.push({
      field: 'ithPriceNum',
      message: `InTownHomes price $${data.ithPriceNum.toLocaleString()} seems unusual for Houston. Please verify.`,
      severity: 'needs_verification',
    });
  }

  if (data.compPriceNum && (data.compPriceNum < 100_000 || data.compPriceNum > 5_000_000)) {
    warnings.push({
      field: 'compPriceNum',
      message: `Competitor price $${data.compPriceNum.toLocaleString()} seems unusual for Houston. Please verify.`,
      severity: 'needs_verification',
    });
  }

  // Sqft range
  for (const [prefix, label] of [['ith', 'InTownHomes'], ['comp', 'Competitor']]) {
    const sqft = parseInt(data[`${prefix}Sqft`]);
    if (sqft && (sqft < 800 || sqft > 8000)) {
      warnings.push({
        field: `${prefix}Sqft`,
        message: `${label} sqft (${sqft}) seems unusual. Typical range: 800-8,000.`,
        severity: 'needs_verification',
      });
    }
  }

  // Beds/baths sanity
  for (const [prefix, label] of [['ith', 'InTownHomes'], ['comp', 'Competitor']]) {
    const beds = parseFloat(data[`${prefix}Beds`]);
    const sqft = parseInt(data[`${prefix}Sqft`]);
    if (beds && sqft && beds > 0 && sqft / beds < 200) {
      warnings.push({
        field: `${prefix}Beds`,
        message: `${label} has ${beds} beds in ${sqft} sqft — that's less than 200 sqft/bedroom. Please verify.`,
        severity: 'needs_verification',
      });
    }
  }

  // ── Missing optional fields ──────────────────────
  const optionalChecks = [
    ['ithBeds', 'InTownHomes bedrooms'],
    ['ithBaths', 'InTownHomes bathrooms'],
    ['ithSqft', 'InTownHomes square footage'],
    ['ithGarage', 'InTownHomes garage'],
    ['compBeds', 'Competitor bedrooms'],
    ['compBaths', 'Competitor bathrooms'],
    ['compSqft', 'Competitor square footage'],
    ['compGarage', 'Competitor garage'],
  ];

  for (const [field, label] of optionalChecks) {
    if (!data[field]) {
      info.push({
        field,
        message: `${label} not provided — will show as N/A on flyer`,
        severity: 'missing',
      });
    }
  }

  // ── InTownHomes vs competitor price logic ────────
  if (data.ithPriceNum && data.compPriceNum) {
    if (data.ithPriceNum < data.compPriceNum) {
      info.push({
        field: 'priceDifference',
        message: 'InTownHomes is priced LOWER than the competitor. The flyer language assumes InTownHomes costs more but delivers more value. Consider adjusting the template messaging.',
        severity: 'info',
      });
    }
  }

  return {
    isReady: errors.length === 0,
    errors,
    warnings,
    info,
    allIssues: [...errors, ...warnings, ...info],
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { validateFlyerInput };
