import { getDb, persistDb } from "./connection";

type BindParams = (string | number | null | boolean)[];

function toBindArray(params: BindParams): (string | number | null)[] {
  return params.map((v) => (typeof v === "boolean" ? (v ? 1 : 0) : v));
}

export function run(sql: string, ...params: BindParams): void {
  getDb().run(sql, toBindArray(params));
  persistDb();
}

export function get<T = Record<string, unknown>>(
  sql: string,
  ...params: BindParams
): T | undefined {
  const stmt = getDb().prepare(sql);
  stmt.bind(toBindArray(params));
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject() as T;
  stmt.free();
  return row;
}

export function all<T = Record<string, unknown>>(sql: string, ...params: BindParams): T[] {
  const stmt = getDb().prepare(sql);
  stmt.bind(toBindArray(params));
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

export function lastInsertRowid(): number {
  const row = get<{ id: number }>("SELECT last_insert_rowid() AS id");
  return row?.id ?? 0;
}

export function exec(sql: string): void {
  getDb().run(sql);
  persistDb();
}
