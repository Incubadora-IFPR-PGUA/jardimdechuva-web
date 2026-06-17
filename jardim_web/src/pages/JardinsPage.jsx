import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flower2, TreePine, Sprout, Leaf, MapPin,
  RefreshCw, Search, Plus, Send, X, Pencil, Trash2, User
} from "lucide-react";
import { api } from "../services/api";
import { toast } from "react-toastify";

// ─── Icon por nome do jardim ──────────────────────────────────────────────────

const resolveJardimConfig = (jardim) => {
  const nome = (jardim.nome || "").toLowerCase();
  const maps = [
    { keys: ["chuva", "pluvial", "água", "agua"],  Icon: Flower2,   color: "#3b82f6", bg: "#eff6ff" },
    { keys: ["bosque", "mata", "floresta", "árv"],  Icon: TreePine,  color: "#16a34a", bg: "#f0fdf4" },
    { keys: ["horta", "vegetal", "erva"],           Icon: Sprout,    color: "#65a30d", bg: "#f7fee7" },
    { keys: ["jardim", "flor", "ornamental"],       Icon: Flower2,   color: "#ec4899", bg: "#fdf2f8" },
  ];
  const match = maps.find(({ keys }) => keys.some((k) => nome.includes(k)));
  return match || { Icon: Leaf, color: "#10b981", bg: "#ecfdf5" };
};

// ─── Form vazio ───────────────────────────────────────────────────────────────

const FORM_EMPTY = { nome: "", descricao: "", localizacao: "", idUsuario: "" };

// ─── Component ────────────────────────────────────────────────────────────────

