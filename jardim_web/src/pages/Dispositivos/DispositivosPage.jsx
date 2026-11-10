import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Cpu, Wifi, WifiOff, Search, Plus, RefreshCw, Send, X, Pencil, Trash2, Router
} from "lucide-react";
import { api, tipoDispositivoService, jardimService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

// ─── Status config ────────────────────────────────────────────────────────────

const resolveStatusConfig = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "online")   return { label: "Online",   color: "#059669", bg: "#d1fae5", Icon: Wifi    };
  if (s === "offline")  return { label: "Offline",  color: "#6b7280", bg: "#f3f4f6", Icon: WifiOff };
  if (s === "erro")     return { label: "Erro",     color: "#dc2626", bg: "#fee2e2", Icon: WifiOff };
  return                       { label: "Inativo",  color: "#9ca3af", bg: "#f9fafb", Icon: WifiOff };
};

// ─── Form Vazio ───────────────────────────────────────────────────────────────

const FORM_EMPTY = {
  nome: "",
  identificador: "",
  idTipoDispositivo: "",
  idJardim: "",
  protocolo: "MQTT",
  status: "offline",
  mqttTopicoBase: "",
  firmwareVersao: ""
};

const DispositivosPage = () => {
  const { user } = useAuth(); // Correcção do ReferenceError
  const [dispositivos, setDispositivos]           = useState([]);
  const [tiposDispositivos, setTiposDispositivos] = useState([]);
  const [jardins, setJardins]                     = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [search, setSearch]                       = useState("");
  const [showForm, setShowForm]                   = useState(false);
  const [submitting, setSubmitting]               = useState(false);
  const [editando, setEditando]                   = useState(null);
  const [deletando, setDeletando]                 = useState(null);
  const [form, setForm]                           = useState(FORM_EMPTY);

  // ── Fetch de Dispositivos ──────────────────────────────────────────────────

  const fetchDispositivos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/dispositivos");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDispositivos(data);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os dispositivos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch Individual de Tipos e Jardins com Logs ────────────────────────────
  const carregarDadosAuxiliares = async () => {
    // 1. Busca Tipos de Dispositivos
    try {
      const resTipos = tipoDispositivoService?.listar 
        ? await tipoDispositivoService.listar() 
        : await api.get("/tipos-dispositivos");

      console.log("📦 Resposta /tipos-dispositivos:", resTipos.data);
      
      let listaTipos = [];
      if (Array.isArray(resTipos.data)) {
        listaTipos = resTipos.data;
      } else if (Array.isArray(resTipos.data?.data)) {
        listaTipos = resTipos.data.data;
      } else if (Array.isArray(resTipos.data?.tipos)) {
        listaTipos = resTipos.data.tipos;
      }
      setTiposDispositivos(listaTipos);
    } catch (err) {
      console.error("❌ Erro ao buscar /tipos-dispositivos:", err.response?.status, err.message);
    }

    // 2. Busca Jardins
    try {
      const resJardins = jardimService?.listar 
        ? await jardimService.listar() 
        : await api.get("/jardins");

      console.log("🌱 Resposta bruta /jardins:", resJardins.data);

      let listaJardins = [];
      if (Array.isArray(resJardins.data)) {
        listaJardins = resJardins.data;
      } else if (Array.isArray(resJardins.data?.data)) {
        listaJardins = resJardins.data.data;
      } else if (Array.isArray(resJardins.data?.jardins)) {
        listaJardins = resJardins.data.jardins;
      } else if (Array.isArray(resJardins.data?.rows)) {
        listaJardins = resJardins.data.rows;
      }

      console.log("🌿 Jardins carregados no state:", listaJardins);
      setJardins(listaJardins);
    } catch (err) {
      console.error("❌ Erro ao buscar /jardins:", err.response?.status, err.response?.data || err.message);
      toast.error("Não foi possível carregar a lista de jardins.");
    }
  };

  useEffect(() => {
    fetchDispositivos();
    carregarDadosAuxiliares();
    const iv = setInterval(() => fetchDispositivos(true), 30000);
    return () => clearInterval(iv);
  }, [fetchDispositivos]);

  // ── Geração Dinâmica do Tópico MQTT Base ────────────────────────────────────

  useEffect(() => {
    if (!editando) {
      const orgId = user?.organizacoes?.[0]?.idOrganizacao || user?.organizacoes?.[0]?.id_organizacao || 1;
      const jardimId = form.idJardim || '{id_jardim}';
      const macLimpo = form.identificador ? form.identificador.trim().replace(/\s+/g, '-') : '{identificador}';

      const topicoSugerido = `jci/${orgId}/${jardimId}/${macLimpo}`;
      
      setForm((f) => ({
        ...f,
        mqttTopicoBase: form.identificador || form.idJardim ? topicoSugerido : ''
      }));
    }
  }, [form.identificador, form.idJardim, editando, user]);

  // ── Filtro/Busca ───────────────────────────────────────────────────────────

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

  // ── Abrir/Fechar Formulário ────────────────────────────────────────────────

  const abrirEdicao = (disp) => {
    setEditando(disp);
    setForm({
      nome: disp.nome || "",
      identificador: disp.identificador || "",
      idJardim: disp.idJardim || disp.id_jardim || "",
      idTipoDispositivo: disp.idTipoDispositivo || disp.id_tipo_dispositivo || "",
      protocolo: disp.protocolo || "MQTT",
      status: disp.status || "offline",
      mqttTopicoBase: disp.mqttTopicoBase || disp.mqtt_topico_base || "",
      firmwareVersao: disp.firmwareVersao || disp.firmware_versao || "",
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit (Salvar ou Editar) ──────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.identificador.trim() ||
      !form.mqttTopicoBase.trim() ||
      !form.idJardim ||
      !form.idTipoDispositivo
    ) {
      toast.warn("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        identificador: form.identificador.trim(),
        mqtt_topico_base: form.mqttTopicoBase.trim(),
        mqttTopicoBase: form.mqttTopicoBase.trim(),
        id_jardim: Number(form.idJardim),
        idJardim: Number(form.idJardim),
        id_tipo_dispositivo: Number(form.idTipoDispositivo),
        idTipoDispositivo: Number(form.idTipoDispositivo),
        nome: form.nome.trim() || null,
        protocolo: form.protocolo || "MQTT",
        status: form.status || "offline",
        firmware_versao: form.firmwareVersao.trim() || null,
        firmwareVersao: form.firmwareVersao.trim() || null,
      };

      if (editando) {
        const id = editando.idDispositivo || editando.id_dispositivo;
        await api.put(`/dispositivos/${id}`, payload);
        toast.success("Dispositivo atualizado com sucesso!");
      } else {
        await api.post("/dispositivos", payload);
        toast.success("Dispositivo cadastrado com sucesso!");
      }

      fecharForm();
      fetchDispositivos(false);
    } catch (err) {
      console.error("❌ Erro ao salvar dispositivo:", err.response?.data || err);
      const erroMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      toast.error(erroMsg || "Erro ao salvar no banco.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      const id = deletando.idDispositivo || deletando.id_dispositivo;
      await api.delete(`/dispositivos/${id}`);
      toast.success(`Dispositivo removido com sucesso.`);
      setDeletando(null);
      await fetchDispositivos(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover dispositivo. Verifique as relações no banco.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {onlineCount} online · {dispositivos.length} total
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#111827" }}>Dispositivos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Gerencie os ESP32 e nós de hardware conectados ao sistema.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchDispositivos(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : () => setShowForm(true)} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "white", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Dispositivo"}
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white", borderRadius: 16, border: "1px solid rgba(79,70,229,0.15)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#3730a3" }}>
              {editando ? `Editar Dispositivo — ${editando.nome || editando.identificador}` : "Cadastrar Novo Dispositivo"}
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Campos com <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> são obrigatórios.
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>

            {/* Identificador (OBRIGATÓRIO) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Identificador / MAC <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input 
                value={form.identificador}
                onChange={(e) => setForm((f) => ({ ...f, identificador: e.target.value }))}
                placeholder="Ex: A4:CF:12:8B:9C:01" 
                required 
                disabled={!!editando}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} 
              />
            </div>

            {/* Tópico MQTT Base (OBRIGATÓRIO / AUTOMÁTICO) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                  Tópico MQTT Base <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: "#6366f1", background: "#e0e7ff", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                  Gerado automaticamente
                </span>
              </div>

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  value={form.mqttTopicoBase}
                  onChange={(e) => setForm((f) => ({ ...f, mqttTopicoBase: e.target.value }))}
                  placeholder="Ex: jci/1/2/4:CF:12:8B:9C:01"
                  required
                  style={{ 
                    width: "100%", 
                    padding: "10px 14px", 
                    borderRadius: 10, 
                    border: "1px solid #cbd5e1", 
                    outline: "none", 
                    fontSize: 13, 
                    fontFamily: "monospace",
                    backgroundColor: "#f8fafc",
                    color: "#1e293b",
                    fontWeight: 600
                  }} 
                />
              </div>

              <div style={{ 
                fontSize: 11, 
                color: "#64748b", 
                background: "#f1f5f9", 
                padding: "8px 12px", 
                borderRadius: 8, 
                lineHeight: 1.5,
                borderLeft: "3px solid #6366f1"
              }}>
                <div>📌 <strong>Padrão da Placa:</strong> <code>jci/[org]/[jardim]/[MAC]</code></div>
                <div style={{ color: "#475569", marginTop: 2 }}>
                  • <strong>Sensores publicarão em:</strong> <code>{form.mqttTopicoBase || 'jci/1/1/MAC'}/leituras</code><br />
                  • <strong>Atuadores receberão em:</strong> <code>{form.mqttTopicoBase || 'jci/1/1/MAC'}/atuadores/[nome]/set</code>
                </div>
              </div>
            </div>

            {/* Tipo de Dispositivo (OBRIGATÓRIO) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Tipo de Dispositivo <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.idTipoDispositivo}
                onChange={(e) => setForm((f) => ({ ...f, idTipoDispositivo: e.target.value }))}
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
              >
                <option value="">Selecione o modelo...</option>
                {tiposDispositivos.map((tipo) => {
                  const id = tipo.idTipoDispositivo || tipo.id_tipo_dispositivo;
                  return (
                    <option key={id} value={id}>
                      {tipo.nome}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Jardim (OBRIGATÓRIO) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Jardim <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.idJardim}
                onChange={(e) => setForm((f) => ({ ...f, idJardim: e.target.value }))}
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
              >
                <option value="">Selecione o jardim...</option>
                {jardins.map((j) => {
                  const id = j.idJardim || j.id_jardim;
                  return (
                    <option key={id} value={id}>
                      {j.nome}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Nome (OPCIONAL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Nome (Opcional)</label>
              <input 
                value={form.nome} 
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: ESP32 Nó Principal" 
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} 
              />
            </div>

            {/* Protocolo (OPCIONAL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Protocolo</label>
              <select 
                value={form.protocolo}
                onChange={(e) => setForm((f) => ({ ...f, protocolo: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
              >
                <option value="MQTT">MQTT</option>
                <option value="HTTP">HTTP</option>
                <option value="WebSocket">WebSocket</option>
              </select>
            </div>

            {/* Status (OPCIONAL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Status</label>
              <select 
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="erro">Erro</option>
              </select>
            </div>

            {/* Versão de Firmware (OPCIONAL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Versão do Firmware</label>
              <input 
                value={form.firmwareVersao}
                onChange={(e) => setForm((f) => ({ ...f, firmwareVersao: e.target.value }))}
                placeholder="Ex: 1.0.0"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13, background: "white" }} 
              />
            </div>

            {/* Botões */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
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
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}
              >
                <Send size={13} />
                {submitting ? "Processando..." : (editando ? "Salvar alterações" : "Cadastrar Dispositivo")}
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
          placeholder="Buscar dispositivo..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} 
        />
      </div>

      {/* Cards de Dispositivos */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 24, height: 180 }}>
              <div className="skeleton" style={{ height: 14, width: "55%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "35%", marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {displayed.map((d) => {
            const id = d.idDispositivo || d.id_dispositivo;
            const { label, color, bg, Icon: StatusIcon } = resolveStatusConfig(d.status);
            const nSensores  = d.sensores?.length  ?? 0;
            const nAtuadores = d.atuadores?.length ?? 0;
            const nomeTipo   = d.tipoDispositivo?.nome || d.tipo_dispositivo?.nome;

            return (
              <div key={id} className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex", flexDirection: "column", gap: 16, borderRadius: 16, border: "1px solid rgba(79,70,229,0.08)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>

                {/* Top Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5", flexShrink: 0 }}>
                      <Cpu size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", lineHeight: 1.2 }}>
                        {d.nome || d.identificador}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {d.identificador}
                      </div>
                    </div>
                  </div>

                  {/* Badges e Ações */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 8px", borderRadius: 20 }}>
                      <StatusIcon size={11} />
                      {label}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(d)} title="Editar"
                        style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#4f46e5", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(d)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Informações Centrais */}
                <div style={{ background: "#f9fafb", padding: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Modelo:</span>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{nomeTipo || "Não informado"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Jardim:</span>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{d.jardim?.nome || "Sem vínculo"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: 6, marginTop: 2 }}>
                    <span style={{ color: "#6b7280" }}>Protocolo:</span>
                    <code style={{ fontSize: 11, color: "#4f46e5" }}>{d.protocolo || "MQTT"}</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: 6, marginTop: 2 }}>
                    <span style={{ color: "#6b7280" }}>Tópico MQTT:</span>
                    <code style={{ fontSize: 11, color: "#4f46e5" }}>{d.mqttTopicoBase || d.mqtt_topico_base}</code>
                  </div>
                </div>

                {/* Contadores */}
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: "#eff6ff", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1d4ed8" }}>{nSensores}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Sensores</div>
                  </div>
                  <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>{nAtuadores}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>Atuadores</div>
                  </div>
                  {(d.firmwareVersao || d.firmware_versao) && (
                    <div style={{ flex: 1, background: "#faf5ff", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
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

      {/* Modal Deletar */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover dispositivo?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome || deletando.identificador}</strong> será removido permanentemente.
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

export default DispositivosPage;