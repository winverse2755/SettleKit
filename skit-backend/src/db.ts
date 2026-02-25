/**
 * SQLite database module for settlement storage
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import type {
  Settlement,
  SettlementIntent,
  SettlementRow,
  SettlementStatus,
  RiskReport,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "settlements.db");

let db: Database.Database;

export function initDatabase(): Database.Database {
  db = new Database(DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      intent TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      risk_report TEXT,
      tx_hash TEXT,
      explorer_url TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    
    CREATE INDEX IF NOT EXISTS idx_status ON settlements(status);
    CREATE INDEX IF NOT EXISTS idx_created_at ON settlements(created_at);
  `);

  console.log("[DB] Database initialized at", DB_PATH);
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function createSettlement(id: string, intent: SettlementIntent): Settlement {
  const db = getDatabase();
  const now = Date.now();
  
  const stmt = db.prepare(`
    INSERT INTO settlements (id, intent, status, created_at, updated_at)
    VALUES (?, ?, 'PENDING', ?, ?)
  `);
  
  stmt.run(id, JSON.stringify(intent), now, now);
  
  return {
    id,
    intent,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };
}

export function getSettlement(id: string): Settlement | null {
  const db = getDatabase();
  
  const stmt = db.prepare(`SELECT * FROM settlements WHERE id = ?`);
  const row = stmt.get(id) as SettlementRow | undefined;
  
  if (!row) {
    return null;
  }
  
  return rowToSettlement(row);
}

export function getSettlementByRecipeId(recipeId: string): Settlement | null {
  const db = getDatabase();
  
  // recipeId format: "risk-{timestamp}" or "settlement-{id}"
  // Try to find by checking if the recipeId contains a settlement id
  // or by matching the full recipeId in the risk_report JSON
  
  const stmt = db.prepare(`
    SELECT * FROM settlements 
    WHERE id = ? 
    OR risk_report LIKE ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  
  const row = stmt.get(recipeId, `%"recipeId":"${recipeId}"%`) as SettlementRow | undefined;
  
  if (!row) {
    // Try to find the most recent pending settlement
    const pendingStmt = db.prepare(`
      SELECT * FROM settlements 
      WHERE status = 'PENDING' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const pendingRow = pendingStmt.get() as SettlementRow | undefined;
    return pendingRow ? rowToSettlement(pendingRow) : null;
  }
  
  return rowToSettlement(row);
}

export function updateSettlementStatus(
  id: string,
  status: SettlementStatus,
  riskReport?: RiskReport,
  txHash?: string,
  explorerUrl?: string
): Settlement | null {
  const db = getDatabase();
  const now = Date.now();
  
  const stmt = db.prepare(`
    UPDATE settlements 
    SET status = ?, 
        risk_report = COALESCE(?, risk_report),
        tx_hash = COALESCE(?, tx_hash),
        explorer_url = COALESCE(?, explorer_url),
        updated_at = ?
    WHERE id = ?
  `);
  
  stmt.run(
    status,
    riskReport ? JSON.stringify(riskReport) : null,
    txHash ?? null,
    explorerUrl ?? null,
    now,
    id
  );
  
  return getSettlement(id);
}

export function getAllSettlements(limit: number = 100): Settlement[] {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM settlements 
    ORDER BY created_at DESC 
    LIMIT ?
  `);
  
  const rows = stmt.all(limit) as SettlementRow[];
  return rows.map(rowToSettlement);
}

function rowToSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    intent: JSON.parse(row.intent) as SettlementIntent,
    status: row.status as SettlementStatus,
    riskReport: row.risk_report ? JSON.parse(row.risk_report) as RiskReport : undefined,
    txHash: row.tx_hash ?? undefined,
    explorerUrl: row.explorer_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    console.log("[DB] Database closed");
  }
}
