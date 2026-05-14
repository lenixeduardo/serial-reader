import { BrowserWindow } from "electron";
import { ReadlineParser, SerialPort } from "serialport";
import type { Equipment } from "../../shared/types";
import type {
  CaptureEndedEvent,
  CaptureStartData,
  CaptureTickEvent,
  SlotInitState,
  SlotUpdateEvent
} from "../../shared/ipc";
import { getDb } from "../db/connection";
import { listEquipments } from "../db/equipments-repo";
import { getCaptureTimeoutSeconds } from "../db/settings-repo";

interface ActiveSession {
  sessionId: number;
  batchId: number;
  timeoutSeconds: number;
  startedAt: number;
  ports: Map<number, SerialPort>;
  tickInterval: NodeJS.Timeout;
  ended: boolean;
}

let active: ActiveSession | null = null;

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

function openPort(eq: Equipment): Promise<SerialPort> {
  return new Promise((resolve, reject) => {
    const port = new SerialPort(
      {
        path: eq.portPath,
        baudRate: eq.baudRate,
        dataBits: eq.dataBits,
        stopBits: eq.stopBits,
        parity: eq.parity,
        autoOpen: true
      },
      (err) => {
        if (err) reject(err);
        else resolve(port);
      }
    );
  });
}

function compileRegex(src: string | undefined): RegExp | null {
  if (!src) return null;
  try {
    return new RegExp(src);
  } catch {
    return null;
  }
}

function parseValue(line: string, regex: RegExp | null): string | null {
  if (!regex) return null;
  const m = line.match(regex);
  if (!m) return null;
  return m[1] ?? m[0];
}

export async function startCapture(
  batchId: number
): Promise<CaptureStartData | { error: string }> {
  if (active) return { error: "Já existe uma captura em andamento." };

  const timeoutSeconds = getCaptureTimeoutSeconds();
  const equipments = listEquipments().filter((e) => e.enabled);
  if (equipments.length === 0) {
    return { error: "Nenhum equipamento habilitado." };
  }

  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO capture_sessions (batch_id, timeout_seconds) VALUES (?, ?)"
    )
    .run(batchId, timeoutSeconds);
  const sessionId = Number(info.lastInsertRowid);

  const insertReading = db.prepare(
    "INSERT INTO readings (batch_id, equipment_id, value_raw, value_parsed, capture_session_id) VALUES (?, ?, ?, ?, ?)"
  );

  const ports = new Map<number, SerialPort>();
  const slots: SlotInitState[] = [];

  await Promise.all(
    equipments.map(async (eq) => {
      const base: Omit<SlotInitState, "status" | "error"> = {
        equipmentId: eq.id,
        name: eq.name,
        slotIndex: eq.slotIndex,
        portPath: eq.portPath
      };

      if (!eq.portPath) {
        slots.push({ ...base, status: "error", error: "Sem porta configurada" });
        return;
      }

      try {
        const port = await openPort(eq);
        const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));
        const regex = compileRegex(eq.parseRegex);

        parser.on("data", (raw: string | Buffer) => {
          if (!active || active.ended) return;
          const line = String(raw).replace(/\r$/, "").trim();
          if (!line) return;
          const parsed = parseValue(line, regex);
          const capturedAt = new Date().toISOString();
          try {
            insertReading.run(
              batchId,
              eq.id,
              line,
              parsed,
              sessionId
            );
          } catch (e) {
            console.error("[capture] insert reading falhou:", e);
          }
          const evt: SlotUpdateEvent = {
            equipmentId: eq.id,
            status: "receiving",
            valueRaw: line,
            valueParsed: parsed,
            capturedAt
          };
          broadcast("capture:slot-update", evt);
        });

        port.on("error", (err) => {
          if (!active || active.ended) return;
          const evt: SlotUpdateEvent = {
            equipmentId: eq.id,
            status: "error",
            error: err.message
          };
          broadcast("capture:slot-update", evt);
        });

        ports.set(eq.id, port);
        slots.push({ ...base, status: "open" });
      } catch (e: any) {
        slots.push({ ...base, status: "error", error: e?.message ?? "Erro ao abrir porta" });
      }
    })
  );

  slots.sort((a, b) => a.slotIndex - b.slotIndex);

  const startedAt = Date.now();
  const tickInterval = setInterval(() => {
    if (!active) return;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = Math.max(0, timeoutSeconds - elapsed);
    const tick: CaptureTickEvent = { remainingSeconds: remaining };
    broadcast("capture:tick", tick);
    if (remaining <= 0) finishCapture("timeout");
  }, 1000);

  active = { sessionId, batchId, timeoutSeconds, startedAt, ports, tickInterval, ended: false };

  return { sessionId, batchId, timeoutSeconds, slots };
}

function finishCapture(reason: CaptureEndedEvent["reason"]): void {
  if (!active || active.ended) return;
  active.ended = true;
  clearInterval(active.tickInterval);

  for (const port of active.ports.values()) {
    try {
      if (port.isOpen) port.close((err) => err && console.warn("[capture] close port:", err.message));
    } catch (e) {
      console.warn("[capture] close port exception:", e);
    }
  }

  const finalStatus = reason === "cancelled" ? "cancelled" : "completed";
  getDb()
    .prepare(
      "UPDATE capture_sessions SET ended_at = datetime('now'), status = ? WHERE id = ?"
    )
    .run(finalStatus, active.sessionId);

  const evt: CaptureEndedEvent = { sessionId: active.sessionId, reason };
  active = null;
  broadcast("capture:ended", evt);
}

export function cancelCapture(): boolean {
  if (!active) return false;
  finishCapture("cancelled");
  return true;
}

export function isCaptureActive(): boolean {
  return active != null && !active.ended;
}
