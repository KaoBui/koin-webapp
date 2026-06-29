// Per-user merchant memory helpers shared by the AI-import route (which seeds the
// prompt with existing rules) and the import confirmation action (which upserts
// rules from saved transactions). Both paths MUST derive the merchant key the
// same way or learned mappings won't match on the next import.

/**
 * Normalize a transaction description into a stable merchant key: lowercase and
 * trimmed. Returns null when there's nothing left to key on (so callers can skip
 * creating an empty rule).
 */
export function normalizeMerchantKey(raw: unknown): string | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  return value ? value : null;
}
