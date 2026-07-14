import axios from "axios";

// Fallback rates used only if the live fetch fails entirely. Update
// occasionally, but this is just a safety net — normal operation always
// uses live rates fetched below.
const FALLBACK_RATES = {
  USD: 96, EUR: 101, GBP: 118, AUD: 63, SGD: 71,
  JPY: 0.61, THB: 2.8, AED: 26, CNY: 13.4, IDR: 0.0059,
};

const CURRENCIES = Object.keys(FALLBACK_RATES);

/**
 * Fetches today's real exchange rates for several common currencies to
 * INR, from Frankfurter — a free currency API (ECB data) needing no key.
 *
 * Why multiple currencies, not just USD: search results for flights/
 * hotels reflect whatever currency is standard for that destination
 * (e.g. AUD for Australia, EUR for France) — assuming everything is USD
 * and converting at the USD rate would give a wrong number for anywhere
 * that isn't the US.
 *
 * Returns an object like { USD: 96.1, EUR: 101.3, AUD: 63.2, ... } so the
 * AI can match whichever currency actually appears in the source data.
 */
export async function getExchangeRatesToInr() {
  try {
    const res = await axios.get("https://api.frankfurter.app/latest", {
      params: { from: "INR", to: CURRENCIES.join(",") },
    });

    const inrToOthers = res.data?.rates;
    if (!inrToOthers) return FALLBACK_RATES;

    // API gives "1 INR = X foreign currency" — invert to get
    // "1 foreign currency = Y INR", which is what we actually want.
    const result = {};
    for (const code of CURRENCIES) {
      const rate = inrToOthers[code];
      result[code] = rate ? 1 / rate : FALLBACK_RATES[code];
    }
    return result;
  } catch (err) {
    console.error("[getExchangeRatesToInr] failed, using fallback:", err.message);
    return FALLBACK_RATES;
  }
}