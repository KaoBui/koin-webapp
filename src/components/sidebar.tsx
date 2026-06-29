"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ResetAccountButton } from "@/components/reset-account-button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/budgets", label: "Budgets" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/import", label: "Import" },
  { href: "/categories", label: "Categories" },
];

const COMING_SOON: string[] = [];

export function Sidebar({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/40">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-bold tracking-[-0.02em]">
        <span
          className="h-2.5 w-2.5 rounded-full bg-primary"
          aria-hidden
        />
        Finance
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
      </div>
    </aside>
  );
}
