import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Koin",
  description: "Terms of Service for the invite-only personal finance tracker.",
};

const LAST_UPDATED = "July 7, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            1. What this is
          </h2>
          <p>
            Koin (&ldquo;Koin&rdquo;) is a small, invite-only personal finance
            tracker operated by Kao Bui as an individual, non-commercial
            project. It lets a handful of invited people track their own
            transactions, budgets, and connected bank accounts. Access is
            limited to email addresses that have been explicitly whitelisted.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            2. Eligibility &amp; accounts
          </h2>
          <p>
            You may only use Koin if you have been invited and your Google
            account email is on the whitelist. You sign in with Google; you are
            responsible for keeping access to that Google account secure. Each
            user only ever sees their own data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            3. Bank connections
          </h2>
          <p>
            Koin can connect to your bank through Enable Banking, a regulated
            open-banking (PSD2) provider, to import your transactions. This
            access is <strong>read-only</strong> — Koin can view account and
            transaction information but cannot move money or make payments.
            Imported transactions land in a review queue and are only added to
            your ledger after you approve them. You can disconnect a bank at any
            time, and bank consents expire automatically (roughly every 90 days)
            unless you renew them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            4. Acceptable use
          </h2>
          <p>
            Use Koin only for your own personal finance tracking. Don&rsquo;t
            attempt to access other users&rsquo; data, disrupt the service, or
            use it for anything unlawful. Because access is invite-only, please
            don&rsquo;t share your access or invite others without permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            5. No warranty
          </h2>
          <p>
            Koin is provided &ldquo;as is,&rdquo; with no warranties of any
            kind. It is a hobby project, not a bank, accountant, or financial
            advisor. Balances, categories, and imported data may be incomplete
            or inaccurate — don&rsquo;t rely on it for tax, legal, or financial
            decisions. Always verify important figures with your bank.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            6. Limitation of liability
          </h2>
          <p>
            To the fullest extent allowed by law, the operator is not liable for
            any loss or damage arising from your use of (or inability to use)
            Koin, including any inaccuracy in the data it displays or
            imports.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            7. Changes &amp; termination
          </h2>
          <p>
            These terms may change over time; the &ldquo;last updated&rdquo;
            date above reflects the current version. Access may be removed at
            any time, for example if the project is wound down. You can stop
            using Koin and request deletion of your data at any time (see the{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            ).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">8. Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a
              href="mailto:contact@kaobui.com"
              className="underline hover:text-foreground"
            >
              contact@kaobui.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
      </div>
    </main>
  );
}
