import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield,
  Search,
  Plus,
  RefreshCw,
  Send,
  X,
  Pencil,
  Trash2,
  Lock,
  Layers
} from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import s from "./Cargos.module.css";

const FORM_EMPTY = {
  nome: "",
  descricao: ""
};

const CargosPage = () => {
  const [cargos, setCargos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando]     = useState(null);
  const [deletando, setDeletando]   = useState(null);
  const [form, setForm]             = useState(FORM_EMPTY);

  // ── Fetch de Cargos ────────────────────────────────────────────────────────
  const fetchCargos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/cargos");
      const lista = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setCargos(lista);
    } catch (err) {
      console.error("Erro ao carregar cargos:", err);
      toast.error("Não foi possível carregar a lista de cargos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCargos();
    const interval = setInterval(() => fetchCargos(true), 30000);
    return () => clearInterval(interval);
  }, [fetchCargos]);

  // ── Filtro / Busca ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return cargos;
    const q = search.toLowerCase();
    return cargos.filter(
      (c) =>
        (c.nome || "").toLowerCase().includes(q) ||
        (c.descricao || "").toLowerCase().includes(q)
    );
  }, [cargos, search]);

  // ── Form Controle ──────────────────────────────────────────────────────────
  const abrirCriacao = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  const abrirEdicao = (c) => {
    setEditando(c);
    setForm({
      nome: c.nome || "",
      descricao: c.descricao || ""
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim()) {
      toast.warn("O nome do cargo é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || null
      };

      if (editando) {
        const id = editando.idCargo || editando.id_cargo;
        await api.put(`/cargos/${id}`, payload);
        toast.success(`Cargo "${form.nome}" atualizado!`);
      } else {
        await api.post("/cargos", payload);
        toast.success(`Cargo "${form.nome}" cadastrado com sucesso!`);
      }

      fecharForm();
      await fetchCargos(false);
    } catch (err) {
      console.error("Erro ao salvar cargo:", err);
      const erroMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      toast.error(erroMsg || "Erro ao salvar cargo.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Exclusão ───────────────────────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      const id = deletando.idCargo || deletando.id_cargo;
      await api.delete(`/cargos/${id}`);
      toast.success("Cargo removido com sucesso.");
      setDeletando(null);
      await fetchCargos(true);
    } catch (err) {
      console.error("Erro ao remover cargo:", err);
      const msg = err.response?.data?.message || "Não foi possível remover o cargo.";
      toast.error(msg);
    }
  };

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.headingGroup}>
          <span className="badge" style={{ marginBottom: 4, background: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, width: "fit-content" }}>
            {cargos.length} cargos cadastrados
          </span>
          <h1 className={s.title}>Gerenciar Cargos</h1>
          <p className={s.subtitle}>
            Defina papéis, níveis de acesso e responsabilidades para os membros das organizações.
          </p>
        </div>

        <div className={s.actions}>
          <button onClick={() => fetchCargos(true)} className={`${s.btnOutline} hover-scale`}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : abrirCriacao} className={`${s.btnPrimary} hover-scale`}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Cargo"}
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className={`glass-panel ${s.formPanel}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#3730a3" }}>
              {editando ? `Editar Cargo — ${editando.nome}` : "Cadastrar Novo Cargo"}
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Campos com <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> são obrigatórios
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Nome do Cargo <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Operador Técnico, Supervisor, Auditor..."
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Descrição / Nível de Permissão</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva as permissões e limites deste perfil de usuário..."
                rows={3}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13, color: "#4b5563" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}
              >
                <Send size={13} />
                {submitting ? "Processando..." : (editando ? "Salvar alterações" : "Cadastrar Cargo")}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cargo..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(99, 102, 241, 0.2)", outline: "none", background: "white", fontSize: 13, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
        />
      </div>

      {/* Cards de Cargos */}
      {loading ? (
        <div className={s.gridCards}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`glass-panel ${s.card}`} style={{ height: 130 }}>
              <div className="skeleton" style={{ height: 16, width: "50%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 30, width: "90%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white", borderRadius: 16 }}>
          <Shield size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum cargo encontrado para "${search}".` : "Nenhum cargo cadastrado."}
          </p>
        </div>
      ) : (
        <div className={s.gridCards}>
          {displayed.map((c) => {
            const id = c.idCargo || c.id_cargo;
            const isProtected = false;
            
            return (
              <div key={id} className={`glass-panel ${s.card} hover-scale`}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5", flexShrink: 0 }}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", display: "flex", alignItems: "center", gap: 6 }}>
                        {c.nome}
                        {isProtected && (
                          <span title="Cargo padrão do sistema" style={{ background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <Lock size={10} /> Sistema
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>ID: #{id}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => abrirEdicao(c)} title="Editar"
                      style={{ background: "none", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#4f46e5", display: "flex", alignItems: "center" }}>
                      <Pencil size={13} />
                    </button>
                    {!isProtected && (
                      <button onClick={() => setDeletando(c)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: 12, color: "#4b5563", margin: 0, lineHeight: 1.4, minHeight: 32 }}>
                  {c.descricao || "Sem descrição definida para este perfil de acesso."}
                </p>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Deletar */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover cargo?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              O cargo <strong>{deletando.nome}</strong> será removido permanentemente.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmarDelete} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CargosPage;