import { ipcMain } from "electron";
import { IPC, type FormulaInput, type ServiceResult } from "../../shared/ipc";
import type { Formula } from "../../shared/types";
import { getCurrentUser } from "../auth/auth-service";
import {
  countBatchesForFormula,
  createFormula,
  deleteFormula,
  getFormula,
  listFormulas,
  updateFormula
} from "../db/formulas-repo";

function requireAuth(): number | null {
  const u = getCurrentUser();
  return u ? u.id : null;
}

function validateName(name: string): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Informe um nome para a fórmula.";
  if (trimmed.length > 120) return "Nome muito longo (máx. 120 caracteres).";
  return null;
}

export function registerFormulasHandlers(): void {
  ipcMain.handle(IPC.formulasList, (): Formula[] => listFormulas());

  ipcMain.handle(IPC.formulasCreate, (_e, input: FormulaInput): ServiceResult<Formula> => {
    const userId = requireAuth();
    if (!userId) return { ok: false, error: "Sessão expirada." };
    const err = validateName(input.name);
    if (err) return { ok: false, error: err };
    try {
      const formula = createFormula(input.name.trim(), input.description?.trim() || undefined, userId);
      return { ok: true, data: formula };
    } catch (e: any) {
      if (String(e?.message).includes("UNIQUE")) {
        return { ok: false, error: "Já existe uma fórmula com esse nome." };
      }
      return { ok: false, error: "Erro ao criar fórmula." };
    }
  });

  ipcMain.handle(
    IPC.formulasUpdate,
    (_e, id: number, input: FormulaInput): ServiceResult<Formula> => {
      if (!requireAuth()) return { ok: false, error: "Sessão expirada." };
      if (!getFormula(id)) return { ok: false, error: "Fórmula não encontrada." };
      const err = validateName(input.name);
      if (err) return { ok: false, error: err };
      try {
        const formula = updateFormula(id, input.name.trim(), input.description?.trim() || undefined);
        return { ok: true, data: formula! };
      } catch (e: any) {
        if (String(e?.message).includes("UNIQUE")) {
          return { ok: false, error: "Já existe uma fórmula com esse nome." };
        }
        return { ok: false, error: "Erro ao atualizar fórmula." };
      }
    }
  );

  ipcMain.handle(IPC.formulasDelete, (_e, id: number): ServiceResult<true> => {
    if (!requireAuth()) return { ok: false, error: "Sessão expirada." };
    if (countBatchesForFormula(id) > 0) {
      return { ok: false, error: "Fórmula possui lotes vinculados e não pode ser excluída." };
    }
    deleteFormula(id);
    return { ok: true, data: true };
  });
}
