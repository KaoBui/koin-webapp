import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/enablebanking";
import { BANK_STATE_COOKIE, mapEbAccount } from "@/lib/banking";

/**
 * Bank consent callback. Enable Banking redirects the user's browser here with a
 * `code` (or `error`). We verify the CSRF `state`, exchange the code for a
 * session, and create one FinancialAccount + BankConnection per bank account
 * (per-account model). Then we send the user back to /accounts.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const back = (params: string) =>
    NextResponse.redirect(new URL(`/accounts?${params}`, url.origin));

  const error = url.searchParams.get("error");
  if (error) return back(`bank_error=${encodeURIComponent(error)}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get(BANK_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return back("bank_error=invalid_state");
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", url.origin));

  let ebSession;
  try {
    ebSession = await createSession(code);
  } catch (err) {
    console.error("Enable Banking session exchange failed:", err);
    return back("bank_error=session_failed");
  }

  const validUntil = new Date(ebSession.access.valid_until);
  const aspspName = ebSession.aspsp.name;
  const aspspCountry = ebSession.aspsp.country;

  for (const acc of ebSession.accounts) {
    const existing = await prisma.bankConnection.findUnique({
      where: { userId_accountUid: { userId, accountUid: acc.uid } },
    });

    if (existing) {
      // Re-connect: refresh the session/consent, keep the linked account.
      await prisma.bankConnection.update({
        where: { id: existing.id },
        data: { sessionId: ebSession.session_id, validUntil, aspspName, aspspCountry },
      });
      continue;
    }

    const mapped = mapEbAccount(acc);
    const isFirst = (await prisma.financialAccount.count({ where: { userId } })) === 0;

    await prisma.$transaction(async (tx) => {
      const financialAccount = await tx.financialAccount.create({
        data: {
          userId,
          name: mapped.name,
          type: mapped.type,
          currency: mapped.currency,
          balance: 0,
          isDefault: isFirst,
        },
      });
      await tx.bankConnection.create({
        data: {
          userId,
          financialAccountId: financialAccount.id,
          accountUid: acc.uid,
          sessionId: ebSession.session_id,
          validUntil,
          aspspName,
          aspspCountry,
        },
      });
    });
  }

  const res = back("bank_connected=1");
  res.cookies.delete(BANK_STATE_COOKIE);
  return res;
}
