"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRESET_COLORS, PRESET_ICONS } from "@/lib/category-constants";

import { createCategory, deleteCategory, updateCategory } from "./actions";

export type CategoryItem = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  monthlyLimit: number | null;
  transactionCount: number;
};

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

export function CategoryManager({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryItem | null>(null);
  const [deleting, setDeleting] = React.useState<CategoryItem | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category: CategoryItem) {
    setEditing(category);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-foreground">
            Categories
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Organise your spending and set optional monthly budgets.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-full px-5">
          <PlusIcon />
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border bg-muted/60 p-12 text-center">
          <p className="text-[15px] text-muted-foreground">
            You don&apos;t have any categories yet.
          </p>
          <Button onClick={openCreate} className="mt-5 rounded-full px-5">
            <PlusIcon />
            Create your first category
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-shadow hover:shadow-notion"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: category.color ?? "#e5e7eb" }}
                aria-hidden
              >
                {category.icon ?? "🏷️"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{category.name}</p>
                  {category.isDefault && (
                    <span className="rounded-full border bg-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      default
                    </span>
                  )}
                </div>
                {category.monthlyLimit != null ? (
                  <p className="text-xs text-muted-foreground">
                    {eur.format(category.monthlyLimit)} / mo
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50">No budget</p>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(category)}
                  aria-label={`Edit ${category.name}`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleting(category)}
                  aria-label={`Delete ${category.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
      />
      <DeleteCategoryDialog
        category={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryItem | null;
}) {
  const isEdit = category !== null;
  const [color, setColor] = React.useState<string>(PRESET_COLORS[0]);
  const [icon, setIcon] = React.useState<string>(PRESET_ICONS[0]);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Reset picker state whenever the dialog opens (for create or a given edit).
  React.useEffect(() => {
    if (open) {
      setColor(category?.color ?? PRESET_COLORS[0]);
      setIcon(category?.icon ?? PRESET_ICONS[0]);
      setError(null);
    }
  }, [open, category]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("color", color);
    formData.set("icon", icon);
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(formData)
        : await createCategory(formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Pick a name, colour and icon. Budgets are set on the Budgets page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={category.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={category?.name ?? ""}
              placeholder="e.g. Groceries"
              required
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  style={{ backgroundColor: preset }}
                  className={cn(
                    "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition",
                    color === preset && "ring-2 ring-ring",
                  )}
                  aria-label={`Colour ${preset}`}
                  aria-pressed={color === preset}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIcon(preset)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border text-lg transition",
                    icon === preset
                      ? "border-ring ring-2 ring-ring"
                      : "border-input hover:bg-accent",
                  )}
                  aria-label={`Icon ${preset}`}
                  aria-pressed={icon === preset}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full px-5">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({
  category,
  onOpenChange,
}: {
  category: CategoryItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const linked = category?.transactionCount ?? 0;

  function handleDelete() {
    if (!category) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{category?.name}”?</DialogTitle>
          <DialogDescription>
            {linked > 0
              ? `This category is linked to ${linked} transaction${
                  linked === 1 ? "" : "s"
                }. They'll be kept but become uncategorised (their category is cleared).`
              : "This category isn't linked to any transactions."}
          </DialogDescription>
        </DialogHeader>

        {linked > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Heads up: {linked} transaction{linked === 1 ? "" : "s"} will lose this
            category.
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-full px-5"
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
