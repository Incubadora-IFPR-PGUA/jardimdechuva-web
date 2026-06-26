import React, { useState, useEffect, useCallback } from "react";
import { Settings, Plus, Pencil, Trash2, X, Send, Search, RefreshCw, Cpu } from "lucide-react";
import { tipoSensorService } from "../../services/api";
import { toast } from "react-toastify";

const FORM_EMPTY = { nome: "", unidade: "", descricao: "" };

const TiposSensoresPage = () => {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deletando, setDeletando] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const fetchTipos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await tipoSensorService.listar();
      setTipos(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os tipos de sensores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTipos();
  }, [fetchTipos]);

  const displayed = tipos.filter(t => 
    (t.nome || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.descricao || "").toLowerCase().includes(search.toLowerCase())
  );

  const abrirEdicao = (tipo) => {
    setEditando(tipo);
    setForm({
      nome: tipo.nome || "",
      unidade: tipo.unidade || "",
      descricao: tipo.descricao || ""
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
    if (!form.nome) {
      toast.warn("Preencha o nome do tipo de sensor.");
      return;
    }
    setSubmitting(true);
    try {
      if (editando) {
        await tipoSensorService.atualizar(editando.idTipoSensor || editando.id_tipo_sensor || editando.id, form);
        toast.success(`Tipo "${form.nome}" atualizado!`);
      } else {
        await tipoSensorService.criar(form);
        toast.success(`Tipo "${form.nome}" cadastrado!`);
      }
      fecharForm();
      fetchTipos(true);
    } catch {
      toast.error(editando ? "Erro ao atualizar tipo de sensor." : "Erro ao cadastrar tipo de sensor.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await tipoSensorService.deletar(deletando.idTipoSensor || deletando.id_tipo_sensor || deletando.id);
      toast.success(`Tipo "${deletando.nome}" removido.`);
      setDeletando(null);
      fetchTipos(true);
    } catch {
      toast.error("Erro ao remover tipo de sensor.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: 8 }}>
            {tipos.length} tipo{tipos.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Tipos de Sensores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Gerencie as categorias e unidades de medida dos sensores.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchTipos(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#047857", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
          <button onClick={showForm ? fecharForm : () => setShowForm(true)} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "white", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Tipo"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white", border: "1px solid rgba(16,185,129,0.12)" }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>
            {editando ? `Editar tipo: ${editando.nome}` : "Cadastrar Novo Tipo de Sensor"}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Nome *</label>
              <input type="text" value={form.nome} placeholder="Ex: Umidade do Solo" onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} required style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", outline: "none", fontSize: 13 }} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Unidade de Medida</label>
              <input type="text" value={form.unidade} placeholder="Ex: %" onChange={(e) => setForm(f => ({ ...f, unidade: e.target.value }))} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", outline: "none", fontSize: 13 }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Descrição</label>
              <input type="text" value={form.descricao} placeholder="Descrição opcional..." onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", outline: "none", fontSize: 13 }} />
            </div>

            <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={fecharForm} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button type="submit" disabled={submitting} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                <Send size={13} />
                {submitting ? (editando ? "Salvando..." : "Cadastrando...") : (editando ? "Salvar" : "Confirmar")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & List */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tipo..." style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(16,185,129,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-panel skeleton" style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Settings size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Nenhum tipo de sensor encontrado.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 }}>
          {displayed.map(t => (
            <div key={t.idTipoSensor || t.id_tipo_sensor || t.id} className="glass-panel hover-scale" style={{ padding: "18px 20px", background: "white", display: "flex", flexDirection: "column", gap: 12, border: "1px solid rgba(16,185,129,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                    <Settings size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#064e3b" }}>{t.nome}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{t.unidade ? `Unidade: ${t.unidade}` : "Sem unidade"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => abrirEdicao(t)} title="Editar" style={{ background: "none", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 7, padding: "4px 6px", cursor: "pointer", color: "#059669", display: "flex", alignItems: "center" }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => setDeletando(t)} title="Remover" style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "4px 6px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {t.descricao && (
                <p style={{ fontSize: 12, color: "#4b5563", margin: 0, lineHeight: 1.4 }}>
                  {t.descricao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Modal */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover Tipo?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome}</strong> será removido permanentemente.
            </p>
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

export default TiposSensoresPage;
