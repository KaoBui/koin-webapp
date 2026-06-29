import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CategoryInfo = { id: string; name: string };
type MerchantRuleInfo = { merchantKey: string; categoryId: string };

// Seed the model with the user's category list plus their learned merchant→
// category mappings so extracted transactions come back pre-categorized.
function buildSystemPrompt(
  today: Date,
  categories: CategoryInfo[],
  rules: MerchantRuleInfo[],
): string {
  const todayIso = today.toISOString().slice(0, 10);
  const currentYear = today.getUTCFullYear();

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const categoryList = categories.length
    ? categories.map((c) => `- ${c.id}: ${c.name}`).join("\n")
    : "(this user has no categories yet)";

  const ruleLines = rules
    .map((r) => {
      const name = categoryNames.get(r.categoryId);
      // Skip mappings whose category was deleted — its id is no longer valid.
      if (!name) return null;
      return `- "${r.merchantKey}" → ${r.categoryId} (${name})`;
    })
    .filter((line): line is string => line !== null);
  const ruleSection = ruleLines.length
    ? `\n\nThis user has previously assigned these merchants to these categories:\n${ruleLines.join(
        "\n",
      )}`
    : "";

  return `You are a financial data extraction assistant. The user will provide a bank statement screenshot. Extract all transactions visible in the image and return them as a JSON array. Each transaction must have:
- date: ISO 8601 format (YYYY-MM-DD)
- description: merchant or transaction name
- amount: positive number
- type: "INCOME" or "EXPENSE"
- categoryId: the id of the most appropriate category, or null

Today's date is ${todayIso}. Bank statements often show only the day and month, not the year. When the year is not explicitly visible in the statement, assume the current year (${currentYear}). Never output a date in the future relative to today; if applying the current year would make a transaction's date later than ${todayIso}, use the previous year instead.

The user has the following categories:
${categoryList}${ruleSection}

For each extracted transaction, assign the most appropriate categoryId from the list above. Prefer the user's learned mappings when the merchant matches. Fall back to your best judgment for unknown merchants. If no category fits, return categoryId as null. Only ever use a categoryId that appears in the list above.

Return ONLY a valid JSON array, no markdown, no explanation. Each element must look like:
{ "date": "YYYY-MM-DD", "description": "string", "amount": number, "type": "INCOME"|"EXPENSE", "categoryId": "string|null" }
If you cannot find any transactions, return an empty array [].`;
}

type MediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
const ALLOWED_MEDIA: MediaType[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

type ImageInput = { data: string; mediaType: MediaType };
type ExtractedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
};

// Robustly pull a JSON array out of the model's text, tolerating stray prose or
// code fences despite the "JSON only" instruction. Returns null only when no
// valid JSON array can be parsed; an empty array [] parses to []. `validCategoryIds`
// guards against the model inventing or hallucinating ids — anything not owned by
// the user collapses to null so the client can show it as uncategorised.
function parseTransactions(
  text: string,
  validCategoryIds: Set<string>,
): ExtractedTransaction[] | null {
  if (!text) return null;
  let json = text.trim();

  const fenced = json.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) json = fenced[1].trim();

  if (!json.startsWith("[")) {
    const start = json.indexOf("[");
    const end = json.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return null;
    json = json.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const result: ExtractedTransaction[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const date = typeof rec.date === "string" ? rec.date : "";
    const description =
      typeof rec.description === "string" ? rec.description.trim() : "";
    const amount =
      typeof rec.amount === "number" ? rec.amount : Number(rec.amount);
    const type =
      rec.type === "INCOME" ? "INCOME" : rec.type === "EXPENSE" ? "EXPENSE" : null;
    const categoryId =
      typeof rec.categoryId === "string" && validCategoryIds.has(rec.categoryId)
        ? rec.categoryId
        : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!type) continue;

    result.push({ date, description, amount: Math.abs(amount), type, categoryId });
  }
  return result;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const userId = session.user.id;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI import isn't configured. Set ANTHROPIC_API_KEY in the environment.",
      },
      { status: 500 },
    );
  }

  let images: ImageInput[];
  try {
    const body = await request.json();
    images = Array.isArray(body?.images) ? body.images : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (images.length === 0) {
    return NextResponse.json({ error: "No images provided." }, { status: 400 });
  }
  for (const image of images) {
    if (!image?.data || !ALLOWED_MEDIA.includes(image?.mediaType)) {
      return NextResponse.json(
        { error: "Each image must be a PNG, JPG, GIF or WebP." },
        { status: 400 },
      );
    }
  }

  // Seed the prompt with this user's categories and learned merchant mappings.
  const [categories, rules] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.merchantRule.findMany({
      where: { userId },
      select: { merchantKey: true, categoryId: true },
    }),
  ]);
  const validCategoryIds = new Set(categories.map((c) => c.id));

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: buildSystemPrompt(new Date(), categories, rules),
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: image.mediaType,
                data: image.data,
              },
            })),
            {
              type: "text" as const,
              text: "Extract all transactions from these bank statement screenshot(s).",
            },
          ],
        },
      ],
    });

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    const transactions = parseTransactions(text, validCategoryIds);
    if (transactions === null) {
      return NextResponse.json(
        {
          error:
            "Couldn't read transactions from the image. Try a clearer screenshot.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "The Anthropic API key is invalid." },
        { status: 500 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "The AI service is rate limited. Try again shortly." },
        { status: 429 },
      );
    }
    const detail =
      error instanceof Error ? error.message : "AI extraction failed.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
