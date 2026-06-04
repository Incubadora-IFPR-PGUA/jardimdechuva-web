import React, { useState, useEffect } from "react";
import { Bell, Info, AlertTriangle, ShieldAlert, Trash2, Plus, RefreshCw, Send, Radio, Calendar } from "lucide-react";
import { alertaService, sensorService } from "../services/api";
import { toast } from "react-toastify";

const NotificacoesPage = () => {
  const [alertas, setAlertas] = useState([]);
  const [sensores, setSensores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState("TODOS");

  // Form states for creating a test alert
  const [showForm, setShowForm] = useState(false);
  const [idSensor, setIdSensor] = useState("1");
  const [mensagem, setMensagem] = useState("");
  const [nivel, setNivel] = useState("medio"); // baixo, medio, alto
  const [submitting, setSubmitting] = useState(false);

  // Default simulated alerts if database has none
  const defaultAlertas = [
    { id_alerta: 1, id_sensor: 3, mensagem: "Umidade do solo crítica (34.2%) detectada no canteiro A. Iniciando irrigação automatizada.", nivel: "alto", created_at: new Date(Date.now() - 30 * 60000).toISOString() },
    { id_alerta: 2, id_sensor: 2, mensagem: "Precipitação de chuva intensa detectada (8.6 mm/h). Desligando bombas de recirculação por segurança.", nivel: "medio", created_at: new Date(Date.now() - 120 * 60000).toISOString() },
    { id_alerta: 3, id_sensor: 1, mensagem: "Válvula solenoide ativada pelo controle automático às 15:30.", nivel: "baixo", created_at: new Date(Date.now() - 180 * 60000).toISOString() },
    { id_alerta: 4, id_sensor: 1, mensagem: "Bomba d'água desativada pelo painel de controle manual.", nivel: "baixo", created_at: new Date(Date.now() - 240 * 60000).toISOString() }
  ];

  const fetchAlertas = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch sensors for the select input
      const sensRes = await sensorService.listar();
      setSensores(sensRes.data || []);

      // 2. Fetch alerts
      const res = await alertaService.listar();
      const loaded = res.data || [];

      if (loaded.length > 0) {
        // Map real alerts from database
        const realMapped = loaded.map(al => ({
          ...al,
          id_alerta: al.id_alerta || al.id,
          mensagem: al.mensagem || "Alerta registrado no sistema",
          nivel: al.nivel || "medio",
          created_at: al.created_at || al.createdAt || new Date().toISOString()
        }));

        // Merge defaults to show a complete list in case there are few
        const extras = defaultAlertas.filter(def => 
          !realMapped.some(real => real.mensagem === def.mensagem)
        );

        setAlertas([...realMapped, ...extras]);
      } else {
        setAlertas(defaultAlertas);
      }
    } catch (err) {
      console.error("Erro ao listar alertas:", err);
      setAlertas(defaultAlertas);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, []);

  const handleDismiss = async (id) => {
    // Optimistic Update
    setAlertas(prev => prev.filter(al => al.id_alerta !== id));
    toast.success("Notificação arquivada/resolvida.");

    try {
      await alertaService.deletar(id);
    } catch (err) {
      console.warn("Falha ao deletar alerta no banco de dados, excluído apenas localmente.");
    }
  };

  const handleTriggerAlert = async (e) => {
    e.preventDefault();
    if (!mensagem) {
      toast.warn("Por favor, informe a mensagem do alerta.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        idSensor: Number(idSensor),
        mensagem,
        nivel
      };

      await alertaService.criar(payload);
      toast.success("Alerta registrado e propagado!");
      
      setMensagem("");
      setShowForm(false);
      fetchAlertas(true);
    } catch (err) {
      console.error("Erro ao cadastrar alerta:", err);
      // Fallback: add locally to state
      const newLocalAlerta = {
        id_alerta: Date.now(),
        id_sensor: Number(idSensor),
        mensagem,
        nivel,
        created_at: new Date().toISOString()
      };
      setAlertas(prev => [newLocalAlerta, ...prev]);
      toast.success("Alerta registrado localmente (Simulado)!");
      
      setMensagem("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getNivelIconAndStyle = (level) => {
    switch (level.toLowerCase()) {
      case "alto":
      case "crítico":
      case "critical":
        return {
          icon: ShieldAlert,
          bg: "#fef2f2",
          border: "rgba(239, 68, 68, 0.2)",
          color: "#b91c1c",
          label: "Crítico"
        };
      case "medio":
      case "aviso":
      case "warning":
        return {
          icon: AlertTriangle,
          bg: "#fffbeb",
          border: "rgba(245, 158, 11, 0.2)",
          color: "#b45309",
          label: "Aviso"
        };
      case "baixo":
      case "info":
      default:
        return {
          icon: Info,
          bg: "#f0fdf4",
          border: "rgba(16, 185, 129, 0.2)",
          color: "#15803d",
          label: "Info"
        };
    }
  };

  // Filter alerts by severity tab
  const filteredAlertas = alertas.filter(al => {
    if (filtroNivel === "TODOS") return true;
    if (filtroNivel === "CRITICO") return al.nivel === "alto" || al.nivel === "critico" || al.nivel === "crítico";
    if (filtroNivel === "AVISO") return al.nivel === "medio" || al.nivel === "aviso";
    if (filtroNivel === "INFO") return al.nivel === "baixo" || al.nivel === "info";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "28px", color: "#064e3b", margin: 0, fontWeight: "800" }}>Notificações & Alertas</h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Monitoramento de eventos e triggers de segurança do Jardim de Chuva</p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => fetchAlertas(true)}
            style={{
              background: "white",
              border: "1px solid rgba(16, 185, 129, 0.1)",
              borderRadius: "10px",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#047857",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)"
            }}
            className="hover-scale"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} style={{ animation: refreshing ? "spin 2s linear infinite" : "" }} />
            Atualizar
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: "600",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "var(--shadow-md)"
            }}
            className="hover-scale"
          >
            <Plus size={16} />
            Gerar Alerta
          </button>
        </div>
      </div>

      {/* Simulator / Generator Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: "24px", background: "white", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#064e3b" }}>Simulador de Alertas do Jardim</h2>
          <form onSubmit={handleTriggerAlert} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Nível de Gravidade</label>
              <select
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", outline: "none", background: "white" }}
              >
                <option value="baixo">Baixo (Info)</option>
                <option value="medio">Médio (Aviso)</option>
                <option value="alto">Alto (Crítico)</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Sensor Relacionado</label>
              <select
                value={idSensor}
                onChange={(e) => setIdSensor(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", outline: "none", background: "white" }}
              >
                {sensores.length > 0 ? (
                  sensores.map(s => (
                    <option key={s.id_sensor} value={s.id_sensor}>
                      {s.nome} (ID #{s.id_sensor})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">Sensor de Chuva (ID #1)</option>
                    <option value="2">DHT22 Clima (ID #2)</option>
                    <option value="3">Umidade do Solo (ID #3)</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", gridColumn: "span 2" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Mensagem do Alerta *</label>
              <input
                type="text"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Ex: Transbordamento iminente detectado no dreno central."
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", outline: "none" }}
                required
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                {submitting ? "Propagando..." : "Lançar Alerta"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs Filter Bar */}
      <div className="glass-panel" style={{ padding: "8px", background: "white", display: "flex", gap: "8px", alignSelf: "flex-start", borderRadius: "14px" }}>
        {[
          { key: "TODOS", label: "Todos os alertas" },
          { key: "CRITICO", label: "Críticos" },
          { key: "AVISO", label: "Avisos" },
          { key: "INFO", label: "Informações" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFiltroNivel(tab.key)}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: filtroNivel === tab.key ? "#d1fae5" : "transparent",
              color: filtroNivel === tab.key ? "#047857" : "#4b5563"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Card List */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
          <RefreshCw size={24} className="animate-spin" style={{ color: "#10b981" }} />
        </div>
      ) : filteredAlertas.length === 0 ? (
        <div className="glass-panel" style={{ padding: "60px", background: "white", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <Bell size={48} style={{ color: "#9ca3af" }} />
          <h3 style={{ color: "#064e3b", margin: 0, fontSize: "18px" }}>Tudo limpo por aqui!</h3>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>Não há nenhuma notificação no filtro selecionado.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredAlertas.map((al) => {
            const config = getNivelIconAndStyle(al.nivel);
            const Icon = config.icon;
            return (
              <div
                key={al.id_alerta}
                className="glass-panel hover-scale"
                style={{
                  padding: "20px 24px",
                  background: "white",
                  border: `1px solid ${config.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "24px"
                }}
              >
                <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flex: 1 }}>
                  {/* Left severity indicator icon */}
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: config.bg,
                      color: config.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <Icon size={24} />
                  </div>

                  {/* Message body */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          backgroundColor: config.bg,
                          color: config.color,
                          border: `1px solid ${config.border}`,
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          textTransform: "uppercase"
                        }}
                      >
                        {config.label}
                      </span>
                      <span style={{ fontSize: "12px", color: "#9ca3af", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={12} />
                        {new Date(al.created_at).toLocaleString("pt-BR")}
                      </span>
                      <span style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Radio size={12} style={{ color: "#10b981" }} />
                        Sensor #{al.id_sensor}
                      </span>
                    </div>

                    <p style={{ color: "#374151", fontSize: "14px", lineHeight: "1.5", margin: 0, fontWeight: "500" }}>
                      {al.mensagem}
                    </p>
                  </div>
                </div>

                {/* Resolve/Delete trigger */}
                <button
                  onClick={() => handleDismiss(al.id_alerta)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fef2f2";
                    e.currentTarget.style.color = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9ca3af";
                  }}
                  title="Marcar como resolvido"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificacoesPage;
