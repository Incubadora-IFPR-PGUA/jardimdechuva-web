import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Cpu, Wifi, WifiOff, Search, Plus, RefreshCw, Send, X, Pencil, Trash2, Router
} from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";

// ─── Status config ────────────────────────────────────────────────────────────

const resolveStatusConfig = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "online")   return { label: "Online",   color: "#059669", bg: "#d1fae5", Icon: Wifi    };
  if (s === "offline")  return { label: "Offline",  color: "#6b7280", bg: "#f3f4f6", Icon: WifiOff };
  if (s === "erro")     return { label: "Erro",     color: "#dc2626", bg: "#fee2e2", Icon: WifiOff };
  return                       { label: "Inativo",  color: "#9ca3af", bg: "#f9fafb", Icon: WifiOff };
};

// ─── Form vazio ───────────────────────────────────────────────────────────────

const FORM_EMPTY = {
  nome: "", idJardim: "", idTipoDispositivo: "1", identificador: "",
  protocolo: "MQTT", status: "offline", firmwareVersao: "", mqttTopicoBase: ""
};

// ─── Component ────────────────────────────────────────────────────────────────

const DispositivosPage = () => {
  const [dispositivos, setDispositivos] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [editando, setEditando]         = useState(null);
  const [deletando, setDeletando]       = useState(null);
  const [form, setForm]                 = useState(FORM_EMPTY);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDispositivos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/dispositivos");
      setDispositivos(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os dispositivos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDispositivos();
    const iv = setInterval(() => fetchDispositivos(true), 30000);
    return () => clearInterval(iv);
  }, [fetchDispositivos]);

  // ── Filtro/busca ───────────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    if (!search.trim()) return dispositivos;
    const q = search.toLowerCase();
    return dispositivos.filter(
      (d) =>
        (d.nome || "").toLowerCase().includes(q) ||
        (d.identificador || "").toLowerCase().includes(q) ||
        (d.jardim?.nome || "").toLowerCase().includes(q)
    );
  }, [dispositivos, search]);

  const onlineCount = dispositivos.filter(
    (d) => (d.status || "").toLowerCase() === "online"
  ).length;

  // ── Abrir edição ───────────────────────────────────────────────────────────

  const abrirEdicao = (disp) => {
    setEditando(disp);
    setForm({
      nome: disp.nome || "",
      idJardim: disp.idJardim || disp.id_jardim || "",
      idTipoDispositivo: disp.idTipoDispositivo || disp.id_tipo_dispositivo || "1",
      identificador: disp.identificador || "",
      protocolo: disp.protocolo || "MQTT",
      status: disp.status || "offline",
      firmwareVersao: disp.firmwareVersao || disp.firmware_versao || "",
      mqttTopicoBase: disp.mqttTopicoBase || disp.mqtt_topico_base || "",
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
    if (!form.nome.trim() || !form.identificador.trim()) {
      toast.warn("Nome e identificador são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      if (editando) {
        await api.put(`/dispositivos/${editando.idDispositivo || editando.id_dispositivo}`, {
          nome: form.nome,
          status: form.status,
          firmwareVersao: form.firmwareVersao,
          mqttTopicoBase: form.mqttTopicoBase,
        });
        toast.success(`Dispositivo "${form.nome}" atualizado!`);
      } else {
        await api.post("/dispositivos", {
          ...form,
          idJardim: Number(form.idJardim),
          idTipoDispositivo: Number(form.idTipoDispositivo),
        });
        toast.success(`Dispositivo "${form.nome}" cadastrado!`);
      }
      fecharForm();
      fetchDispositivos(true);
    } catch {
      toast.error(editando ? "Erro ao atualizar dispositivo." : "Erro ao cadastrar dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Deletar ────────────────────────────────────────────────────────────────

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await api.delete(`/dispositivos/${deletando.idDispositivo || deletando.id_dispositivo}`);
      toast.success(`Dispositivo "${deletando.nome}" removido.`);
      setDeletando(null);
      fetchDispositivos(true);
    } catch {
      toast.error("Erro ao remover dispositivo.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5",
                                           padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {onlineCount} online · {dispositivos.length} total
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Dispositivos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Gerencie os ESP32 e demais dispositivos conectados ao sistema.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchDispositivos(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10,
                     padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5",
                     display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                     boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : () => setShowForm(true)} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Dispositivo"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white",
                                              border: "1px solid rgba(79,70,229,0.12)" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#3730a3" }}>
            {editando ? `Editar dispositivo — ${editando.nome}` : "Cadastrar Novo Dispositivo"}
          </h3>
          <form onSubmit={handleSubmit}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>

            {/* Nome */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Nome *</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: ESP32 Jardim A" required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                         outline: "none", fontSize: 13, background: "white" }} />
            </div>

            {/* Identificador — desabilitado na edição */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Identificador *</label>
              <input value={form.identificador}
                onChange={(e) => setForm((f) => ({ ...f, identificador: e.target.value }))}
                placeholder="Ex: esp32-jardim-a" required disabled={!!editando}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                         outline: "none", fontSize: 13, background: editando ? "#f9fafb" : "white" }} />
            </div>

            {/* MQTT Tópico Base */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Tópico MQTT Base</label>
              <input value={form.mqttTopicoBase}
                onChange={(e) => setForm((f) => ({ ...f, mqttTopicoBase: e.target.value }))}
                placeholder="Ex: jardim/a"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                         outline: "none", fontSize: 13, background: "white" }} />
            </div>

            {/* Firmware */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Versão Firmware</label>
              <input value={form.firmwareVersao}
                onChange={(e) => setForm((f) => ({ ...f, firmwareVersao: e.target.value }))}
                placeholder="Ex: 1.0.0"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                         outline: "none", fontSize: 13, background: "white" }} />
            </div>

            {/* ID Jardim — apenas na criação */}
            {!editando && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>ID do Jardim</label>
                <input type="number" value={form.idJardim}
                  onChange={(e) => setForm((f) => ({ ...f, idJardim: e.target.value }))}
                  placeholder="1"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                           outline: "none", fontSize: 13, background: "white" }} />
              </div>
            )}

            {/* Protocolo — apenas na criação */}
            {!editando && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Protocolo</label>
                <select value={form.protocolo}
                  onChange={(e) => setForm((f) => ({ ...f, protocolo: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                           outline: "none", background: "white", fontSize: 13 }}>
                  <option value="MQTT">MQTT</option>
                  <option value="HTTP">HTTP</option>
                  <option value="WebSocket">WebSocket</option>
                </select>
              </div>
            )}

            {/* Status — apenas na edição */}
            {editando && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Status</label>
                <select value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)",
                           outline: "none", background: "white", fontSize: 13 }}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="erro">Erro</option>
                </select>
              </div>
            )}

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button type="button" onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                         background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none",
                         background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
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

      {/* Busca */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%",
                                   transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar dispositivo..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12,
                   border: "1px solid rgba(79,70,229,0.12)", outline: "none",
                   background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 24, height: 180 }}>
              <div className="skeleton" style={{ height: 14, width: "55%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "35%", marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "45%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Router size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum dispositivo encontrado para "${search}".` : "Nenhum dispositivo cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
          {displayed.map((d) => {
            const id = d.idDispositivo || d.id_dispositivo;
            const { label, color, bg, Icon: StatusIcon } = resolveStatusConfig(d.status);
            const nSensores  = d.sensores?.length  ?? 0;
            const nAtuadores = d.atuadores?.length ?? 0;

            return (
              <div key={id} className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex",
                         flexDirection: "column", gap: 16,
                         border: "1px solid rgba(79,70,229,0.07)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e0e7ff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "#4f46e5", flexShrink: 0 }}>
                      <Cpu size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#312e81", lineHeight: 1.2 }}>
                        {d.nome || "Dispositivo"}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {d.identificador}
                      </div>
                    </div>
                  </div>

                  {/* Status + ações */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                                   fontWeight: 600, color, background: bg,
                                   padding: "3px 8px", borderRadius: 20 }}>
                      <StatusIcon size={11} />
                      {label}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(d)} title="Editar"
                        style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)",
                                 borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                                 color: "#4f46e5", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(d)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)",
                                 borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                                 color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div style={{ background: "#f9fafb", padding: 12, borderRadius: 10,
                              display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Jardim:</span>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{d.jardim?.nome || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                borderTop: "1px solid #f3f4f6", paddingTop: 6, marginTop: 2 }}>
                    <span style={{ color: "#6b7280" }}>Protocolo:</span>
                    <code style={{ fontSize: 11, color: "#4f46e5" }}>{d.protocolo}</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between",
                                borderTop: "1px solid #f3f4f6", paddingTop: 6, marginTop: 2 }}>
                    <span style={{ color: "#6b7280" }}>Tópico MQTT:</span>
                    <code style={{ fontSize: 11, color: "#4f46e5" }}>{d.mqttTopicoBase || d.mqtt_topico_base || "—"}</code>
                  </div>
                </div>

                {/* Rodapé — sensores e atuadores */}
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: "#eff6ff", borderRadius: 8, padding: "8px 12px",
                                textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>{nSensores}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Sensores</div>
                  </div>
                  <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px",
                                textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>{nAtuadores}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Atuadores</div>
                  </div>
                  {d.firmwareVersao && (
                    <div style={{ flex: 1, background: "#faf5ff", borderRadius: 8, padding: "8px 12px",
                                  textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#7e22ce", marginTop: 3 }}>
                        {d.firmwareVersao || d.firmware_versao}
                      </div>
                      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Firmware</div>
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
                      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16,
                                                maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover dispositivo?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome}</strong> será removido permanentemente junto com seus sensores e atuadores.
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

export default DispositivosPage;