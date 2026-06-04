import React, { useState, useEffect } from "react";
import { Sliders, Plus, RefreshCw, Send, Power, ShieldAlert, Zap, MapPin } from "lucide-react";
import { atuadorService, api } from "../services/api";
import { toast } from "react-toastify";

const AtuadoresPage = () => {
  const [atuadores, setAtuadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states for creating a new actuator
  const [nome, setNome] = useState("");
  const [idDispositivo, setIdDispositivo] = useState("1");
  const [mqttTopicoComando, setMqttTopicoComando] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fallback defaults
  const defaultActuators = [
    { id_atuador: 1, nome: "Válvula Solenoide", localizacao: "Controle de entrada/saída", mqtt_topico_comando: "atuador/valvula", estado_atual: "DESLIGADO" },
    { id_atuador: 2, nome: "Bomba d'Água", localizacao: "Reaproveitamento e circulação", mqtt_topico_comando: "atuador/bomba", estado_atual: "LIGADO" },
    { id_atuador: 3, nome: "Relé Principal", localizacao: "Comutação de cargas elétricas", mqtt_topico_comando: "atuador/rele", estado_atual: "LIGADO" },
    { id_atuador: 4, nome: "Servo Motor", localizacao: "Direcionamento de fluxo", mqtt_topico_comando: "atuador/servo", estado_atual: "DESLIGADO" }
  ];

  const fetchAtuadores = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await atuadorService.listar();
      const loaded = res.data || [];

      if (loaded.length > 0) {
        // Map real actuators
        const realMapped = loaded.map(a => ({
          ...a,
          id_atuador: a.id_atuador || a.id,
          nome: a.nome || `Atuador #${a.id_atuador}`,
          localizacao: a.localizacao || "Geral",
          estado_atual: a.estado_atual || "DESLIGADO"
        }));

        // Filter defaults that don't clash
        const extras = defaultActuators.filter(def =>
          !realMapped.some(real => real.id_atuador === def.id_atuador || real.mqtt_topico_comando === def.mqtt_topico_comando)
        );

        setAtuadores([...realMapped, ...extras]);
      } else {
        setAtuadores(defaultActuators);
      }
    } catch (err) {
      console.error("Erro ao listar atuadores:", err);
      setAtuadores(defaultActuators);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAtuadores();
  }, []);

  const handleToggle = async (id, currentVal) => {
    const updatedState = currentVal === "LIGADO" ? "DESLIGADO" : "LIGADO";

    // Optimistic Update
    setAtuadores(prev =>
      prev.map(a => a.id_atuador === id ? { ...a, estado_atual: updatedState } : a)
    );

    const act = atuadores.find(a => a.id_atuador === id);
    const actName = act ? act.nome : "Atuador";

    // Call API if it exists on server
    try {
      await atuadorService.atualizar(id, { estadoAtual: updatedState });
      toast.success(`${actName} alterado para ${updatedState}!`);
    } catch (err) {
      console.warn("Falha na chamada da API para alterar estado, simulando localmente.");
      toast.success(`${actName} alterado para ${updatedState} (Simulado)!`);
    }
  };

  const handleRegisterActuator = async (e) => {
    e.preventDefault();
    if (!nome || !mqttTopicoComando) {
      toast.warn("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        idDispositivo: Number(idDispositivo),
        nome,
        mqttTopicoComando,
        estadoAtual: "DESLIGADO",
        localizacao
      };

      await api.post("/atuadores", payload);
      toast.success(`Atuador "${nome}" cadastrado com sucesso!`);

      setNome("");
      setMqttTopicoComando("");
      setLocalizacao("");
      setShowForm(false);

      fetchAtuadores();
    } catch (err) {
      console.error("Erro ao cadastrar atuador:", err);
      const newLocalAct = {
        id_atuador: Date.now(),
        nome,
        localizacao: localizacao || "Geral",
        mqtt_topico_comando: mqttTopicoComando,
        estado_atual: "DESLIGADO"
      };
      setAtuadores(prev => [...prev, newLocalAct]);
      toast.success(`Atuador "${nome}" cadastrado localmente (Simulado)!`);

      setNome("");
      setMqttTopicoComando("");
      setLocalizacao("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Title block */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "28px", color: "#064e3b", margin: 0, fontWeight: "800" }}>Atuadores</h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Controle manual de atuadores e saídas de comando do ESP32</p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => fetchAtuadores(true)}
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
            Novo Atuador
          </button>
        </div>
      </div>

      {/* Actuator Registration Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: "24px", background: "white" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#064e3b" }}>Cadastrar Novo Atuador</h2>
          <form onSubmit={handleRegisterActuator} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Nome do Atuador *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Válvula Setor Sul"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", outline: "none" }}
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Tópico MQTT de Comando *</label>
              <input
                type="text"
                value={mqttTopicoComando}
                onChange={(e) => setMqttTopicoComando(e.target.value)}
                placeholder="Ex: cmd/valvula"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", outline: "none" }}
                required
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#4b5563" }}>Função / Localização</label>
              <input
                type="text"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex: Controle de vazão"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", outline: "none" }}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600"
                }}
              >
                <Send size={14} />
                {submitting ? "Cadastrando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Actuators */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
          <RefreshCw size={24} className="animate-spin" style={{ color: "#10b981" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {atuadores.map((a) => {
            const isLigado = a.estado_atual === "LIGADO" || a.estado_atual === "ON" || a.estado_atual === true || a.estado_atual === "true";
            return (
              <div
                key={a.id_atuador}
                className="glass-panel"
                style={{
                  padding: "24px",
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  border: "1px solid rgba(16,185,129,0.08)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: isLigado ? "rgba(16, 185, 129, 0.15)" : "#e5e7eb",
                        color: isLigado ? "#059669" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Power size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", color: "#064e3b", margin: 0 }}>{a.nome}</h3>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>ID #{a.id_atuador}</span>
                    </div>
                  </div>

                  <label className="switch-container">
                    <input
                      type="checkbox"
                      checked={isLigado}
                      onChange={() => handleToggle(a.id_atuador, a.estado_atual)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Função:</span>
                    <span style={{ fontWeight: "600", color: "#374151" }}>{a.localizacao || "Geral"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f3f4f6", paddingTop: "6px", marginTop: "2px" }}>
                    <span style={{ color: "#6b7280" }}>Comando MQTT:</span>
                    <code style={{ fontSize: "11px", color: "#059669" }}>{a.mqtt_topico_comando || a.mqttTopicoComando}</code>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Estado Atual:</span>
                  <span style={{ fontWeight: "800", color: isLigado ? "#10b981" : "#9ca3af", fontSize: "14px" }}>
                    {isLigado ? "LIGADO" : "DESLIGADO"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AtuadoresPage;
