"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ResetAccountButton } from "@/components/reset-account-button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/import", label: "Import" },
  { href: "/categories", label: "Categories" },
];

const COMING_SOON = ["Budgets"];

export function Sidebar({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/20">
      <div className="px-5 py-5 text-lg font-semibold tracking-tight">
        Finance
      </div>

      <nav className="flex-1 space-y-1 px-3">
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
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}

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
