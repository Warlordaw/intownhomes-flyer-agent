/**
 * normalize.js — Listing data normalization
 *
 * Takes raw/messy input from the Copilot agent and normalizes it
 * into clean, validated data for the flyer generator.
 */

/**
 * Parse a price string or number into a clean integer.
 * Handles: "$589,000", "589000", "$589K", "589k", 589000
 */
function normalizePrice(input) {
  if (typeof input === 'number') return Math.round(input);
  if (!input) return null;

  let s = String(input).trim().replace(/[$,\s]/g, '');

  // Handle "589K" or "589k"
  if (/^\d+(\.\d+)?[kK]$/.test(s)) {
    return Math.round(parseFloat(s) * 1000);
  }

  // Handle "1.2M" or "1.2m"
  if (/^\d+(\.\d+)?[mM]$/.test(s)) {
    return Math.round(parseFloat(s) * 1_000_000);
  }

  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/**
 * Parse beds/baths/sqft/garage from a single string.
 * Handles: "4 bed 3.5 bath 3245 sqft 3 car"
 *          "4/3.5/3245/3"
 *          "4bd 3.5ba 3245sf 3gar"
 */
function parseSpecs(input) {
  if (!input) return {};
  const s = String(input).toLowerCase().trim();

  const specs = {};

  // Try "beds/baths/sqft/garage" slash format
  const slashMatch = s.match(/^(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)\s*\/\s*(\d+,?\d*)\s*\/\s*(\d+)$/);
  if (slashMatch) {
    return {
      beds: slashMatch[1],
      baths: slashMatch[2],
      sqft: slashMatch[3].replace(/,/g, ''),
      garage: slashMatch[4],
    };
  }

  // Extract beds
  const bedMatch = s.match(/(\d+\.?\d*)\s*(?:bed|bd|br|bedroom)/);
  if (bedMatch) specs.beds = bedMatch[1];

  // Extract baths
  const bathMatch = s.match(/(\d+\.?\d*)\s*(?:bath|ba|bathroom)/);
  if (bathMatch) specs.baths = bathMatch[1];

  // Extract sqft
  const sqftMatch = s.match(/(\d+,?\d+)\s*(?:sq\s*ft|sqft|sf|square\s*f)/);
  if (sqftMatch) specs.sqft = sqftMatch[1].replace(/,/g, '');

  // Extract garage
  const garMatch = s.match(/(\d+)\s*(?:car|gar|garage)/);
  if (garMatch) specs.garage = garMatch[1];

  return specs;
}

/**
 * Normalize a phone number to (XXX) XXX-XXXX format.
 */
function normalizePhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return as-is if we can't parse it
  return String(input).trim();
}

/**
 * Normalize the full input payload from the Copilot agent
 * into the shape expected by the generator.
 */
function normalizeInput(raw) {
  return {
    buyerName: (raw.buyerName || raw.buyer?.name || '').trim(),
    buyerEmail: (raw.buyerEmail || raw.buyer?.email || '').trim().toLowerCase(),

    ithPlan: (raw.ithPlan || raw.inTownHomesListing?.planName || 'InTownHomes Plan').trim(),
    ithAddress: (raw.ithAddress || raw.inTownHomesListing?.address || '').trim(),
    ithPriceNum: normalizePrice(raw.ithPriceNum || raw.inTownHomesListing?.price),
    ithBeds: String(raw.ithBeds || raw.inTownHomesListing?.beds || ''),
    ithBaths: String(raw.ithBaths || raw.inTownHomesListing?.baths || ''),
    ithSqft: String(raw.ithSqft || raw.inTownHomesListing?.sqft || '').replace(/,/g, ''),
    ithGarage: String(raw.ithGarage || raw.inTownHomesListing?.garage || ''),
    ithPhoto: raw.ithPhoto || raw.inTownHomesListing?.photoUrl || '',

    compBuilder: (raw.compBuilder || raw.competitorListing?.builderName || 'Competitor').trim(),
    compAddress: (raw.compAddress || raw.competitorListing?.address || '').trim(),
    compPriceNum: normalizePrice(raw.compPriceNum || raw.competitorListing?.price),
    compBeds: String(raw.compBeds || raw.competitorListing?.beds || ''),
    compBaths: String(raw.compBaths || raw.competitorListing?.baths || ''),
    compSqft: String(raw.compSqft || raw.competitorListing?.sqft || '').replace(/,/g, ''),
    compGarage: String(raw.compGarage || raw.competitorListing?.garage || ''),
    compPhoto: raw.compPhoto || raw.competitorListing?.photoUrl || '',

    agentName: (raw.agentName || raw.agent?.name || '').trim(),
    agentPhone: normalizePhone(raw.agentPhone || raw.agent?.phone),
    agentEmail: (raw.agentEmail || raw.agent?.email || '').trim().toLowerCase(),

    // Options with defaults
    downPaymentPct: raw.options?.downPaymentPct ?? 0.20,
    interestRate: raw.options?.interestRate ?? 0.065,
    loanTermYears: raw.options?.loanTermYears ?? 30,
  };
}

module.exports = { normalizePrice, parseSpecs, normalizePhone, normalizeInput };
