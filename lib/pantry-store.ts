import "server-only";

import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import type { PantryItem, StorageLocation } from "./pantry-types";

type PantryRow = {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  category: string;
  location: StorageLocation;
  expires_on: string | Date;
  emoji: string;
};

const databaseUrl = process.env.DATABASE_URL?.trim();
const postgres = databaseUrl ? neon(databaseUrl) : null;
let postgresSetup: Promise<void> | null = null;
let localDatabase: Database.Database | null = null;

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function starterItems(): PantryItem[] {
  return [
    { id: "starter-spinach", name: "Baby spinach", quantity: 1, unit: "bag", category: "Produce", location: "Fridge", expiresOn: dateFromToday(1), emoji: "🥬" },
    { id: "starter-yogurt", name: "Greek yogurt", quantity: 2, unit: "cups", category: "Dairy", location: "Fridge", expiresOn: dateFromToday(3), emoji: "🥣" },
    { id: "starter-chicken", name: "Chicken breast", quantity: 2, unit: "pieces", category: "Protein", location: "Freezer", expiresOn: dateFromToday(7), emoji: "🍗" },
    { id: "starter-tomatoes", name: "Cherry tomatoes", quantity: 1, unit: "box", category: "Produce", location: "Fridge", expiresOn: dateFromToday(4), emoji: "🍅" },
    { id: "starter-rice", name: "Basmati rice", quantity: 2, unit: "lb", category: "Grains", location: "Pantry", expiresOn: dateFromToday(45), emoji: "🍚" },
    { id: "starter-bread", name: "Sourdough bread", quantity: 0.5, unit: "loaf", category: "Bakery", location: "Pantry", expiresOn: dateFromToday(2), emoji: "🍞" },
  ];
}

function mapRow(row: PantryRow): PantryItem {
  const expiresOn = row.expires_on instanceof Date ? row.expires_on.toISOString().slice(0, 10) : String(row.expires_on).slice(0, 10);
  return { id: row.id, name: row.name, quantity: Number(row.quantity), unit: row.unit, category: row.category, location: row.location, expiresOn, emoji: row.emoji };
}

async function ensurePostgres() {
  if (!postgres) return;
  postgresSetup ??= (async () => {
    await postgres`
      CREATE TABLE IF NOT EXISTS pantry_items (
        kitchen_id TEXT NOT NULL,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        expires_on DATE NOT NULL,
        emoji TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (kitchen_id, id)
      )
    `;
    await postgres`CREATE INDEX IF NOT EXISTS pantry_items_kitchen_expiry_idx ON pantry_items (kitchen_id, expires_on)`;
  })();
  await postgresSetup;
}

function getLocalDatabase() {
  if (localDatabase) return localDatabase;
  const dataDirectory = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDirectory, { recursive: true });
  localDatabase = new Database(path.join(dataDirectory, "pantry.db"));
  localDatabase.pragma("journal_mode = WAL");
  localDatabase.exec(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      kitchen_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      expires_on TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (kitchen_id, id)
    );
    CREATE INDEX IF NOT EXISTS pantry_items_kitchen_expiry_idx ON pantry_items (kitchen_id, expires_on);
  `);
  return localDatabase;
}

async function insertItem(kitchenId: string, item: PantryItem, ignoreConflict = false) {
  if (postgres) {
    await ensurePostgres();
    if (ignoreConflict) {
      await postgres`INSERT INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji) VALUES (${kitchenId}, ${item.id}, ${item.name}, ${item.quantity}, ${item.unit}, ${item.category}, ${item.location}, ${item.expiresOn}, ${item.emoji}) ON CONFLICT (kitchen_id, id) DO NOTHING`;
    } else {
      await postgres`INSERT INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji) VALUES (${kitchenId}, ${item.id}, ${item.name}, ${item.quantity}, ${item.unit}, ${item.category}, ${item.location}, ${item.expiresOn}, ${item.emoji})`;
    }
    return;
  }
  const database = getLocalDatabase();
  const command = ignoreConflict ? "INSERT OR IGNORE" : "INSERT";
  database.prepare(`${command} INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(kitchenId, item.id, item.name, item.quantity, item.unit, item.category, item.location, item.expiresOn, item.emoji);
}