const JardinsPage = () => {
  const [jardins, setJardins]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando]     = useState(null); // jardim em edição
  const [deletando, setDeletando]   = useState(null); // jardim aguardando confirmação
  const [form, setForm]             = useState(FORM_EMPTY);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchJardins = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/jardins");
      setJardins(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os jardins.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJardins();
    const iv = setInterval(() => fetchJardins(true), 30000);
    return () => clearInterval(iv);
  }, [fetchJardins]);

  // ── Filtro/busca ───────────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    if (!search.trim()) return jardins;
    const q = search.toLowerCase();
    return jardins.filter(
      (j) =>
        (j.nome || "").toLowerCase().includes(q) ||
        (j.localizacao || "").toLowerCase().includes(q) ||
        (j.descricao || "").toLowerCase().includes(q)
    );
  }, [jardins, search]);

  // ── Abrir form de criação ──────────────────────────────────────────────────

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  // ── Abrir form de edição ───────────────────────────────────────────────────

  const abrirEdicao = (jardim) => {
    setEditando(jardim);
    setForm({
      nome: jardim.nome || "",
      descricao: jardim.descricao || "",
      localizacao: jardim.localizacao || "",
      idUsuario: jardim.idUsuario || jardim.id_usuario || "",
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit (criar ou editar) ───────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.warn("O nome do jardim é obrigatório.");
      return;
    }
    setSubmitting(true);
    try {
      if (editando) {
        await api.put(`/jardins/${editando.idJardim || editando.id_jardim}`, {
          nome: form.nome,
          descricao: form.descricao,
          localizacao: form.localizacao,
        });
        toast.success(`Jardim "${form.nome}" atualizado!`);
      } else {
        await api.post("/jardins", {
          ...form,
          idUsuario: form.idUsuario ? Number(form.idUsuario) : undefined,
        });
        toast.success(`Jardim "${form.nome}" criado!`);
      }
      fecharForm();
      fetchJardins(true);
    } catch {
      toast.error(editando ? "Erro ao atualizar jardim." : "Erro ao criar jardim.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Deletar ────────────────────────────────────────────────────────────────

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await api.delete(`/jardins/${deletando.idJardim || deletando.id_jardim}`);
      toast.success(`Jardim "${deletando.nome}" removido.`);
      setDeletando(null);
      fetchJardins(true);
    } catch {
      toast.error("Erro ao remover jardim.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: 8 }}>
            {jardins.length} jardim{jardins.length !== 1 ? "s" : ""} cadastrado{jardins.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Jardins de chuva</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Gerencie os jardins monitorados pelo sistema.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchJardins(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 10,
                     padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#047857",
                     display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                     boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : abrirNovo} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Jardim"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white",
                                              border: "1px solid rgba(16,185,129,0.12)" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#064e3b" }}>
            {editando ? `Editar — ${editando.nome}` : "Novo jardim"}
          </h3>
          <form onSubmit={handleSubmit}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>

            {/* Nome */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Nome *</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Jardim Principal"
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(16,185,129,0.2)", outline: "none",
                         background: "white", fontSize: 13 }} />
            </div>

            {/* Localização */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Localização</label>
              <input value={form.localizacao} onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                placeholder="Ex: Bloco A — Campus Norte"
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(16,185,129,0.2)", outline: "none",
                         background: "white", fontSize: 13 }} />
            </div>

            {/* ID do usuário (só na criação) */}
            {!editando && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>ID do responsável</label>
                <input value={form.idUsuario} onChange={(e) => setForm((f) => ({ ...f, idUsuario: e.target.value }))}
                  placeholder="Ex: 1"
                  type="number" min="1"
                  style={{ padding: "9px 12px", borderRadius: 8,
                           border: "1px solid rgba(16,185,129,0.2)", outline: "none",
                           background: "white", fontSize: 13 }} />
              </div>
            )}

            {/* Descrição — linha inteira */}
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Descrição</label>
              <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva brevemente o jardim, finalidade e características..."
                rows={3}
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(16,185,129,0.2)", outline: "none",
                         background: "white", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
            </div>

            {/* Botões */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                         background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none",
                         background: "linear-gradient(135deg,#10b981,#059669)", color: "white",
                         cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                         fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                <Send size={13} />
                {submitting ? (editando ? "Salvando..." : "Criando...") : (editando ? "Salvar alterações" : "Criar jardim")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%",
                                   transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jardim..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12,
                   border: "1px solid rgba(16,185,129,0.12)", outline: "none",
                   background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 20, height: 160 }}>
              <div className="skeleton" style={{ height: 14, width: "55%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "40%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 10, width: "70%", marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: "50%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Leaf size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum jardim encontrado para "${search}".` : "Nenhum jardim cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
          {displayed.map((j) => {
            const { Icon, color, bg } = resolveJardimConfig(j);
            const nDisp = j.dispositivos?.length ?? 0;
            const responsavel = j.usuario?.nome || null;

            return (
              <div key={j.idJardim || j.id_jardim}
                className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex",
                         flexDirection: "column", gap: 14,
                         border: "1px solid rgba(16,185,129,0.07)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: bg,
                                  display: "flex", alignItems: "center", justifyContent: "center", color,
                                  flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#064e3b", lineHeight: 1.2 }}>
                        {j.nome}
                      </div>
                      {nDisp > 0 && (
                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                          {nDisp} dispositivo{nDisp !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => abrirEdicao(j)} title="Editar"
                      style={{ background: "none", border: "1px solid rgba(16,185,129,0.15)",
                               borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                               color: "#059669", display: "flex", alignItems: "center" }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeletando(j)} title="Remover"
                      style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)",
                               borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                               color: "#ef4444", display: "flex", alignItems: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Descrição */}
                {j.descricao && (
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.5,
                              display: "-webkit-box", WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {j.descricao}
                  </p>
                )}

                {/* Rodapé */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: "auto" }}>
                  {j.localizacao && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5,
                                  fontSize: 11, color: "#9ca3af" }}>
                      <MapPin size={11} />
                      {j.localizacao}
                    </div>
                  )}
                  {responsavel && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5,
                                  fontSize: 11, color: "#9ca3af" }}>
                      <User size={11} />
                      {responsavel}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16,
                                                maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover jardim?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome}</strong> será removido permanentemente.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                         background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmarDelete}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none",
                         background: "#ef4444", color: "white", cursor: "pointer",
                         fontSize: 13, fontWeight: 600 }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JardinsPage;
