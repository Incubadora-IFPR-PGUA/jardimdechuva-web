import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sliders,
  Power,
  Search,
  Plus,
  RefreshCw,
  Send,
  X,
  Pencil,
  Trash2,
  Cpu,
  MapPin,
  CheckCircle2,
  XCircle,
  Activity
} from "lucide-react";
import { api, atuadorService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

// ─── Estado Vazio Inicial ───────────────────────────────────────────────────

const FORM_EMPTY = {
  nome: "",
  idDispositivo: "",
  mqttTopicoComando: "",
  estadoAtual: "desligado",
  localizacao: ""
};

const AtuadoresPage = () => {
  const [atuadores, setAtuadores]         = useState([]);
  const [dispositivos, setDispositivos]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState("");
  const [showForm, setShowForm]           = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [editando, setEditando]           = useState(null);
  const [deletando, setDeletando]         = useState(null);
  const [acionandoId, setAcionandoId]     = useState(null);
  const [form, setForm]                   = useState(FORM_EMPTY);

  const { can } = useAuth();
  const podeGerenciar = can("atuadores.gerenciar");
  const podeAcionar   = can("atuadores.acionar");

  // ── Fetch de Atuadores ──────────────────────────────────────────────────
  const fetchAtuadores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await (atuadorService?.listar ? atuadorService.listar() : api.get("/atuadores"));
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAtuadores(data);
    } catch (err) {
      console.error("Erro ao carregar atuadores:", err);
      toast.error("Não foi possível carregar os atuadores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch de Dispositivos (Para alimentar a lista suspensa) ──────────────
  const carregarDispositivos = async () => {
    try {
      const res = await api.get("/dispositivos");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDispositivos(data);
    } catch (err) {
      console.error("Erro ao carregar dispositivos para atuadores:", err);
    }
  };

  useEffect(() => {
    fetchAtuadores();
    carregarDispositivos();
    const iv = setInterval(() => fetchAtuadores(true), 30000);
    return () => clearInterval(iv);
  }, [fetchAtuadores]);

  // ── Geração Automática do Tópico de Comando baseado no Dispositivo Pai ───
  useEffect(() => {
    if (!editando && form.idDispositivo) {
      const disp = dispositivos.find(
        (d) => String(d.idDispositivo || d.id_dispositivo) === String(form.idDispositivo)
      );

      if (disp) {
        // Pega a base exata cadastrada na tela de Dispositivos (ex: jci/1/1/A4:CF:12:8B:9C:01)
        const base = (disp.mqttTopicoBase || disp.mqtt_topico_base || "").replace(/\/+$/, "");
        
        // Formata o nome para slug seguro de URL/MQTT (ex: "Válvula Solenoide" -> "valvula_solenoide")
        const slug = form.nome
          ? form.nome
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
          : "{nome_atuador}";

        const topicoGerado = base ? `${base}/atuadores/${slug}/set` : "";

        setForm((f) => ({
          ...f,
          mqttTopicoComando: topicoGerado
        }));
      }
    }
  }, [form.idDispositivo, form.nome, dispositivos, editando]);

  // ── Filtro / Busca Reativa ──────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return atuadores;
    const q = search.toLowerCase();
    return atuadores.filter(
      (a) =>
        (a.nome || "").toLowerCase().includes(q) ||
        (a.mqttTopicoComando || a.mqtt_topico_comando || "").toLowerCase().includes(q) ||
        (a.dispositivo?.nome || "").toLowerCase().includes(q) ||
        (a.dispositivo?.identificador || "").toLowerCase().includes(q) ||
        (a.localizacao || "").toLowerCase().includes(q)
    );
  }, [atuadores, search]);

  const ativosCount = atuadores.filter(
    (a) => (a.estadoAtual || a.estado_atual || "").toLowerCase() === "ligado"
  ).length;

  // ── Formulário (Abrir / Fechar) ─────────────────────────────────────────
  const abrirCriacao = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  const abrirEdicao = (item) => {
    setEditando(item);
    setForm({
      nome: item.nome || "",
      idDispositivo: item.idDispositivo || item.id_dispositivo || "",
      mqttTopicoComando: item.mqttTopicoComando || item.mqtt_topico_comando || "",
      estadoAtual: item.estadoAtual || item.estado_atual || "desligado",
      localizacao: item.localizacao || ""
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit (Salvar ou Editar) ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.idDispositivo || !form.mqttTopicoComando.trim()) {
      toast.warn("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        id_dispositivo: Number(form.idDispositivo),
        idDispositivo: Number(form.idDispositivo),
        mqtt_topico_comando: form.mqttTopicoComando.trim(),
        mqttTopicoComando: form.mqttTopicoComando.trim(),
        estado_atual: form.estadoAtual || "desligado",
        estadoAtual: form.estadoAtual || "desligado",
        localizacao: form.localizacao?.trim() || null
      };

      if (editando) {
        const id = editando.idAtuador || editando.id_atuador;
        await api.put(`/atuadores/${id}`, payload);
        toast.success(`Atuador "${form.nome}" atualizado!`);
      } else {
        await api.post("/atuadores", payload);
        toast.success(`Atuador "${form.nome}" cadastrado com sucesso!`);
      }

      fecharForm();
      await fetchAtuadores(false);
    } catch (err) {
      console.error("Erro ao salvar atuador:", err.response?.data || err);
      const erroMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      toast.error(erroMsg || "Erro ao salvar atuador no banco.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Disparo de Comando (Ligar / Desligar via Backend & MQTT) ────────────
  const alternarEstadoAtuador = async (atuador) => {
    const id = atuador.idAtuador || atuador.id_atuador;
    const estado = (atuador.estadoAtual || atuador.estado_atual || "desligado").toLowerCase();
    const novoComando = estado === "ligado" ? "desligar" : "ligar";

    setAcionandoId(id);
    try {
      await atuadorService.acionar(id, novoComando);

      toast.info(`Comando '${novoComando.toUpperCase()}' enviado para "${atuador.nome}"`);
      await fetchAtuadores(true);
    } catch (err) {
      console.error("Erro ao acionar atuador:", err);
      toast.error("Falha ao comunicar comando ao atuador.");
    } finally {
      setAcionandoId(null);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      const id = deletando.idAtuador || deletando.id_atuador;
      await api.delete(`/atuadores/${id}`);
      toast.success(`Atuador removido com sucesso.`);
      setDeletando(null);
      await fetchAtuadores(true);
    } catch (err) {
      console.error("Erro ao remover:", err);
      toast.error("Erro ao excluir o atuador. Verifique dependências no banco.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {ativosCount} ativos · {atuadores.length} total
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#111827" }}>Atuadores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Controle relés, bombas, lâmpadas e válvulas solenoides vinculados aos seus ESP32.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchAtuadores(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          {podeGerenciar && (
            <button onClick={showForm ? fecharForm : abrirCriacao} className="hover-scale"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "white", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Cancelar" : "Novo Atuador"}
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Cadastro / Edição */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white", borderRadius: 16, border: "1px solid rgba(79,70,229,0.15)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#3730a3" }}>
              {editando ? `Editar Atuador — ${editando.nome}` : "Cadastrar Novo Atuador"}
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Campos com <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> são obrigatórios.
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>

            {/* Nome do Atuador (OBRIGATÓRIO) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Nome do Atuador <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input 
                value={form.nome} 
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Válvula Solenoide Principal" 
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} 
              />
            </div>

            {/* Dispositivo / ESP32 Vinculado (OBRIGATÓRIO) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Dispositivo Vinculado <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.idDispositivo}
                onChange={(e) => setForm((f) => ({ ...f, idDispositivo: e.target.value }))}
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
              >
                <option value="">Selecione o ESP32 controlador...</option>
                {dispositivos.map((d) => {
                  const id = d.idDispositivo || d.id_dispositivo;
                  return (
                    <option key={id} value={id}>
                      {d.nome ? `${d.nome} (${d.identificador})` : d.identificador}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Localização*/}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Localização Física (Opcional)</label>
              <input 
                value={form.localizacao} 
                onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                placeholder="Ex: Jardim Central" 
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} 
              />
            </div>

            {/* Estado Inicial (OPCIONAL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Estado Inicial</label>
              <select 
                value={form.estadoAtual}
                onChange={(e) => setForm((f) => ({ ...f, estadoAtual: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
              >
                <option value="desligado">Desligado</option>
                <option value="ligado">Ligado</option>
              </select>
            </div>

            {/* Tópico MQTT de Comando (OBRIGATÓRIO / GERADO AUTOMATICAMENTE) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "span 2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                  Tópico MQTT de Comando <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: "#6366f1", background: "#e0e7ff", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                  Gerado automaticamente da placa
                </span>
              </div>

              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  value={form.mqttTopicoComando}
                  onChange={(e) => setForm((f) => ({ ...f, mqttTopicoComando: e.target.value }))}
                  placeholder="Ex: jci/1/1/A4:CF:12:8B:9C:01/atuadores/solenoide/set"
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
                <div>📌 <strong>Padrão de Comando:</strong> <code>[base_da_placa]/atuadores/[nome_atuador]/set</code></div>
                <div style={{ color: "#475569", marginTop: 2 }}>
                  • O backend dispara comandos neste canal e o ESP32 confirma a execução em <code>.../status</code>.
                </div>
              </div>
            </div>

            {/* Botões do Formulário */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
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
                {submitting ? "Processando..." : (editando ? "Salvar alterações" : "Cadastrar Atuador")}
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
          placeholder="Buscar atuador, placa ou tópico..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} 
        />
      </div>

      {/* Grid de Cards de Atuadores */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 24, height: 180, background: "white", borderRadius: 16 }}>
              <div className="skeleton" style={{ height: 14, width: "55%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "35%", marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 40, marginBottom: 10 }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white", borderRadius: 16 }}>
          <Sliders size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum atuador encontrado para "${search}".` : "Nenhum atuador cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
          {displayed.map((a) => {
            const id = a.idAtuador || a.id_atuador;
            const estado = (a.estadoAtual || a.estado_atual || "desligado").toLowerCase();
            const isLigado = estado === "ligado";
            const isAcionando = acionandoId === id;

            return (
              <div key={id} className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex", flexDirection: "column", gap: 14, borderRadius: 16, border: "1px solid rgba(79,70,229,0.08)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>

                {/* Top Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: isLigado ? "#ecfdf5" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: isLigado ? "#059669" : "#6b7280", flexShrink: 0, transition: "all 0.3s ease" }}>
                      <Power size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", lineHeight: 1.2 }}>
                        {a.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Cpu size={11} />
                        {a.dispositivo?.nome || a.dispositivo?.identificador || "Placa vinculada"}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  {podeGerenciar && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(a)} title="Editar"
                        style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#4f46e5", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(a)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Informações Centrais */}
                <div style={{ background: "#f9fafb", padding: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Estado Atual:</span>
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4, color: isLigado ? "#059669" : "#dc2626" }}>
                      {isLigado ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {isLigado ? "LIGADO" : "DESLIGADO"}
                    </span>
                  </div>

                  {a.localizacao && (
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: 4 }}>
                      <span style={{ color: "#6b7280" }}>Local:</span>
                      <span style={{ color: "#374151", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={11} color="#6b7280" />
                        {a.localizacao}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: 4 }}>
                    <span style={{ color: "#6b7280" }}>Tópico MQTT:</span>
                    <code style={{ fontSize: 11, color: "#4f46e5", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.mqttTopicoComando || a.mqtt_topico_comando}>
                      {a.mqttTopicoComando || a.mqtt_topico_comando}
                    </code>
                  </div>
                </div>

                {/* Botão de Controle Rápido */}
                {podeAcionar && (
                  <button
                    type="button"
                    disabled={isAcionando}
                    onClick={() => alternarEstadoAtuador(a)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: isLigado ? "#fee2e2" : "#dcfce7",
                      color: isLigado ? "#b91c1c" : "#15803d",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                    className="hover-scale"
                  >
                    <Activity size={15} className={isAcionando ? "animate-spin" : ""} />
                    {isAcionando ? "Enviando comando..." : isLigado ? "Desligar Atuador" : "Ligar Atuador"}
                  </button>
                )}
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
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover atuador?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome}</strong> será removido permanentemente.
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

export default AtuadoresPage;