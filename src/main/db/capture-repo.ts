import { getDb } from "./connection";
import type { CaptureSession, Reading } from "../../shared/types";

interface SessionRow {
  id: number;
  batch_id: number;
  started_at: string;
  ended_at: string | null;
  timeout_seconds: number;
  status: string;
}

function rowToSession(r: SessionRow): CaptureSession {
  return {
    id: r.id,
    batchId: r.batch_id,
    startedAt: r.started_at,
    endedAt: r.ended_at ?? undefined,
    timeoutSeconds: r.timeout_seconds,
    status: r.status as CaptureSession["status"]
  };
}

export function createCaptureSession(batchId: number, timeoutSeconds: number): CaptureSession {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO capture_sessions (batch_id, timeout_seconds) VALUES (?, ?) RETURNING *"
    )
    .get(batchId, timeoutSeconds) as SessionRow;
  return rowToSession(result);
}

export function completeCaptureSession(id: number): void {
  getDb()
    .prepare(
      "UPDATE capture_sessions SET status = 'completed', ended_at = datetime('now') WHERE id = ?"
    )
    .run(id);
}

export function cancelCaptureSession(id: number): void {
  getDb()
    .prepare(
      "UPDATE capture_sessions SET status = 'cancelled', ended_at = datetime('now') WHERE id = ?"
    )
    .run(id);
}

export interface InsertReadingParams {
  batchId: number;
  equipmentId: number;
  valueRaw: string;
  valueParsed: string | null;
  captureSessionId: number;
}

export function insertReading(params: InsertReadingParams): Reading {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO readings
        (batch_id, equipment_id, value_raw, value_parsed, capture_session_id)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    )
    .get(
      params.batchId,
      params.equipmentId,
      params.valueRaw,
      params.valueParsed,
      params.captureSessionId
    ) as {
      id: number;
      batch_id: number;
      equipment_id: number;
      value_raw: string;
      value_parsed: string | null;
      captured_at: string;
      capture_session_id: number;
    };
  return {
    id: result.id,
    batchId: result.batch_id,
    equipmentId: result.equipment_id,
    valueRaw: result.value_raw,
    valueParsed: result.value_parsed ?? undefined,
    capturedAt: result.captured_at,
    captureSessionId: result.capture_session_id
  };
}
