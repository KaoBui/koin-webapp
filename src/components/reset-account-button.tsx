"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetAccount } from "@/app/(app)/reset-action";

export function ResetAccountButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetAccount();
      if (!result.ok) {
        setError(result.error);
      } else {
        setOpen(false);
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-2 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Reset account
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset account?</DialogTitle>
            <DialogDescription>
              This permanently deletes all your transactions, accounts and
              budgets, and resets your categories to the defaults. This can&apos;t
              be undone.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReset}
              disabled={isPending}
            >
              {isPending ? "Resetting…" : "Reset everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
