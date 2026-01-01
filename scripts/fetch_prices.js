// scripts/fetch_prices.js
// Node 18+ (global fetch). Schreibt docs/prices.json
// ENV: GOLDAPI_KEY

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY = process.env.GOLDAPI_KEY;
if (!KEY) {
  console.error("ERROR: Environment variable GOLDAPI_KEY is not set.");
  process.exit(2);
}

if (typeof fetch !== "function") {
  console.error("ERROR: global fetch is not available. Use Node 18+ or provide a fetch polyfill.");
  process.exit(6);
}
if (typeof AbortController === "undefined") {
  console.error("ERROR: AbortController is not available. Use Node 18+.");
  process.exit(7);
}

const ENDPOINT_BASE = "https://www.goldapi.io/api";
const pairs = [
  { symbol: "XAU", name: "gold" },
  { symbol: "XAG", name: "silver" },
  { symbol: "XPT", name: "platinum" },
  { symbol: "XPD", name: "palladium" },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 10000) {
  let attempt = 0;
  let backoff = 1000;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const signal = controller.signal;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      const msg = err?.name === "AbortError" ? "Timeout/Abort" : err.message || String(err);
      if (attempt > retries) {
        const e = new Error(`Fetch failed (${msg}) after ${attempt} attempts: ${url}`);
        e.cause = err;
        throw e;
      }
      console.warn(`Fetch attempt ${attempt} failed for ${url}: ${msg}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      backoff *= 2;
    }
  }
}

async function fetchPair(symbol, currency = "EUR") {
  const url = `${ENDPOINT_BASE}/${symbol}/${currency}`;
  const headers = { "x-access-token": KEY, "Content-Type": "application/json" };
  const res = await fetchWithRetry(url, { headers }, 3, 12000);
  if (!res.ok) {
    // try to read body for better diagnostics (but guard against binary)
    const body = await res.text().catch(() => "<unreadable body>");
    const err = new Error(`HTTP ${res.status} for ${url}: ${body}`);
    err.status = res.status;
    throw err;
  }

  // try to parse JSON, but guard against invalid JSON
  try {
    return await res.json();
  } catch (e) {
    const txt = await res.text().catch(() => "<unreadable body>");
    const err = new Error(`Invalid JSON response from ${url}: ${txt}`);
    throw err;
  }
}

(async () => {
  console.log("Starting price fetch...");
  const out = { fetched_from: "goldapi.io", updated_at: new Date().toISOString(), rates: {} };

  for (const p of pairs) {
    try {
      console.log(`Requesting ${p.symbol}/EUR`);
      const r = await fetchPair(p.symbol, "EUR");
      let pricePerOz = null;
      if (r?.price !== undefined) {
        const n = Number(r.price);
        pricePerOz = Number.isFinite(n) ? n : null;
      }
      if (pricePerOz === null && r?.ask !== undefined) {
        const n = Number(r.ask);
        pricePerOz = Number.isFinite(n) ? n : null;
      }
      out.rates[p.name] = { per_oz: pricePerOz, raw: r };
      console.log(`  -> ${p.name}: ${pricePerOz}`);
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`Error fetching ${p.symbol}:`, message);
      out.rates[p.name] = { per_oz: null, error: message, status: err.status || null };
    }
  }

  const docsDir = path.join(__dirname, "..", "docs");
  try {
    fs.mkdirSync(docsDir, { recursive: true });
  } catch (e) {
    console.error("Failed to create docs directory:", e.message || e);
    process.exit(4);
  }

  const outPath = path.join(docsDir, "prices.json");
  try {
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
    console.log("WROTE", outPath);
  } catch (e) {
    console.error("Failed to write output file:", e.message || e);
    process.exit(5);
  }

  const anyNumber = Object.values(out.rates).some(r => typeof r.per_oz === "number");
  if (!anyNumber) {
    console.error("ERROR: No valid prices retrieved.");
    process.exit(3);
  }

  process.exit(0);
})();
