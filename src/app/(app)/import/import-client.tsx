"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { saveImportedTransactions, type ImportRow } from "./actions";

type CategoryOption = { id: string; name: string };
type AccountOption = { id: string; name: string; isDefault: boolean };

type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
  mediaType: string;
  data: string; // base64 without the data: prefix
};

type ExtractedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
};

type Row = {
  key: string;
  checked: boolean;
  date: string;
  description: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  accountId: string;
};

const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

const selectClass =
  "flex w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function readImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => {
      const result = String(reader.result);
      const commaIdx = result.indexOf(",");
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl: result,
        mediaType: file.type,
        data: commaIdx >= 0 ? result.slice(commaIdx + 1) : "",
      });
    };
    reader.readAsDataURL(file);
  });
}

function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 animate-spin"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
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
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function ImportClient({
  categories,
  accounts,
}: {
  categories: CategoryOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? "";

  const [images, setImages] = React.useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const [extracting, setExtracting] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[] | null>(null);

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);
    const accepted = Array.from(fileList).filter((f) =>
      ACCEPTED_TYPES.includes(f.type),
    );
    if (accepted.length === 0) {
      setError("Please choose PNG or JPG images.");
      return;
    }
    const read = await Promise.all(accepted.map(readImage));
    setImages((prev) => [...prev, ...read]);
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (extracting) return;
    void addFiles(e.dataTransfer.files);
  }

  async function onExtract() {
    if (images.length === 0) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({
            data: img.data,
            mediaType: img.mediaType,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Extraction failed.");
        return;
      }
      const txns = (json.transactions ?? []) as ExtractedTransaction[];
      if (txns.length === 0) {
        setError("No transactions were found in the image(s).");
        return;
      }
      setRows(
        txns.map((t) => ({
          key: crypto.randomUUID(),
          checked: true,
          date: t.date,
          description: t.description,
          amount: String(t.amount),
          type: t.type,
          // Pre-fill the AI's category suggestion; the user can still change it.
          categoryId: t.categoryId ?? "",
          accountId: defaultAccountId,
        })),
      );
    } catch {
      setError("Could not reach the import service.");
    } finally {
      setExtracting(false);
    }
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.key === key ? { ...r, ...patch } : r)) : prev,
    );
  }

  function removeRow(key: string) {
    setRows((prev) => {
      if (!prev) return prev;
      const next = prev.filter((r) => r.key !== key);
      // If every extracted row was removed, return to the upload step.
      return next.length > 0 ? next : null;
    });
  }

  async function onSave() {
    if (!rows) return;
    const selected = rows.filter((r) => r.checked);
    if (selected.length === 0) {
      setError("Select at least one transaction to save.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: ImportRow[] = selected.map((r) => ({
      date: r.date,
      description: r.description,
      amount: Number(r.amount),
      type: r.type,
      categoryId: r.categoryId || null,
      accountId: r.accountId || null,
    }));
    const result = await saveImportedTransactions(payload);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push("/transactions");
  }

  function reset() {
    setRows(null);
    setImages([]);
    setError(null);
  }

  const selectedCount = rows?.filter((r) => r.checked).length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">
          Import from screenshot
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Upload bank statement screenshots and let AI extract the transactions.
          Review and edit before saving.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {rows === null ? (
        <div>
          <div
            role="button"
            tabIndex={extracting ? -1 : 0}
            aria-disabled={extracting}
            onClick={() => {
              if (!extracting) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (!extracting && (e.key === "Enter" || e.key === " ")) {
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!extracting) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/40 p-12 text-center transition-colors",
              extracting
                ? "pointer-events-none opacity-60"
                : "cursor-pointer hover:bg-muted/70",
              dragActive ? "border-primary bg-primary/5" : "border-input",
            )}
          >
            <p className="text-sm font-medium">
              Drag &amp; drop images here, or click to choose
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG or JPG — you can add several at once
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              disabled={extracting}
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative overflow-hidden rounded-lg border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    aria-label={`Remove ${img.name}`}
                    className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                  <p className="truncate px-2 py-1 text-xs text-muted-foreground">
                    {img.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={onExtract}
              disabled={images.length === 0 || extracting}
              className="rounded-full px-5"
            >
              {extracting && <Spinner />}
              {extracting ? "Extracting…" : "Extract transactions"}
            </Button>
            {images.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {images.length} image{images.length === 1 ? "" : "s"} ready
              </span>
            )}
          </div>
        </div>
      ) : (
        <div>
          {accounts.length === 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              No accounts yet — you can add one later. These transactions will be
              saved without an account.
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-8 px-3 py-2.5"></th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Account</th>
                  <th className="w-8 px-3 py-2.5">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.key} className={cn(!row.checked && "opacity-50")}>
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(e) =>
                          updateRow(row.key, { checked: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-input"
                        aria-label="Include this transaction"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) =>
                          updateRow(row.key, { date: e.target.value })
                        }
                        className="h-8 w-[9.5rem]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row.key, { description: e.target.value })
                        }
                        className="h-8 min-w-[12rem]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(row.key, { amount: e.target.value })
                        }
                        className="h-8 w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.type}
                        onChange={(e) =>
                          updateRow(row.key, {
                            type: e.target.value as "INCOME" | "EXPENSE",
                          })
                        }
                        className={cn(selectClass, "h-8 w-28")}
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.categoryId}
                        onChange={(e) =>
                          updateRow(row.key, { categoryId: e.target.value })
                        }
                        className={cn(selectClass, "h-8 w-40")}
                      >
                        <option value="">Uncategorised</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.accountId}
                        onChange={(e) =>
                          updateRow(row.key, { accountId: e.target.value })
                        }
                        className={cn(selectClass, "h-8 w-40")}
                        disabled={accounts.length === 0}
                      >
                        <option value="">No account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.key)}
                        disabled={saving}
                        aria-label="Remove this transaction"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={onSave}
              disabled={saving || selectedCount === 0}
              className="rounded-full px-5"
            >
              {saving && <Spinner />}
              {saving
                ? "Saving…"
                : `Confirm & save ${selectedCount} transaction${
                    selectedCount === 1 ? "" : "s"
                  }`}
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              disabled={saving}
              className="rounded-full px-5"
            >
              Start over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
