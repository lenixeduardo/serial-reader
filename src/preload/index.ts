import { contextBridge, ipcRenderer } from "electron";
import {
  IPC,
  type BatchInput,
  type BatchWithFormula,
  type FormulaInput,
  type LoginRequest,
  type LoginResult,
  type SerialReaderApi,
  type ServiceResult
} from "../shared/ipc";
import type { Formula, User } from "../shared/types";

const api: SerialReaderApi = {
  auth: {
    login: (req: LoginRequest): Promise<LoginResult> => ipcRenderer.invoke(IPC.authLogin, req),
    logout: (): Promise<void> => ipcRenderer.invoke(IPC.authLogout),
    currentUser: (): Promise<User | null> => ipcRenderer.invoke(IPC.authCurrentUser)
  },
  formulas: {
    list: (): Promise<Formula[]> => ipcRenderer.invoke(IPC.formulasList),
    create: (input: FormulaInput): Promise<ServiceResult<Formula>> =>
      ipcRenderer.invoke(IPC.formulasCreate, input),
    update: (id: number, input: FormulaInput): Promise<ServiceResult<Formula>> =>
      ipcRenderer.invoke(IPC.formulasUpdate, id, input),
    remove: (id: number): Promise<ServiceResult<true>> =>
      ipcRenderer.invoke(IPC.formulasDelete, id)
  },
  batches: {
    listOpen: (): Promise<BatchWithFormula[]> => ipcRenderer.invoke(IPC.batchesListOpen),
    create: (input: BatchInput): Promise<ServiceResult<BatchWithFormula>> =>
      ipcRenderer.invoke(IPC.batchesCreate, input),
    close: (id: number): Promise<ServiceResult<true>> =>
      ipcRenderer.invoke(IPC.batchesClose, id)
  }
};

contextBridge.exposeInMainWorld("api", api);
