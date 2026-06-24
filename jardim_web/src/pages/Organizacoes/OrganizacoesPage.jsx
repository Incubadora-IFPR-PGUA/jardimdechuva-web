import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building, Search, Plus, RefreshCw, Pencil, Trash2, Send, X, MapPin
} from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";

const FORM_EMPTY = { nome: "", tipo: "instituicao_ensino", documento: "", email: "", telefone: "", endereco: "", cidade: "", estado: "", cep: "" };

const OrganizacoesPage = () => {
  const [organizacoes, setOrganizacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deletando, setDeletando] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const fetchOrganizacoes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/organizacoes");
      setOrganizacoes(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar as organizações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizacoes();
  }, [fetchOrganizacoes]);

  const displayed = useMemo(() => {
    if (!search.trim()) return organizacoes;
    const q = search.toLowerCase();
    return organizacoes.filter((o) => (o.nome || "").toLowerCase().includes(q));
  }, [organizacoes, search]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  const abrirEdicao = (org) => {
    setEditando(org);
    setForm({
      nome: org.nome || "",
      tipo: org.tipo || "instituicao_ensino",
      documento: org.documento || "",
      email: org.email || "",
      telefone: org.telefone || "",
      endereco: org.endereco || "",
      cidade: org.cidade || "",
      estado: org.estado || "",
      cep: org.cep || "",
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.warn("O nome da organização é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      if (editando) {
        await api.put(`/organizacoes/${editando.id_organizacao || editando.idOrganizacao}`, form);
        toast.success(`Organização "${form.nome}" atualizada!`);
      } else {
        await api.post("/organizacoes", form);
        toast.success(`Organização "${form.nome}" criada!`);
      }
      fecharForm();
      fetchOrganizacoes(true);
    } catch {
      toast.error(editando ? "Erro ao atualizar organização." : "Erro ao criar organização.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await api.delete(`/organizacoes/${deletando.id_organizacao || deletando.idOrganizacao}`);
      toast.success(`Organização "${deletando.nome}" removida.`);
      setDeletando(null);
      fetchOrganizacoes(true);
    } catch {
      toast.error("Erro ao remover organização.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5" }}>
            {organizacoes.length} organização{organizacoes.length !== 1 ? "ões" : ""} cadastrada{organizacoes.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Gerenciar Organizações</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Adicione e gerencie instituições, empresas ou grupos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchOrganizacoes(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10,
                     padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5",
                     display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : abrirNovo} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Nova Organização"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white", border: "1px solid rgba(79,70,229,0.12)" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#3730a3" }}>
            {editando ? `Editar Organização — ${editando.nome}` : "Nova Organização"}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Nome *</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: IFPR Campus Paranaguá"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 }}>
                <option value="instituicao_ensino">Instituição de Ensino</option>
                <option value="empresa">Empresa</option>
                <option value="ong">ONG</option>
                <option value="governo">Governo</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Email</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contato@organizacao.com" type="email"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Cidade</label>
              <input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                placeholder="Ex: Paranaguá"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 }} />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
                         cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                <Send size={13} />
                {submitting ? "Salvando..." : "Salvar Organização"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar organização por nome..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 20, height: 120 }}>
              <div className="skeleton" style={{ height: 14, width: "65%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 10, width: "80%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Building size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhuma organização encontrada para "${search}".` : "Nenhuma organização cadastrada."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {displayed.map((o) => (
            <div key={o.id_organizacao || o.idOrganizacao} className="glass-panel hover-scale"
              style={{ padding: "18px 20px", background: "white", display: "flex", flexDirection: "column", gap: 14, border: "1px solid rgba(79,70,229,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea", flexShrink: 0, fontWeight: 700, fontSize: 16 }}>
                    <Building size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#312e81", lineHeight: 1.2 }}>{o.nome}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={10} />
                      {o.cidade ? o.cidade : "Local não informado"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => abrirEdicao(o)} title="Editar" style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#4f46e5", display: "flex", alignItems: "center" }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeletando(o)} title="Remover" style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Confirm Delete */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover Organização?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>A organização <strong>{deletando.nome}</strong> será removida permanentemente.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={confirmarDelete} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizacoesPage;
