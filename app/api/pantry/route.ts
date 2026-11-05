import { auth } from "@clerk/nextjs/server";
import { createPantryItem, deletePantryItem, getPantryImpact, listPantryItems, replacePantryItems, transferPantryItems, updatePantryItem } from "../../../lib/pantry-store";
import type { PantryItem, PantryRemovalOutcome, StorageLocation } from "../../../lib/pantry-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCATIONS = new Set<StorageLocation>(["Fridge", "Freezer", "Pantry"]);

function anonymousKitchenId(request: Request) {
  const value = request.headers.get("x-anonymous-kitchen-id")?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

async function authenticatedUserId() {
  const { userId } = await auth();
  return userId;
}

function clean(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function parseItem(value: unknown, requireId: boolean): PantryItem | Omit<PantryItem, "id"> | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const id = clean(input.id, 100);
  const name = clean(input.name, 80);
  const quantity = Number(input.quantity);
  const unit = clean(input.unit, 30);
  const category = clean(input.category, 50);
  const location = clean(input.location, 20) as StorageLocation;
  const expiresOn = clean(input.expiresOn, 10);
  const emoji = clean(input.emoji, 16);
  if ((requireId && !id) || !name || !Number.isFinite(quantity) || quantity <= 0 || !unit || /\d/.test(unit) || !category || !LOCATIONS.has(location) || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || !emoji) return null;
  const item = { name, quantity, unit, category, location, expiresOn, emoji };
  return requireId ? { ...item, id } : item;
}

async function readJson(request: Request) {
  try { return await request.json() as unknown; } catch { return null; }
}

export async function GET(request: Request) {
  const owner = await authenticatedUserId();
  if (!owner) return Response.json({ error: "Sign in to access your pantry." }, { status: 401 });
  const anonymousOwner = anonymousKitchenId(request);
  const migratedAnonymousPantry = Boolean(anonymousOwner && anonymousOwner !== owner);
  if (anonymousOwner && anonymousOwner !== owner) await transferPantryItems(anonymousOwner, owner);
  const [items, impact] = await Promise.all([listPantryItems(owner), getPantryImpact(owner)]);
  return Response.json({ items, impact, migratedAnonymousPantry });
}

export async function POST(request: Request) {
  const owner = await authenticatedUserId();
  if (!owner) return Response.json({ error: "Sign in to access your pantry." }, { status: 401 });
  const body = await readJson(request);
  if (body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).items)) {
    const items = (body as { items: unknown[] }).items.map((item) => parseItem(item, true)).filter((item): item is PantryItem => Boolean(item));
    if (!items.length || items.length > 250) return Response.json({ error: "The pantry import is invalid." }, { status: 400 });
    return Response.json({ items: await replacePantryItems(owner, items) });
  }
  const item = parseItem(body, false);
  if (!item) return Response.json({ error: "Enter valid pantry item details." }, { status: 400 });
  return Response.json({ item: await createPantryItem(owner, item) }, { status: 201 });
}

export async function PUT(request: Request) {
  const owner = await authenticatedUserId();
  if (!owner) return Response.json({ error: "Sign in to access your pantry." }, { status: 401 });
  const item = parseItem(await readJson(request), true);
  if (!item || !("id" in item)) return Response.json({ error: "Enter valid pantry item details." }, { status: 400 });
  const updated = await updatePantryItem(owner, item);
  return updated ? Response.json({ item: updated }) : Response.json({ error: "Pantry item not found." }, { status: 404 });
}

export async function DELETE(request: Request) {
  const owner = await authenticatedUserId();
  const searchParams = new URL(request.url).searchParams;
  const id = searchParams.get("id")?.trim() ?? "";
  const outcome = searchParams.get("outcome")?.trim() as PantryRemovalOutcome;
  if (!owner) return Response.json({ error: "Sign in to access your pantry." }, { status: 401 });
  if (!id) return Response.json({ error: "A valid item ID is required." }, { status: 400 });
  if (outcome !== "used" && outcome !== "tossed") return Response.json({ error: "Choose whether the item was used or tossed." }, { status: 400 });
  return await deletePantryItem(owner, id, outcome)
    ? Response.json({ deleted: true, impact: await getPantryImpact(owner) })
    : Response.json({ error: "Pantry item not found." }, { status: 404 });
}
