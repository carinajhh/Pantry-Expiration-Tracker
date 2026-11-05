import "server-only";

import Database from "better-sqlite3";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import type { PantryImpact, PantryItem, PantryRemovalOutcome, StorageLocation } from "./pantry-types";

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
const MONTHLY_SAVED_GOAL = 15;
const postgres = databaseUrl ? neon(databaseUrl) : null;
let postgresSetup: Promise<void> | null = null;
let localDatabase: Database.Database | null = null;

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
    await postgres`
      CREATE TABLE IF NOT EXISTS pantry_activity (
        kitchen_id TEXT NOT NULL,
        id TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('used', 'tossed')),
        item_name TEXT NOT NULL,
        item_quantity DOUBLE PRECISION NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (kitchen_id, id)
      )
    `;
    await postgres`CREATE INDEX IF NOT EXISTS pantry_activity_kitchen_date_idx ON pantry_activity (kitchen_id, occurred_at)`;
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
    CREATE TABLE IF NOT EXISTS pantry_activity (
      kitchen_id TEXT NOT NULL,
      id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('used', 'tossed')),
      item_name TEXT NOT NULL,
      item_quantity REAL NOT NULL,
      occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (kitchen_id, id)
    );
    CREATE INDEX IF NOT EXISTS pantry_activity_kitchen_date_idx ON pantry_activity (kitchen_id, occurred_at);
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
    const rows = await postgres`SELECT id, name, quantity, unit, category, location, expires_on, emoji FROM pantry_items WHERE kitchen_id = ${kitchenId} ORDER BY expires_on, created_at` as PantryRow[];
    return rows.map(mapRow);
  }
  const database = getLocalDatabase();
  const rows = database.prepare("SELECT id, name, quantity, unit, category, location, expires_on, emoji FROM pantry_items WHERE kitchen_id = ? ORDER BY expires_on, created_at").all(kitchenId) as PantryRow[];
  return rows.map(mapRow);
}

export async function getPantryImpact(kitchenId: string): Promise<PantryImpact> {
  if (postgres) {
    await ensurePostgres();
    const rows = await postgres`
      SELECT
        COUNT(*) FILTER (WHERE action = 'used')::INTEGER AS used_this_month,
        COUNT(*) FILTER (WHERE action = 'tossed')::INTEGER AS tossed_this_month
      FROM pantry_activity
      WHERE kitchen_id = ${kitchenId}
        AND occurred_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
    ` as { used_this_month: number; tossed_this_month: number }[];
    return {
      usedThisMonth: Number(rows[0]?.used_this_month ?? 0),
      tossedThisMonth: Number(rows[0]?.tossed_this_month ?? 0),
      monthlyGoal: MONTHLY_SAVED_GOAL,
    };
  }
  const now = new Date();
  const monthPrefix = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const row = getLocalDatabase().prepare(`
    SELECT
      SUM(CASE WHEN action = 'used' THEN 1 ELSE 0 END) AS used_this_month,
      SUM(CASE WHEN action = 'tossed' THEN 1 ELSE 0 END) AS tossed_this_month
    FROM pantry_activity
    WHERE kitchen_id = ? AND SUBSTR(occurred_at, 1, 7) = ?
  `).get(kitchenId, monthPrefix) as { used_this_month: number | null; tossed_this_month: number | null };
  return {
    usedThisMonth: Number(row.used_this_month ?? 0),
    tossedThisMonth: Number(row.tossed_this_month ?? 0),
    monthlyGoal: MONTHLY_SAVED_GOAL,
  };
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

export async function deletePantryItem(kitchenId: string, id: string, outcome: PantryRemovalOutcome) {
  if (postgres) {
    await ensurePostgres();
    const activityId = crypto.randomUUID();
    const rows = await postgres`
      WITH deleted AS (
        DELETE FROM pantry_items
        WHERE kitchen_id = ${kitchenId} AND id = ${id}
        RETURNING name, quantity
      )
      INSERT INTO pantry_activity (kitchen_id, id, action, item_name, item_quantity)
      SELECT ${kitchenId}, ${activityId}, ${outcome}, name, quantity FROM deleted
      RETURNING id
    ` as { id: string }[];
    return rows.length > 0;
  }
  const database = getLocalDatabase();
  return database.transaction(() => {
    const item = database.prepare("SELECT name, quantity FROM pantry_items WHERE kitchen_id = ? AND id = ?").get(kitchenId, id) as { name: string; quantity: number } | undefined;
    if (!item) return false;
    database.prepare("DELETE FROM pantry_items WHERE kitchen_id = ? AND id = ?").run(kitchenId, id);
    database.prepare("INSERT INTO pantry_activity (kitchen_id, id, action, item_name, item_quantity) VALUES (?, ?, ?, ?, ?)")
      .run(kitchenId, crypto.randomUUID(), outcome, item.name, item.quantity);
    return true;
  })();
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

export async function transferPantryItems(fromKitchenId: string, toUserId: string) {
  if (fromKitchenId === toUserId) return;
  if (postgres) {
    await ensurePostgres();
    await postgres`
      INSERT INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji, created_at, updated_at)
      SELECT ${toUserId}, id, name, quantity, unit, category, location, expires_on, emoji, created_at, updated_at
      FROM pantry_items
      WHERE kitchen_id = ${fromKitchenId}
      ON CONFLICT (kitchen_id, id) DO NOTHING
    `;
    await postgres`DELETE FROM pantry_items WHERE kitchen_id = ${fromKitchenId}`;
    await postgres`
      INSERT INTO pantry_activity (kitchen_id, id, action, item_name, item_quantity, occurred_at)
      SELECT ${toUserId}, id, action, item_name, item_quantity, occurred_at
      FROM pantry_activity
      WHERE kitchen_id = ${fromKitchenId}
      ON CONFLICT (kitchen_id, id) DO NOTHING
    `;
    await postgres`DELETE FROM pantry_activity WHERE kitchen_id = ${fromKitchenId}`;
    return;
  }
  const database = getLocalDatabase();
  const transfer = database.transaction(() => {
    database.prepare(`
      INSERT OR IGNORE INTO pantry_items (kitchen_id, id, name, quantity, unit, category, location, expires_on, emoji, created_at, updated_at)
      SELECT ?, id, name, quantity, unit, category, location, expires_on, emoji, created_at, updated_at
      FROM pantry_items
      WHERE kitchen_id = ?
    `).run(toUserId, fromKitchenId);
    database.prepare("DELETE FROM pantry_items WHERE kitchen_id = ?").run(fromKitchenId);
    database.prepare(`
      INSERT OR IGNORE INTO pantry_activity (kitchen_id, id, action, item_name, item_quantity, occurred_at)
      SELECT ?, id, action, item_name, item_quantity, occurred_at
      FROM pantry_activity
      WHERE kitchen_id = ?
    `).run(toUserId, fromKitchenId);
    database.prepare("DELETE FROM pantry_activity WHERE kitchen_id = ?").run(fromKitchenId);
  });
  transfer();
}
