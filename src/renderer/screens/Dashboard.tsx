import React, { useEffect, useState } from "react";
import type { Formula } from "../../shared/types";
import type { BatchWithFormula } from "../../shared/ipc";
import { Modal } from "../components/Modal";

export function Dashboard() {
  const [batches, setBatches] = useState<BatchWithFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const list = await window.api.batches.listOpen();
    setBatches(list);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleClose(b: BatchWithFormula) {
    if (!confirm(`Finalizar o lote ${b.code}?`)) return;
    const res = await window.api.batches.close(b.id);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    reload();
  }

  return (
    <>
      <div className="page-actions">
        {error && <div className="alert">{error}</div>}
        <button onClick={() => setShowNewBatch(true)}>+ Novo Lote</button>
      </div>

      {loading ? (
        <div className="muted">Carregando...</div>
      ) : batches.length === 0 ? (
        <div className="placeholder">
          Nenhum lote aberto. Clique em <strong>+ Novo Lote</strong> para começar.
        </div>
      ) : (
        <div className="batch-grid">
          {batches.map((b) => (
            <BatchCard key={b.id} batch={b} onClose={() => handleClose(b)} />
          ))}
        </div>
      )}

      {showNewBatch && (
        <NewBatchModal
          onClose={() => setShowNewBatch(false)}
          onCreated={() => {
            setShowNewBatch(false);
            setError(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function BatchCard({ batch, onClose }: { batch: BatchWithFormula; onClose: () => void }) {
  return (
    <div className="batch-card">
      <div className="batch-card-head">
        <div>
          <div className="batch-code">Lote #{batch.code}</div>
          <div className="batch-recipe">{batch.formulaName}</div>
        </div>
        <span className="chip chip-green">ABERTO</span>
      </div>
      <div className="batch-meta">
        <div><span>Aberto em</span><strong>{formatDate(batch.openedAt)}</strong></div>
        <div><span>Leituras</span><strong>{batch.readingsCount}</strong></div>
        <div><span>Operador</span><strong>{batch.operatorName}</strong></div>
      </div>
      <div className="batch-actions">
        <button onClick={() => alert("Captura serial será implementada na Fase 4.")}>
          ▶ Iniciar Leitura
        </button>
        <button className="secondary" onClick={onClose}>Finalizar Lote</button>
      </div>
    </div>
  );
}

interface NewBatchProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewBatchModal({ onClose, onCreated }: NewBatchProps) {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [formulaId, setFormulaId] = useState<number | "">("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.api.formulas.list().then(setFormulas);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formulaId) {
      setError("Selecione uma fórmula.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await window.api.batches.create({
      formulaId: Number(formulaId),
      code: code.trim() || undefined
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onCreated();
  }

  return (
    <Modal
      title="Novo Lote"
      onClose={onClose}
      footer={
        <>
          <button className="secondary" onClick={onClose}>Cancelar</button>
          <button onClick={submit} disabled={saving}>
            {saving ? "Criando..." : "Criar Lote"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Fórmula</label>
          {formulas.length === 0 ? (
            <div className="muted">Cadastre uma fórmula antes de criar um lote.</div>
          ) : (
            <select
              value={formulaId}
              onChange={(e) => setFormulaId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione...</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="field">
          <label>Código do lote (opcional — gerado automaticamente)</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex.: 2026-0042" />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" style={{ display: "none" }} />
      </form>
    </Modal>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleString("pt-BR");
}
