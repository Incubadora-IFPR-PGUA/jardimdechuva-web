import React, { useState, useEffect, useCallback } from "react";
import { Sliders, Plus, RefreshCw, Send, Power, X, Pencil, Trash2 } from "lucide-react";
import { atuadorService } from "../services/api";
import { toast } from "react-toastify";

// ─── Form vazio ───────────────────────────────────────────────────────────────

const FORM_EMPTY = { nome: "", idDispositivo: "1", mqttTopicoComando: "", estadoAtual: "DESLIGADO", localizacao: "" };

// ─── Component ────────────────────────────────────────────────────────────────

const AtuadoresPage = () => {
  const [atuadores, setAtuadores]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando]     = useState(null);
  const [deletando, setDeletando]   = useState(null);
  const [form, setForm]             = useState(FORM_EMPTY);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAtuadores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await atuadorService.listar();
      setAtuadores(res.data || []);
    } catch (err) {
      console.error("Erro ao listar atuadores:", err);
      toast.error("Não foi possível carregar os atuadores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAtuadores();
    const iv = setInterval(() => fetchAtuadores(true), 30000);
    return () => clearInterval(iv);
  }, [fetchAtuadores]);

  // ── Toggle ligado/desligado ────────────────────────────────────────────────

  const handleToggle = async (atuador) => {
    const novoEstado = (atuador.estadoAtual || atuador.estado_atual) === "LIGADO" ? "DESLIGADO" : "LIGADO";

    // Optimistic update
    setAtuadores(prev =>
      prev.map(a =>
        (a.idAtuador || a.id_atuador) === (atuador.idAtuador || atuador.id_atuador)
          ? { ...a, estadoAtual: novoEstado, estado_atual: novoEstado }
          : a
      )
    );

    try {
      await atuadorService.atualizar(atuador.idAtuador || atuador.id_atuador, { estadoAtual: novoEstado });
      toast.success(`${atuador.nome} alterado para ${novoEstado}!`);
    } catch {
      toast.error("Erro ao alterar estado do atuador.");
      fetchAtuadores(true); // reverte
    }
  };

  // ── Abrir edição ───────────────────────────────────────────────────────────

  const abrirEdicao = (atuador) => {
    setEditando(atuador);
    setForm({
      nome: atuador.nome || "",
      idDispositivo: atuador.idDispositivo || atuador.id_dispositivo || "1",
      mqttTopicoComando: atuador.mqttTopicoComando || atuador.mqtt_topico_comando || "",
      estadoAtual: atuador.estadoAtual || atuador.estado_atual || "DESLIGADO",
      localizacao: atuador.localizacao || "",
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
    if (!form.nome || !form.mqttTopicoComando) {
      toast.warn("Preencha nome e tópico MQTT.");
      return;
    }
    setSubmitting(true);
    try {
      if (editando) {
        await atuadorService.atualizar(editando.idAtuador || editando.id_atuador, {
          nome: form.nome,
          mqttTopicoComando: form.mqttTopicoComando,
          localizacao: form.localizacao,
        });
        toast.success(`Atuador "${form.nome}" atualizado!`);
      } else {
        await atuadorService.criar({
          ...form,
          idDispositivo: Number(form.idDispositivo),
        });
        toast.success(`Atuador "${form.nome}" cadastrado!`);
      }
      fecharForm();
      fetchAtuadores(true);
    } catch {
      toast.error(editando ? "Erro ao atualizar atuador." : "Erro ao cadastrar atuador.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Deletar ────────────────────────────────────────────────────────────────

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await atuadorService.deletar(deletando.idAtuador || deletando.id_atuador);
      toast.success(`Atuador "${deletando.nome}" removido.`);
      setDeletando(null);
      fetchAtuadores(true);
    } catch {
      toast.error("Erro ao remover atuador.");
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
            {atuadores.length} atuador{atuadores.length !== 1 ? "es" : ""} cadastrado{atuadores.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Atuadores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Controle manual de atuadores e saídas de comando do ESP32.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchAtuadores(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 10,
                     padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#047857",
                     display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                     boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
          <button onClick={showForm ? fecharForm : () => setShowForm(true)} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Atuador"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white",
                                              border: "1px solid rgba(16,185,129,0.12)" }}>
          <h2 style={{ fontSize: 16, marginBottom: 16, color: "#064e3b" }}>
            {editando ? `Editar atuador: ${editando.nome}` : "Cadastrar Novo Atuador"}
          </h2>
          <form onSubmit={handleSubmit}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>

            {[
              { key: "nome",              label: "Nome do Atuador *",        placeholder: "Ex: Válvula Setor Sul", type: "text"   },
              { key: "mqttTopicoComando", label: "Tópico MQTT de Comando *", placeholder: "Ex: cmd/valvula",      type: "text"   },
              { key: "localizacao",       label: "Função / Localização",     placeholder: "Ex: Controle de vazão",type: "text"   },
              { key: "idDispositivo",     label: "ID do Dispositivo",        placeholder: "1",                    type: "number" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>{label}</label>
                <input type={type} value={form[key]} placeholder={placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  disabled={editando && key === "idDispositivo"}
                  required={key === "nome" || key === "mqttTopicoComando"}
                  style={{ padding: "9px 12px", borderRadius: 8,
                           border: "1px solid rgba(16,185,129,0.2)", outline: "none",
                           fontSize: 13, background: editando && key === "idDispositivo" ? "#f9fafb" : "white" }} />
              </div>
            ))}

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
                {submitting
                  ? (editando ? "Salvando..." : "Cadastrando...")
                  : (editando ? "Salvar alterações" : "Confirmar")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 24, height: 180 }}>
              <div className="skeleton" style={{ height: 14, width: "50%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "30%", marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : atuadores.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Sliders size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Nenhum atuador cadastrado ainda.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
          {atuadores.map((a) => {
            const id = a.idAtuador || a.id_atuador;
            const estadoAtual = a.estadoAtual || a.estado_atual || "DESLIGADO";
            const isLigado = estadoAtual === "LIGADO";
            const topico = a.mqttTopicoComando || a.mqtt_topico_comando;

            return (
              <div key={id} className="glass-panel"
                style={{ padding: 24, background: "white", display: "flex",
                         flexDirection: "column", gap: 20,
                         border: "1px solid rgba(16,185,129,0.08)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10,
                                  background: isLigado ? "rgba(16,185,129,0.15)" : "#e5e7eb",
                                  color: isLigado ? "#059669" : "#9ca3af",
                                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Power size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, color: "#064e3b", margin: 0, fontWeight: 700 }}>{a.nome}</h3>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>ID #{id}</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => abrirEdicao(a)} title="Editar"
                      style={{ background: "none", border: "1px solid rgba(16,185,129,0.15)",
                               borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                               color: "#059669", display: "flex", alignItems: "center" }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeletando(a)} title="Remover"
                      style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)",
                               borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                               color: "#ef4444", display: "flex", alignItems: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div style={{ background: "#f9fafb", padding: 12, borderRadius: 10,
                              display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Função:</span>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{a.localizacao || "Geral"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                borderTop: "1px solid #f3f4f6", paddingTop: 6, marginTop: 2 }}>
                    <span style={{ color: "#6b7280" }}>Comando MQTT:</span>
                    <code style={{ fontSize: 11, color: "#059669" }}>{topico}</code>
                  </div>
                </div>

                {/* Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: isLigado ? "#10b981" : "#9ca3af", fontSize: 14 }}>
                    {isLigado ? "LIGADO" : "DESLIGADO"}
                  </span>
                  <label className="switch-container">
                    <input type="checkbox" checked={isLigado} onChange={() => handleToggle(a)} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16,
                                                maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover atuador?</h3>
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

export default AtuadoresPage;
