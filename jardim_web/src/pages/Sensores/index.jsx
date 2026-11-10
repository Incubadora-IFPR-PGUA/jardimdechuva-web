import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Cpu,
  Search,
  Plus,
  RefreshCw,
  Send,
  X,
  Pencil,
  Trash2,
  Droplets,
  Sun,
  Wind,
  Gauge,
  Sliders,
  AlertTriangle,
  MapPin
} from "lucide-react";
import { api, sensorService, tipoSensorService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import s from "./Sensores.module.css";

const FORM_EMPTY = {
  nome: "",
  idDispositivo: "",
  idTipoSensor: "",
  mqttTopicoLeitura: "",
  localizacao: "",
  // Campos da tabela configuracoes_sensores:
  intervaloLeitura: 60,
  valorMin: "",
  valorMax: "",
  alertaAtivo: true
};

const SensoresPage = () => {
  const [sensores, setSensores]         = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [tiposSensores, setTiposSensores] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [editando, setEditando]         = useState(null);
  const [deletando, setDeletando]       = useState(null);
  const [form, setForm]                 = useState(FORM_EMPTY);

  const { can } = useAuth();
  const podeGerenciar = can("sensores.gerenciar");

  // ── Fetch de Sensores ──────────────────────────────────────────────────────
  const fetchSensores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await (sensorService?.listar ? sensorService.listar() : api.get("/sensores"));
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setSensores(data);
    } catch (err) {
      console.error("Erro ao carregar sensores:", err);
      toast.error("Não foi possível carregar os sensores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch de Dados Auxiliares (Dispositivos e Tipos de Sensores) ────────────
  const carregarAuxiliares = async () => {
    try {
      const [resDisp, resTipos] = await Promise.all([
        api.get("/dispositivos"),
        tipoSensorService?.listar ? tipoSensorService.listar() : api.get("/tipos-sensores")
      ]);

      const listaDisp = Array.isArray(resDisp.data) ? resDisp.data : (resDisp.data?.data || []);
      const listaTipos = Array.isArray(resTipos.data) ? resTipos.data : (resTipos.data?.data || []);

      setDispositivos(listaDisp);
      setTiposSensores(listaTipos);
    } catch (err) {
      console.error("Erro ao carregar dados auxiliares:", err);
    }
  };

  useEffect(() => {
    fetchSensores();
    carregarAuxiliares();
    const iv = setInterval(() => fetchSensores(true), 30000);
    return () => clearInterval(iv);
  }, [fetchSensores]);

  // ── Geração Automática do Tópico de Leitura baseando-se no ESP32 ───────────
  useEffect(() => {
    if (!editando && form.idDispositivo) {
      const disp = dispositivos.find(
        (d) => String(d.idDispositivo || d.id_dispositivo) === String(form.idDispositivo)
      );

      if (disp) {
        // Padrão consolidado: jci/[org]/[jardim]/[identificador]/leituras
        const base = (disp.mqttTopicoBase || disp.mqtt_topico_base || "").replace(/\/+$/, "");
        setForm((f) => ({
          ...f,
          mqttTopicoLeitura: base ? `${base}/leituras` : ""
        }));
      }
    }
  }, [form.idDispositivo, dispositivos, editando]);

  // ── Filtro / Busca ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return sensores;
    const q = search.toLowerCase();
    return sensores.filter(
      (sItem) =>
        (sItem.nome || "").toLowerCase().includes(q) ||
        (sItem.tipoSensor?.nome || sItem.tipo_sensor?.nome || "").toLowerCase().includes(q) ||
        (sItem.dispositivo?.identificador || "").toLowerCase().includes(q) ||
        (sItem.mqttTopicoLeitura || sItem.mqtt_topico_leitura || "").toLowerCase().includes(q)
    );
  }, [sensores, search]);

  // ── Auxiliar de Ícones por Tipo de Sensor ──────────────────────────────────
  const renderIconeTipo = (tipoNome) => {
    const t = (tipoNome || "").toLowerCase();
    if (t.includes("solo") || t.includes("umidade")) {
      return <Droplets size={18} color="#059669" />;
    }
    if (t.includes("ar") || t.includes("gas") || t.includes("co2")) {
      return <Wind size={18} color="#0284c7" />;
    }
    if (t.includes("luz") || t.includes("lux") || t.includes("solar")) {
      return <Sun size={18} color="#d97706" />;
    }
    return <Gauge size={18} color="#4f46e5" />;
  };

  // ── Abertura e Fechamento do Formulário ────────────────────────────────────
  const abrirCriacao = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  const abrirEdicao = (sensor) => {
    setEditando(sensor);
    const cfg = sensor.configuracao || sensor.configuracoes || {};
    setForm({
      nome: sensor.nome || "",
      idDispositivo: sensor.idDispositivo || sensor.id_dispositivo || "",
      idTipoSensor: sensor.idTipoSensor || sensor.id_tipo_sensor || "",
      mqttTopicoLeitura: sensor.mqttTopicoLeitura || sensor.mqtt_topico_leitura || "",
      localizacao: sensor.localizacao || "",
      intervaloLeitura: cfg.intervaloLeitura || cfg.intervalo_leitura || 60,
      valorMin: cfg.valorMin ?? cfg.valor_min ?? "",
      valorMax: cfg.valorMax ?? cfg.valor_max ?? "",
      alertaAtivo: cfg.alertaAtivo !== undefined ? Boolean(cfg.alertaAtivo) : (cfg.alerta_ativo !== undefined ? Boolean(cfg.alerta_ativo) : true)
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit Conjunto (sensores + configuracoes_sensores) ─────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.idDispositivo || !form.idTipoSensor || !form.mqttTopicoLeitura.trim()) {
      toast.warn("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);
    try {
      const parseNum = (v) => {
        if (v === "" || v === null || v === undefined) return null;
        const limpo = String(v).replace(",", ".").trim();
        const n = parseFloat(limpo);
        return isNaN(n) ? null : n;
      };

      const payload = {
        nome: form.nome.trim(),
        id_dispositivo: Number(form.idDispositivo),
        idDispositivo: Number(form.idDispositivo),
        id_tipo_sensor: Number(form.idTipoSensor),
        idTipoSensor: Number(form.idTipoSensor),
        mqtt_topico_leitura: form.mqttTopicoLeitura.trim(),
        mqttTopicoLeitura: form.mqttTopicoLeitura.trim(),
        localizacao: form.localizacao?.trim() || null,
        
        // Configurações operacionais:
        intervalo_leitura: parseInt(form.intervaloLeitura, 10) || 60,
        intervaloLeitura: parseInt(form.intervaloLeitura, 10) || 60,
        valor_min: parseNum(form.valorMin),
        valorMin: parseNum(form.valorMin),
        valor_max: parseNum(form.valorMax),
        valorMax: parseNum(form.valorMax),
        alerta_ativo: form.alertaAtivo ? 1 : 0,
        alertaAtivo: form.alertaAtivo ? 1 : 0,
      };

      if (editando) {
        const id = editando.idSensor || editando.id_sensor;
        await api.put(`/sensores/${id}`, payload);
        toast.success(`Sensor "${form.nome}" atualizado com sucesso!`);
      } else {
        await api.post("/sensores", payload);
        toast.success(`Sensor "${form.nome}" cadastrado com sucesso!`);
      }

      fecharForm();
      await fetchSensores(false);
    } catch (err) {
      console.error("❌ Erro ao salvar sensor:", err.response?.data || err);
      const erroMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      toast.error(erroMsg || "Erro ao salvar sensor no banco.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Exclusão ───────────────────────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      const id = deletando.idSensor || deletando.id_sensor;
      await api.delete(`/sensores/${id}`);
      toast.success(`Sensor removido com sucesso.`);
      setDeletando(null);
      await fetchSensores(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover o sensor.");
    }
  };

  // Obter unidade do tipo selecionado
  const tipoSelecionado = tiposSensores.find(
    (t) => String(t.idTipoSensor || t.id_tipo_sensor) === String(form.idTipoSensor)
  );
  const unidadeAtual = tipoSelecionado?.unidade || "não definida";

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.headingGroup}>
          <span className="badge" style={{ marginBottom: 4, background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, width: "fit-content" }}>
            {sensores.length} sensores ativos
          </span>
          <h1 className={s.title}>Sensores</h1>
          <p className={s.subtitle}>
            Monitore parâmetros ambientais e grandezas físicas captadas pelos dispositivos ESP32.
          </p>
        </div>

        <div className={s.actions}>
          <button onClick={() => fetchSensores(true)} className={`${s.btnOutline} hover-scale`}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          {podeGerenciar && (
            <button onClick={showForm ? fecharForm : abrirCriacao} className={`${s.btnPrimary} hover-scale`}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Cancelar" : "Novo Sensor"}
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Cadastro / Edição */}
      {showForm && (
        <div className={`glass-panel ${s.formPanel}`} style={{ borderRadius: 16, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 className={s.formTitle}>
              {editando ? `Editar Sensor — ${editando.nome}` : "Cadastrar Novo Sensor"}
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Campos com <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> são obrigatórios
            </span>
          </div>

          <form onSubmit={handleSubmit} className={s.form}>

            {/* Nome do Sensor */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>
                Nome do Sensor <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                className={s.fieldInput}
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Umidade do Solo"
                required
              />
            </div>

            {/* Dispositivo / ESP32 Vinculado */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>
                Dispositivo Vinculado <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className={s.fieldSelect}
                value={form.idDispositivo}
                onChange={(e) => setForm((f) => ({ ...f, idDispositivo: e.target.value }))}
                required
              >
                <option value="">Selecione a placa ESP32...</option>
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

            {/* Tipo de Sensor */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>
                Tipo de Sensor <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                className={s.fieldSelect}
                value={form.idTipoSensor}
                onChange={(e) => setForm((f) => ({ ...f, idTipoSensor: e.target.value }))}
                required
              >
                <option value="">Selecione o tipo do sensor...</option>
                {tiposSensores.map((t) => {
                  const id = t.idTipoSensor || t.id_tipo_sensor;
                  return (
                    <option key={id} value={id}>
                      {t.nome} {t.unidade ? `(${t.unidade})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Localização Física */}
            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Localização</label>
              <input
                className={s.fieldInput}
                value={form.localizacao}
                onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                placeholder="Ex: Jardim Central"
              />
            </div>

            {/* Tópico MQTT de Leitura */}
            <div className={s.fieldGroup} style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className={s.fieldLabel}>
                  Tópico MQTT de Leitura <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                  Gerado da raiz da placa
                </span>
              </div>
              <input
                className={s.fieldInput}
                value={form.mqttTopicoLeitura}
                onChange={(e) => setForm((f) => ({ ...f, mqttTopicoLeitura: e.target.value }))}
                placeholder="Ex: jci/1/1/esp32-canteiro-01/leituras"
                required
                style={{ fontFamily: "monospace", backgroundColor: "#f8fafc", fontWeight: 600 }}
              />
            </div>

            {/* ── Parâmetros Operacionais e Limites de Alerta ── */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sliders size={15} color="#059669" /> Parâmetros Operacionais e Limites de Alerta
                </h4>
              </div>

              {/* Box de Orientação de Unidade de Medida */}
              <div style={{
                background: "#f0fdf4",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderLeft: "4px solid #059669",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: 12,
                color: "#166534",
                lineHeight: 1.5
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 2 }}>
                  <AlertTriangle size={15} color="#059669" /> Atenção à Unidade de Medida
                </div>
                <p style={{ margin: 0 }}>
                  Antes de configurar os limites, verifique a unidade de leitura do modelo físico (ex: <strong>%</strong> para solo, <strong>lux</strong> para luminosidade, <strong>µg/m³</strong> ou índice para qualidade do ar). Os alertas serão disparados com base nesses mesmos valores numéricos.
                </p>
                {form.idTipoSensor && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(16, 185, 129, 0.3)", fontSize: 11 }}>
                    📌 Unidade padrão para <strong>{tipoSelecionado?.nome}</strong>: <code style={{ background: "#dcfce7", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{unidadeAtual}</code>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>Intervalo de Envio (segundos)</label>
                  <input
                    type="number"
                    className={s.fieldInput}
                    value={form.intervaloLeitura}
                    onChange={(e) => setForm((f) => ({ ...f, intervaloLeitura: e.target.value }))}
                    placeholder="60"
                  />
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>
                    Valor Mínimo {tipoSelecionado?.unidade ? `(${tipoSelecionado.unidade})` : ""}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={s.fieldInput}
                    value={form.valorMin}
                    onChange={(e) => setForm((f) => ({ ...f, valorMin: e.target.value }))}
                    placeholder={tipoSelecionado?.unidade ? `Ex: 20 ${tipoSelecionado.unidade}` : "Ex: 20.00"}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>
                    Valor Máximo {tipoSelecionado?.unidade ? `(${tipoSelecionado.unidade})` : ""}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={s.fieldInput}
                    value={form.valorMax}
                    onChange={(e) => setForm((f) => ({ ...f, valorMax: e.target.value }))}
                    placeholder={tipoSelecionado?.unidade ? `Ex: 85 ${tipoSelecionado.unidade}` : "Ex: 85.00"}
                  />
                </div>

                <div className={s.fieldGroup} style={{ justifyContent: "center", paddingTop: 18 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#334155" }}>
                    <input
                      type="checkbox"
                      checked={form.alertaAtivo}
                      onChange={(e) => setForm((f) => ({ ...f, alertaAtivo: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: "#059669" }}
                    />
                    Disparar alerta fora dos limites
                  </label>
                </div>
              </div>
            </div>

            {/* Ações do Formulário */}
            <div className={s.formActions}>
              <button type="button" onClick={fecharForm} className={s.btnCancel}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className={s.btnSubmit}>
                <Send size={13} />
                {submitting ? "Processando..." : (editando ? "Salvar alterações" : "Cadastrar Sensor")}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Barra de Filtro e Busca */}
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <Search size={15} className={s.searchIcon} />
          <input
            className={s.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar sensor, tipo ou placa..."
          />
        </div>
      </div>

      {/* Grid de Cards dos Sensores */}
      {loading ? (
        <div className={s.sensorGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`glass-panel ${s.sensorCard}`} style={{ height: 160, borderRadius: 16 }}>
              <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 36, width: "40%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 10, width: "70%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className={`glass-panel ${s.emptyState}`} style={{ borderRadius: 16 }}>
          <Gauge size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p className={s.emptyText}>
            {search ? `Nenhum sensor encontrado para "${search}".` : "Nenhum sensor cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className={s.sensorGrid}>
          {displayed.map((sensor) => {
            const id = sensor.idSensor || sensor.id_sensor;
            const tipoNome = sensor.tipoSensor?.nome || sensor.tipo_sensor?.nome || "Sensor";
            const unidade = sensor.tipoSensor?.unidade || sensor.tipo_sensor?.unidade || "";
            const cfg = sensor.configuracao || sensor.configuracoes || {};
            const valorAtual = sensor.valorAtual ?? sensor.valor_atual;

            return (
              <div key={id} className={`glass-panel ${s.sensorCard} hover-scale`} style={{ borderRadius: 16, background: "white" }}>

                <div className={s.sensorCardTop}>
                  <div className={s.sensorIconRow}>
                    <div className={s.sensorIconBox} style={{ background: "#f0fdf4" }}>
                      {renderIconeTipo(tipoNome)}
                    </div>
                    <div>
                      <div className={s.sensorName}>{sensor.nome}</div>
                      <div className={s.sensorType}>{tipoNome}</div>
                    </div>
                  </div>

                  {podeGerenciar && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(sensor)} title="Editar"
                        style={{ background: "none", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#059669", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(sensor)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Exibição da Medição Atual */}
                <div className={s.sensorValue}>
                  <span className={s.sensorValueNum}>
                    {valorAtual !== null && valorAtual !== undefined ? Number(valorAtual).toFixed(1) : "—"}
                  </span>
                  {unidade && <span className={s.sensorUnit}>{unidade}</span>}
                </div>

                {/* Informações Centrais */}
                <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, fontSize: 11, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Cpu size={11} /> Placa:
                    </span>
                    <strong style={{ color: "#334155" }}>
                      {sensor.dispositivo?.nome || sensor.dispositivo?.identificador || "Vinculada"}
                    </strong>
                  </div>

                  {sensor.localizacao && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <MapPin size={11} /> Local:
                      </span>
                      <strong style={{ color: "#334155" }}>{sensor.localizacao}</strong>
                    </div>
                  )}

                  {(cfg.valor_min !== undefined || cfg.valorMin !== undefined) && (
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <AlertTriangle size={11} color="#d97706" /> Limites:
                      </span>
                      <span>
                        {cfg.valor_min ?? cfg.valorMin ?? 0} {unidade} a {cfg.valor_max ?? cfg.valorMax ?? 100} {unidade}
                      </span>
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
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover sensor?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome}</strong> e suas configurações serão removidos.
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

export default SensoresPage;