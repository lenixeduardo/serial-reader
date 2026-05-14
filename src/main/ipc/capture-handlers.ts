import { ipcMain } from "electron";
import { IPC, type CaptureStartData, type ServiceResult } from "../../shared/ipc";
import { getCurrentUser } from "../auth/auth-service";
import { getBatchWithFormula } from "../db/batches-repo";
import { cancelCapture, isCaptureActive, startCapture } from "../serial/capture-service";

export function registerCaptureHandlers(): void {
  ipcMain.handle(
    IPC.captureStart,
    async (_e, batchId: number): Promise<ServiceResult<CaptureStartData>> => {
      if (!getCurrentUser()) return { ok: false, error: "Sessão expirada." };
      const batch = getBatchWithFormula(batchId);
      if (!batch) return { ok: false, error: "Lote não encontrado." };
      if (batch.status !== "open") return { ok: false, error: "Lote já está fechado." };

      const res = await startCapture(batchId);
      if ("error" in res) return { ok: false, error: res.error };
      return { ok: true, data: res };
    }
  );

  ipcMain.handle(IPC.captureCancel, (): ServiceResult<true> => {
    if (!getCurrentUser()) return { ok: false, error: "Sessão expirada." };
    if (!cancelCapture()) return { ok: false, error: "Nenhuma captura ativa." };
    return { ok: true, data: true };
  });

  ipcMain.handle(IPC.captureIsActive, (): boolean => isCaptureActive());
}
