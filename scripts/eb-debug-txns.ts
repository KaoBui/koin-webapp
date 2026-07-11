// Debug: try several date-range variations against the bank transactions API.
// Run: npx tsx scripts/eb-debug-txns.ts
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { getTransactions } = await import("../src/lib/enablebanking");

  const conns = await prisma.bankConnection.findMany();
  const c = conns[0];
  if (!c) {
    console.log("No bank connections.");
    return;
  }
  console.log(`Account ${c.aspspName} uid=${c.accountUid}`);
  console.log(`real now: ${new Date().toISOString()}`);

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const variants: Array<[string, string | undefined]> = [
    ["no date_from", undefined],
    ["90 days", daysAgo(90)],
    ["365 days", daysAgo(365)],
    ["730 days", daysAgo(730)],
    ["3650 days", daysAgo(3650)],
  ];

  for (const [label, dateFrom] of variants) {
    try {
      const page = await getTransactions(c.accountUid, { dateFrom });
      const n = page.transactions?.length ?? 0;
      console.log(`\n[${label}] from=${dateFrom ?? "-"} -> ${n} txn(s), cont=${page.continuation_key ?? "none"}`);
      if (n > 0) {
        console.log("sample:", JSON.stringify(page.transactions[0], null, 2));
        break;
      }
    } catch (err) {
      console.log(`\n[${label}] from=${dateFrom ?? "-"} -> ERROR: ${(err as Error).message}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
