"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ResetAccountButton } from "@/components/reset-account-button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/budgets", label: "Budgets" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/review", label: "Review" },
  { href: "/import", label: "Import" },
  { href: "/categories", label: "Categories" },
];

const COMING_SOON: string[] = [];

export function Sidebar({
  userEmail,
  pendingCount = 0,
  children,
}: {
  userEmail: string;
  pendingCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em]">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          Koin
        </div>
      </header>

      {/* Backdrop (mobile only, when open) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r bg-background transition-transform md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:bg-muted/40",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5 text-lg font-bold tracking-[-0.02em]">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          Koin
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                {item.label}
                {item.href === "/review" && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}

          {COMING_SOON.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-muted-foreground/60">
                Coming soon
              </p>
              {COMING_SOON.map((label) => (
                <span
                  key={label}
                  className="flex cursor-not-allowed items-center rounded-md px-3 py-2 text-sm text-muted-foreground/40"
                >
                  {label}
                </span>
              ))}
            </>
          )}
        </nav>

        <div className="border-t p-3">
          <p
            className="truncate px-2 pb-2 text-xs text-muted-foreground"
            title={userEmail}
          >
            {userEmail}
          </p>
          {children}
          <ResetAccountButton />
          <p className="px-2 pt-3 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span className="mx-1.5">·</span>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </p>
        </div>
      </aside>
    </>
  );
}