export async function listPantryItems(kitchenId: string) {
  if (postgres) {
    await ensurePostgres();
    let rows = await postgres`SELECT id, name, quantity, unit, category, location, expires_on, emoji FROM pantry_items WHERE kitchen_id = ${kitchenId} ORDER BY expires_on, created_at` as PantryRow[];
    if (!rows.length) {
      await Promise.all(starterItems().map((item) => insertItem(kitchenId, item, true)));
      rows = await postgres`SELECT id, name, quantity, unit, category, location, expires_on, emoji FROM pantry_items WHERE kitchen_id = ${kitchenId} ORDER BY expires_on, created_at` as PantryRow[];
    }
    return rows.map(mapRow);
  }
  const database = getLocalDatabase();
  let rows = database.prepare("SELECT id, name, quantity, unit, category, location, expires_on, emoji FROM pantry_items WHERE kitchen_id = ? ORDER BY expires_on, created_at").all(kitchenId) as PantryRow[];
  if (!rows.length) {
    const seed = database.transaction(() => starterItems().forEach((item) => {
      database.prepare("INSERT OR IGNORE INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(kitchenId, item.id, item.name, item.quantity, item.unit, item.category, item.location, item.expiresOn, item.emoji);
    }));
    seed();
    rows = database.prepare("SELECT id, name, quantity, unit, category, location, expires_on, emoji FROM pantry_items WHERE kitchen_id = ? ORDER BY expires_on, created_at").all(kitchenId) as PantryRow[];
  }
  return rows.map(mapRow);
}

export async function createPantryItem(kitchenId: string, item: Omit<PantryItem, "id">) {
  const created = { ...item, id: crypto.randomUUID() };
  await insertItem(kitchenId, created);
  return created;
}

export async function updatePantryItem(kitchenId: string, item: PantryItem) {
  if (postgres) {
    await ensurePostgres();
    const rows = await postgres`UPDATE pantry_items SET name = ${item.name}, quantity = ${item.quantity}, unit = ${item.unit}, category = ${item.category}, location = ${item.location}, expires_on = ${item.expiresOn}, emoji = ${item.emoji}, updated_at = NOW() WHERE kitchen_id = ${kitchenId} AND id = ${item.id} RETURNING id, name, quantity, unit, category, location, expires_on, emoji` as PantryRow[];
    return rows[0] ? mapRow(rows[0]) : null;
  }
  const result = getLocalDatabase().prepare("UPDATE pantry_items SET name = ?, quantity = ?, unit = ?, category = ?, location = ?, expires_on = ?, emoji = ?, updated_at = CURRENT_TIMESTAMP WHERE kitchen_id = ? AND id = ?")
    .run(item.name, item.quantity, item.unit, item.category, item.location, item.expiresOn, item.emoji, kitchenId, item.id);
  return result.changes ? item : null;
}

export async function deletePantryItem(kitchenId: string, id: string) {
  if (postgres) {
    await ensurePostgres();
    const rows = await postgres`DELETE FROM pantry_items WHERE kitchen_id = ${kitchenId} AND id = ${id} RETURNING id` as { id: string }[];
    return rows.length > 0;
  }
  return getLocalDatabase().prepare("DELETE FROM pantry_items WHERE kitchen_id = ? AND id = ?").run(kitchenId, id).changes > 0;
}

export async function replacePantryItems(kitchenId: string, items: PantryItem[]) {
  if (postgres) {
    await ensurePostgres();
    await postgres`DELETE FROM pantry_items WHERE kitchen_id = ${kitchenId}`;
    await Promise.all(items.map((item) => insertItem(kitchenId, item, true)));
    return listPantryItems(kitchenId);
  }
  const database = getLocalDatabase();
  const replace = database.transaction(() => {
    database.prepare("DELETE FROM pantry_items WHERE kitchen_id = ?").run(kitchenId);
    const insert = database.prepare("INSERT INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    items.forEach((item) => insert.run(kitchenId, item.id, item.name, item.quantity, item.unit, item.category, item.location, item.expiresOn, item.emoji));
  });
  replace();
  return listPantryItems(kitchenId);
}
