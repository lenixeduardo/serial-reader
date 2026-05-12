import { getDb } from "../db/connection";
import type { Formula } from "../../shared/types";

interface FormulaRow {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
}

function rowToFormula(row: FormulaRow): Formula {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export function listFormulas(): Formula[] {
  const rows = getDb()
    .prepare("SELECT * FROM formulas ORDER BY name COLLATE NOCASE")
    .all() as FormulaRow[];
  return rows.map(rowToFormula);
}

export function getFormula(id: number): Formula | null {
  const row = getDb()
    .prepare("SELECT * FROM formulas WHERE id = ?")
    .get(id) as FormulaRow | undefined;
  return row ? rowToFormula(row) : null;
}

export function createFormula(
  name: string,
  description: string | undefined,
  createdBy: number
): Formula {
  const info = getDb()
    .prepare("INSERT INTO formulas (name, description, created_by) VALUES (?, ?, ?)")
    .run(name, description ?? null, createdBy);
  return getFormula(Number(info.lastInsertRowid))!;
}

export function updateFormula(
  id: number,
  name: string,
  description: string | undefined
): Formula | null {
  getDb()
    .prepare("UPDATE formulas SET name = ?, description = ? WHERE id = ?")
    .run(name, description ?? null, id);
  return getFormula(id);
}

export function deleteFormula(id: number): void {
  getDb().prepare("DELETE FROM formulas WHERE id = ?").run(id);
}

export function countBatchesForFormula(id: number): number {
  const r = getDb()
    .prepare("SELECT COUNT(*) AS c FROM batches WHERE formula_id = ?")
    .get(id) as { c: number };
  return r.c;
}
