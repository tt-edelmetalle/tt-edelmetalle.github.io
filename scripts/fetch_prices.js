// scripts/fetch_prices.js
// Node 18+ (nutzt global fetch). Schreibt docs/prices.json
// Erwartet ENV: GOLDAPI_KEY

import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY = process.env.GOLDAPI_KEY;
if (!KEY) {
    console.error("Fehler: Environment-Variable GOLDAPI_KEY nicht gesetzt.");
    process.exit(2);
}

const ENDPOINT_BASE = "https://www.goldapi.io/api"; // /API/{symbol}/{currency}

// Metalle und Währung (EUR)
const pairs = [
    { symbol: "XAU", name: "gold" },
    { symbol: "XAG", name: "silver" },
    { symbol: "XPT", name: "platinum" },
    { symbol: "XPD", name: "palladium" },
];

async function fetchPair(symbol, currency = "EUR") {
    const url = `${ENDPOINT_BASE}/${symbol}/${currency}`;
    const res = await fetch(url, { headers: { "x-access-token": KEY, "Content-Type": "application/json" } });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status} for ${url}: ${body}`);
    }
    const json = await res.json();
    return json;
}

(async () => {
    try {
        const out = {
            fetched_from: "goldapi.io",
            updated_at: new Date().toISOString(),
            rates: {}
        };

        for (const p of pairs) {
            try {
                const r = await fetchPair(p.symbol, "EUR");
                // GoldAPI typical response: { metal: "XAU", currency: "EUR", price: 3625.12, timestamp: 123456789 }
                // Verwandle in per_oz (GoldAPI liefert price = price per oz in specified currency)
                const pricePerOz = typeof r.price === "number" ? r.price : null;
                out.rates[p.name] = { per_oz: pricePerOz, raw: r };
            } catch (err) {
                console.warn(`Warnung: Fehler beim Abruf ${p.symbol}:`, err.message);
                out.rates[p.name] = { per_oz: null, error: err.message };
            }
        }

        // Schreibe in docs/prices.json
        const docsDir = path.join(__dirname, "..", "docs");
        fs.mkdirSync(docsDir, { recursive: true });
        const outPath = path.join(docsDir, "prices.json");
        fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
        console.log("Wrote", outPath);
        process.exit(0);
    } catch (err) {
        console.error("Fatal error:", err);
        process.exit(3);
    }
})();
