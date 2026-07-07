// Smoke test: proves ENABLE_BANKING_APP_ID + PRIVATE_KEY authenticate.
// Run: npx tsx scripts/eb-smoke.ts
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  // Dynamic import so dotenv populates process.env before the module reads it.
  const { listAspsps } = await import("../src/lib/enablebanking");
  const { aspsps } = await listAspsps("FI");
  console.log(`OK — auth works. ${aspsps.length} bank(s) returned for FI.`);
  for (const a of aspsps.slice(0, 8)) console.log(`  - ${a.name} (${a.country})`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
