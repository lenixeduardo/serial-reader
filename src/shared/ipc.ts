import type { Batch, Equipment, Formula, User } from "./types";

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
  batchesClose: "batches:close",
  settingsGetAll: "settings:get-all",
  settingsSet: "settings:set",
  equipmentsList: "equipments:list",
  equipmentsUpdate: "equipments:update",
  usersList: "users:list",
  usersCreate: "users:create",
  usersChangePassword: "users:change-password",
  usersDelete: "users:delete",
  serialListPorts: "serial:list-ports",
  captureStart: "capture:start",
  captureCancel: "capture:cancel",
  captureIsActive: "capture:is-active",
  captureTickEvent: "capture:tick",
  captureSlotUpdateEvent: "capture:slot-update",
  captureEndedEvent: "capture:ended"
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

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  productId?: string;
  vendorId?: string;
}

export interface UserCreateInput {
  username: string;
  password: string;
}

export interface EquipmentUpdateInput {
  name?: string;
  portPath?: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  enabled?: boolean;
  parseRegex?: string;
}

export type AppSettings = Record<string, string>;

export type SlotStatus = "open" | "receiving" | "error";

export interface SlotInitState {
  equipmentId: number;
  name: string;
  slotIndex: number;
  portPath: string;
  status: SlotStatus;
  error?: string;
}

export interface CaptureStartData {
  sessionId: number;
  batchId: number;
  timeoutSeconds: number;
  slots: SlotInitState[];
}

export interface CaptureTickEvent {
  remainingSeconds: number;
}

export interface SlotUpdateEvent {
  equipmentId: number;
  status: SlotStatus;
  valueRaw?: string;
  valueParsed?: string | null;
  capturedAt?: string;
  error?: string;
}

export interface CaptureEndedEvent {
  sessionId: number;
  reason: "timeout" | "cancelled" | "completed";
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type Unsubscribe = () => void;

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
  settings: {
    getAll(): Promise<AppSettings>;
    set(key: string, value: string): Promise<ServiceResult<true>>;
  };
  equipments: {
    list(): Promise<Equipment[]>;
    update(id: number, patch: EquipmentUpdateInput): Promise<ServiceResult<Equipment>>;
  };
  users: {
    list(): Promise<User[]>;
    create(input: UserCreateInput): Promise<ServiceResult<User>>;
    changePassword(id: number, newPassword: string): Promise<ServiceResult<true>>;
    remove(id: number): Promise<ServiceResult<true>>;
  };
  serial: {
    listPorts(): Promise<SerialPortInfo[]>;
  };
  capture: {
    start(batchId: number): Promise<ServiceResult<CaptureStartData>>;
    cancel(): Promise<ServiceResult<true>>;
    isActive(): Promise<boolean>;
    onTick(cb: (e: CaptureTickEvent) => void): Unsubscribe;
    onSlotUpdate(cb: (e: SlotUpdateEvent) => void): Unsubscribe;
    onEnded(cb: (e: CaptureEndedEvent) => void): Unsubscribe;
  };
}

declare global {
  interface Window {
    api: SerialReaderApi;
  }
}
