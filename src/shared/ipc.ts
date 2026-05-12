import type { Batch, Formula, User } from "./types";

export const IPC = {
  authLogin: "auth:login",
  authLogout: "auth:logout",
  authCurrentUser: "auth:current-user",
  formulasList: "formulas:list",
  formulasCreate: "formulas:create",
  formulasUpdate: "formulas:update",
  formulasDelete: "formulas:delete",
  batchesListOpen: "batches:list-open",
  batchesCreate: "batches:create",
  batchesClose: "batches:close"
} as const;

export interface LoginRequest {
  username: string;
  password: string;
}

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export interface FormulaInput {
  name: string;
  description?: string;
}

export interface BatchInput {
  formulaId: number;
  code?: string;
}

export interface BatchWithFormula extends Batch {
  formulaName: string;
  operatorName: string;
  readingsCount: number;
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SerialReaderApi {
  auth: {
    login(req: LoginRequest): Promise<LoginResult>;
    logout(): Promise<void>;
    currentUser(): Promise<User | null>;
  };
  formulas: {
    list(): Promise<Formula[]>;
    create(input: FormulaInput): Promise<ServiceResult<Formula>>;
    update(id: number, input: FormulaInput): Promise<ServiceResult<Formula>>;
    remove(id: number): Promise<ServiceResult<true>>;
  };
  batches: {
    listOpen(): Promise<BatchWithFormula[]>;
    create(input: BatchInput): Promise<ServiceResult<BatchWithFormula>>;
    close(id: number): Promise<ServiceResult<true>>;
  };
}

declare global {
  interface Window {
    api: SerialReaderApi;
  }
}
