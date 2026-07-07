import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const pendingCount = session.user.id
    ? await prisma.pendingTransaction.count({ where: { userId: session.user.id } })
    : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userEmail={session.user.email ?? ""}
        pendingCount={pendingCount}
      >
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </Sidebar>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
