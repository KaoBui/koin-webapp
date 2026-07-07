import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Koin",
  description: "Privacy Policy for the invite-only personal finance tracker.",
};

const LAST_UPDATED = "July 7, 2026";

export default function PrivacyPage() {
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

      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-3">
          <p>
            Koin (&ldquo;Koin&rdquo;) is an invite-only personal finance tracker
            operated by Kao Bui as an individual. This policy explains what data
            Koin collects, why, and who it&rsquo;s shared
            with. It&rsquo;s written to be honest and readable rather than
            exhaustive — if anything is unclear, just ask.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            1. Data collected
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Account &amp; sign-in.</strong> When you sign in with
              Google, Koin receives your name, email address, and profile
              image. Your email is used to confirm you&rsquo;re on the invite
              whitelist and to keep your data separate from other users&rsquo;.
            </li>
            <li>
              <strong>Finance data you enter.</strong> Transactions, categories,
              budgets, and accounts you create or edit in Koin.
            </li>
            <li>
              <strong>Bank data you import.</strong> If you connect a bank via
              Enable Banking, Koin imports transaction details (date, amount,
              description/merchant, and account information) on a{" "}
              <strong>read-only</strong> basis. It cannot initiate payments or
              move money.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            2. How it&rsquo;s used
          </h2>
          <p>
            Your data is used only to provide Koin to you: displaying your
            transactions and balances, categorizing and budgeting, and importing
            bank activity that you review before it&rsquo;s saved. It is not sold
            and not used for advertising.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            3. Third-party services
          </h2>
          <p>
            Koin relies on a few service providers to function. Data is shared
            with them only as needed to run Koin:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Google</strong> — sign-in (OAuth authentication).
            </li>
            <li>
              <strong>Enable Banking</strong> — regulated open-banking (PSD2)
              provider used to connect to your bank and import transactions,
              read-only.
            </li>
            <li>
              <strong>Supabase</strong> — database hosting where your data is
              stored.
            </li>
            <li>
              <strong>Anthropic</strong> — used to help categorize and parse
              imported transactions. Relevant transaction text may be sent to
              Anthropic&rsquo;s API to do this.
            </li>
          </ul>
          <p>
            Each of these providers has its own privacy practices governing how
            they handle data on their side.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">4. Storage</h2>
          <p>
            Your data is stored in a Supabase Postgres database. Every record is
            tied to your user account, and Koin is built so that each user can
            only ever read their own data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">5. Retention</h2>
          <p>
            Your data is kept for as long as your account is active. If you ask
            for your account to be deleted, your data will be removed from
            Koin&rsquo;s database. Disconnecting a bank stops further imports;
            bank consents also expire automatically (roughly every 90 days)
            unless renewed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            6. Your choices
          </h2>
          <p>
            You can edit or delete your transactions, categories, budgets, and
            accounts directly in Koin, disconnect any linked bank at any time,
            and request full deletion of your account and data by emailing the
            contact below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">7. Contact</h2>
          <p>
            For any privacy question or a data-deletion request, email{" "}
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
        <Link href="/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
      </div>
    </main>
  );
}
