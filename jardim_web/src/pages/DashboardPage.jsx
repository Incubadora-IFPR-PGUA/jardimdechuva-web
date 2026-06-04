import React, { useState, useEffect, useCallback } from "react";
import {
  Droplet, CloudRain, Waves, Sun, Thermometer, Wind,
  FlaskConical, Gauge, Droplets, ScanLine, Cpu,
  Power, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, Info, Zap, Sliders, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { toast } from "react-toastify";
import {
  sensorService, atuadorService,
  leituraService, alertaService
} from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSensorConfig = (sensor) => {
  const tipo = (
    sensor.tipoSensor?.nome || sensor.nome || ""
  ).toLowerCase();

  let Icon = Cpu;
  let unit = "";
  let maxValue = 100;
  let color = "#10b981";
  let progressColor = "green";

  if (tipo.includes("solo") || tipo.includes("capacitivo") ||
      (tipo.includes("umidade") && !tipo.includes("ar"))) {
    Icon = Droplet; unit = "%"; maxValue = 100;
  } else if (tipo.includes("chuva") || tipo.includes("pluv")) {
    Icon = CloudRain; unit = "mm/h"; maxValue = 50; color = "#3b82f6"; progressColor = "blue";
  } else if (tipo.includes("nível") || tipo.includes("nivel") || tipo.includes("ultrass")) {
    Icon = Waves; unit = "%"; maxValue = 100;
  } else if (tipo.includes("luminosidade") || tipo.includes("luz") || tipo.includes("bh17")) {
    Icon = Sun; unit = "klx"; maxValue = 100; color = "#f59e0b"; progressColor = "orange";
  } else if (tipo.includes("temperatura") || tipo.includes("dht") || tipo.includes("bme")) {
    Icon = Thermometer; unit = "°C"; maxValue = 50; color = "#f97316"; progressColor = "orange";
  } else if (tipo.includes("ar") || tipo.includes("umidade")) {
    Icon = Wind; unit = "%"; maxValue = 100;
  } else if (tipo.includes("ph") || tipo.includes("solo")) {
    Icon = FlaskConical; unit = "pH"; maxValue = 14; color = "#8b5cf6"; progressColor = "purple";
  } else if (tipo.includes("vazão") || tipo.includes("vazao") || tipo.includes("fluxo")) {
    Icon = Gauge; unit = "L/min"; maxValue = 20; color = "#06b6d4"; progressColor = "blue";
  } else if (tipo.includes("qualidade") || tipo.includes("turbidez")) {
    Icon = Droplets; unit = "NTU"; maxValue = 100;
  } else if (tipo.includes("presença") || tipo.includes("presenca") ||
             tipo.includes("rfid") || tipo.includes("acesso")) {
    Icon = ScanLine; unit = ""; maxValue = 1; color = "#7c3aed"; progressColor = "purple";
  }

  // Badge from estadoAtual
  const estado = (sensor.estadoAtual || "normal").toLowerCase().trim();
  const badgeMap = {
    ideal: "badge-ideal", normal: "badge-normal", ótima: "badge-otima",
    otima: "badge-otima", leve: "badge-leve", baixo: "badge-baixo",
    alto: "badge-alto", saturado: "badge-warning", fora: "badge-fora",
    chovendo: "badge-info", seco: "badge-success", diurno: "badge-diurno",
    noturno: "badge-noturno", estavel: "badge-estavel", estável: "badge-estavel",
    ligado: "badge-success", desligado: "badge-gray", online: "badge-success",
    offline: "badge-danger",
  };
  const badgeClass = badgeMap[estado] || "badge-success";
  const badgeLabel = estado.charAt(0).toUpperCase() + estado.slice(1);

  const val = parseFloat(sensor.valorAtual) || 0;
  const progress = Math.min(100, Math.max(0, (val / maxValue) * 100));

  return { Icon, unit, color, progressColor, badgeClass, badgeLabel, progress };
};

const getAlertIcon = (nivel) => {
  const n = (nivel || "").toLowerCase();
  if (n === "critico" || n === "crítico" || n === "error")
    return <XCircle size={16} color="#ef4444" />;
  if (n === "aviso" || n === "warning")
    return <AlertTriangle size={16} color="#f59e0b" />;
  return <CheckCircle size={16} color="#10b981" />;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "agora atrás";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
};

// Gera dados de solo simulados se API não tiver sensor específico
const generateSoilData = () => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now - (23 - i) * 3600000).getHours();
    const v = Math.round(58 + 14 * Math.sin((h - 14) * Math.PI / 12) + (Math.random() * 4 - 2));
    return { name: `${h}h`, umidade: Math.max(30, Math.min(95, v)) };
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const [sensores, setSensores] = useState([]);
  const [atuadores, setAtuadores] = useState([]);
  const [leiturasChuva, setLeiturasChuva] = useState([]);
  const [leiturasClima, setLeiturasClima] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState("solo");
  const [soilData] = useState(generateSoilData);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const results = await Promise.allSettled([
      sensorService.listar(),
      atuadorService.listar(),
      leituraService.listarChuva({ limit: 24 }),
      leituraService.listarClima({ limit: 24 }),
      alertaService.listar({ limit: 10 }),
    ]);

    const [sensRes, atRes, chuvaRes, climaRes, alertRes] = results;

    if (sensRes.status === "fulfilled") setSensores(sensRes.value.data || []);
    if (chuvaRes.status === "fulfilled") setLeiturasChuva(chuvaRes.value.data || []);
    if (climaRes.status === "fulfilled") setLeiturasClima(climaRes.value.data || []);
    if (alertRes.status === "fulfilled") setAlertas(alertRes.value.data || []);

    if (atRes.status === "fulfilled" && (atRes.value.data || []).length > 0) {
      setAtuadores(
        atRes.value.data.map((a) => ({
          id: a.idAtuador || a.id_atuador,
          nome: a.nome || `Atuador #${a.idAtuador}`,
          descricao: a.localizacao || a.mqttTopicoComando || "Atuador registrado",
          topico: a.mqttTopicoComando || a.mqtt_topico_comando,
          estado: ["LIGADO","ON","true",true].includes(a.estadoAtual ?? a.estado_atual),
          modo: a.mqttTopicoComando ? "Automático" : "Manual",
        }))
      );
    } else if (atRes.status === "rejected") {
      // Defaults
      setAtuadores([
        { id: 1, nome: "Válvula Solenoide", descricao: "Controle de entrada/saída", modo: "Automático", estado: false },
        { id: 2, nome: "Bomba d'Água",      descricao: "Reaproveitamento e circulação", modo: "Automático", estado: true },
        { id: 3, nome: "Relé Principal",    descricao: "Comutação de cargas elétricas", modo: "Manual", estado: true },
        { id: 4, nome: "Servo Motor",       descricao: "Direcionamento de fluxo", modo: "Automático", estado: false },
        { id: 5, nome: "LED / Display",     descricao: "Status visual", modo: "Manual", estado: true },
      ]);
    }

    const anyFailed = results.some((r) => r.status === "rejected");
    setError(anyFailed ? "Alguns dados não puderam ser carregados. Exibindo valores em cache." : null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(() => loadData(true), 15000);
    return () => clearInterval(iv);
  }, [loadData]);

  // Toggle atuador
  const handleToggle = async (id, current) => {
    const next = !current;
    setAtuadores((prev) => prev.map((a) => a.id === id ? { ...a, estado: next } : a));
    const act = atuadores.find((a) => a.id === id);
    const label = act?.nome || "Atuador";
    try {
      await atuadorService.atualizar(id, { estadoAtual: next ? "LIGADO" : "DESLIGADO" });
      toast.success(`${label} → ${next ? "LIGADO" : "DESLIGADO"}`);
    } catch {
      setAtuadores((prev) => prev.map((a) => a.id === id ? { ...a, estado: current } : a));
      toast.error(`Falha ao alterar ${label}`);
    }
  };

  // Chart data
  const rainChartData = [...leiturasChuva].reverse().map((l) => ({
    name: new Date(l.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    chuva: l.valor ?? 0,
  }));

  const climaChartData = [...leiturasClima].reverse().map((l) => ({
    name: new Date(l.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    umidade: l.humidity ?? 0,
    temperatura: l.temperature ?? 0,
  }));

  // KPIs do banner
  const totalSensores = sensores.length;
  const atoresAtivos  = atuadores.filter((a) => a.estado).length;
  const eficiencia    = totalSensores > 0
    ? Math.round(90 + (atoresAtivos / Math.max(atuadores.length, 1)) * 6)
    : 94;

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:"flex", flex:1, alignItems:"center", justifyContent:"center",
                    minHeight:"60vh", flexDirection:"column", gap:16 }}>
        <RefreshCw size={36} className="animate-spin" style={{ color:"#10b981" }} />
        <p style={{ color:"#064e3b", fontWeight:600 }}>Carregando painel de controle...</p>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }} className="animate-fade-up">

      {/* ── Banner ── */}
      <div className="glass-panel" style={{
        padding:"28px 32px", display:"flex", justifyContent:"space-between",
        alignItems:"center", flexWrap:"wrap", gap:20,
        background:"linear-gradient(135deg, rgba(255,255,255,0.97), rgba(209,250,229,0.25))",
        border:"1px solid rgba(16,185,129,0.12)"
      }}>
        <div style={{ flex:"1 1 460px" }}>
          <span className="badge badge-success" style={{ marginBottom:10, display:"inline-flex" }}>
            <span className="status-dot online" style={{ width:6, height:6 }} />
            Sistema operando em modo automático
          </span>
          <h1 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.5px", margin:"8px 0 10px" }}>
            Gestão hídrica urbana inteligente
          </h1>
          <p style={{ color:"#4b5563", fontSize:14, lineHeight:1.65, maxWidth:620 }}>
            Monitoramento em tempo real de sensores ambientais e atuadores hidráulicos
            para drenagem sustentável e otimização do uso da água.
          </p>
        </div>

        {/* KPI cards */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {[
            { icon:<Droplet size={18}/>, val:`${eficiencia}%`, label:"EFICIÊNCIA" },
            { icon:<Cpu size={18}/>, val:`${totalSensores}/${totalSensores}`, label:"SENSORES" },
            { icon:<Sliders size={18}/>, val:atoresAtivos, label:"ATUADORES" },
          ].map(({ icon, val, label }) => (
            <div key={label} className="glass-panel" style={{
              padding:"14px 18px", display:"flex", flexDirection:"column",
              alignItems:"center", minWidth:90, background:"white",
              border:"1px solid rgba(16,185,129,0.08)"
            }}>
              <span style={{ color:"#10b981", marginBottom:6 }}>{icon}</span>
              <span style={{ fontSize:22, fontWeight:800, color:"#064e3b", fontFamily:"var(--font-heading)" }}>{val}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"#9ca3af", letterSpacing:"0.08em" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding:"11px 16px", background:"#fffbeb", border:"1px solid #fef3c7",
          borderRadius:12, color:"#b45309", display:"flex", alignItems:"center",
          gap:10, fontSize:13
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Sensor Cards ── */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <h2 style={{ fontSize:19, margin:0 }}>Sensores ambientais</h2>
            <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Leituras em tempo real</p>
          </div>
          <button
            onClick={() => loadData(true)}
            style={{
              background:"white", border:"1px solid rgba(16,185,129,0.12)",
              borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:600,
              color:"#047857", display:"flex", alignItems:"center", gap:6,
              cursor:"pointer", boxShadow:"var(--shadow-sm)"
            }}
            className="hover-scale"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {sensores.length === 0 ? (
          /* Skeleton placeholders */
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(210px,1fr))", gap:14 }}>
            {Array.from({length:8}).map((_,i) => (
              <div key={i} className="glass-panel" style={{ padding:20, height:120 }}>
                <div className="skeleton" style={{ height:14, width:"60%", marginBottom:10 }} />
                <div className="skeleton" style={{ height:32, width:"40%", marginBottom:10 }} />
                <div className="skeleton" style={{ height:4 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(210px,1fr))", gap:14 }}>
            {sensores.map((s) => {
              const { Icon, unit, color, progressColor, badgeClass, badgeLabel, progress } = getSensorConfig(s);
              const val = s.valorAtual != null ? parseFloat(s.valorAtual) : null;
              return (
                <div key={s.idSensor || s.id_sensor} className="glass-panel hover-scale"
                  style={{ padding:"18px 20px", background:"white", display:"flex",
                           flexDirection:"column", gap:13, border:"1px solid rgba(16,185,129,0.07)" }}>
                  {/* Top row */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ display:"flex", flexDirection:"column" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                        <div style={{
                          width:30, height:30, borderRadius:8,
                          background:`${color}18`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          color
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#064e3b", lineHeight:1.2 }}>
                            {s.nome || "Sensor"}
                          </div>
                          <div style={{ fontSize:10, color:"#9ca3af" }}>
                            {s.tipoSensor?.nome || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${badgeClass}`} style={{ fontSize:10 }}>
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Value */}
                  <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                    <span style={{ fontSize:30, fontWeight:800, color:"#064e3b", fontFamily:"var(--font-heading)", lineHeight:1 }}>
                      {val != null ? val.toLocaleString("pt-BR", { maximumFractionDigits:1 }) : "—"}
                    </span>
                    {unit && <span style={{ fontSize:14, fontWeight:600, color:"#6b7280" }}>{unit}</span>}
                  </div>

                  {/* Progress */}
                  <div className="sensor-progress">
                    <div className={`sensor-progress-fill ${progressColor}`}
                      style={{ width:`${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Chart + Actuators ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }} className="dashboard-grid">

        {/* Chart */}
        <div className="glass-panel" style={{ padding:24, background:"white" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                        flexWrap:"wrap", gap:12, marginBottom:20 }}>
            <div>
              <h2 style={{ fontSize:16, margin:0 }}>Tendências ambientais (24h)</h2>
              <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Umidade do solo, chuva e temperatura</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span className="badge badge-success" style={{ fontSize:10 }}>
                <Activity size={10} /> Tempo real
              </span>
              {/* Tabs */}
              <div className="filter-tabs" style={{ padding:3 }}>
                {[["solo","Umidade do solo"],["chuva","Chuva"],["clima","Temperatura"]].map(([k,l]) => (
                  <button key={k} onClick={() => setActiveChartTab(k)}
                    className={`filter-tab ${activeChartTab === k ? "active" : ""}`}
                    style={{ padding:"6px 12px", fontSize:12 }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width:"100%", height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === "solo" ? (
                <AreaChart data={soilData} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                  <defs>
                    <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} />
                  <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} domain={[20,100]} />
                  <Tooltip contentStyle={{ background:"white", borderRadius:12,
                    border:"1px solid rgba(16,185,129,0.15)", boxShadow:"var(--shadow-md)",
                    fontSize:12 }} labelStyle={{ fontWeight:700, color:"#064e3b" }} />
                  <Area type="monotone" dataKey="umidade" name="Umidade (%)"
                    stroke="#10b981" strokeWidth={2.5} fill="url(#soilGrad)" />
                </AreaChart>
              ) : activeChartTab === "chuva" ? (
                rainChartData.length > 0 ? (
                  <AreaChart data={rainChartData} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background:"white", borderRadius:12,
                      border:"1px solid rgba(59,130,246,0.15)", boxShadow:"var(--shadow-md)",
                      fontSize:12 }} />
                    <Area type="stepAfter" dataKey="chuva" name="Chuva (mm/h)"
                      stroke="#3b82f6" strokeWidth={2.5} fill="url(#rainGrad)" />
                  </AreaChart>
                ) : (
                  <div style={{ display:"flex", height:"100%", alignItems:"center",
                                justifyContent:"center", color:"#9ca3af", fontSize:13 }}>
                    Sem leituras de chuva recentes.
                  </div>
                )
              ) : (
                climaChartData.length > 0 ? (
                  <AreaChart data={climaChartData} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background:"white", borderRadius:12,
                      border:"1px solid rgba(16,185,129,0.15)", boxShadow:"var(--shadow-md)",
                      fontSize:12 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize:11, paddingTop:8 }} />
                    <Area type="monotone" dataKey="umidade" name="Umidade (%)"
                      stroke="#10b981" strokeWidth={2.5} fill="url(#humGrad)" />
                    <Area type="monotone" dataKey="temperatura" name="Temperatura (°C)"
                      stroke="#f59e0b" strokeWidth={2} fill="url(#tempGrad)" />
                  </AreaChart>
                ) : (
                  <div style={{ display:"flex", height:"100%", alignItems:"center",
                                justifyContent:"center", color:"#9ca3af", fontSize:13 }}>
                    Sem leituras de clima recentes.
                  </div>
                )
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actuators panel */}
        <div className="glass-panel" style={{ padding:22, background:"white",
                                              display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h2 style={{ fontSize:16, margin:0 }}>Atuadores</h2>
              <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Controle automático e manual</p>
            </div>
            <Sliders size={16} color="#9ca3af" />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {atuadores.map((a) => (
              <div key={a.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", borderRadius:14,
                border:`1px solid ${a.estado ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.05)"}`,
                background: a.estado ? "rgba(16,185,129,0.04)" : "#fafafa",
                transition:"all 0.2s"
              }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, display:"flex",
                    alignItems:"center", justifyContent:"center",
                    background: a.estado ? "rgba(16,185,129,0.15)" : "#e5e7eb",
                    color: a.estado ? "#059669" : "#9ca3af",
                    transition:"all 0.2s"
                  }}>
                    <Power size={16} />
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#064e3b" }}>{a.nome}</span>
                      <span className={`badge ${a.modo === "Automático" ? "badge-success" : "badge-warning"}`}
                            style={{ fontSize:9, padding:"2px 6px" }}>
                        {a.modo}
                      </span>
                    </div>
                    <p style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>{a.descricao}</p>
                  </div>
                </div>
                <label className="switch-container">
                  <input type="checkbox" checked={a.estado}
                         onChange={() => handleToggle(a.id, a.estado)} />
                  <span className="slider" />
                </label>
              </div>
            ))}
          </div>

          <div style={{
            marginTop:"auto", padding:"14px", borderRadius:12,
            background:"linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.12))",
            border:"1px solid rgba(16,185,129,0.1)", display:"flex", gap:10
          }}>
            <Info size={18} style={{ color:"#059669", flexShrink:0, marginTop:1 }} />
            <div>
              <span style={{ fontSize:12, fontWeight:700, color:"#064e3b" }}>Automação ativa</span>
              <p style={{ fontSize:11, color:"#4b5563", marginTop:3, lineHeight:1.5 }}>
                Irrigação iniciará automaticamente se a umidade do solo cair abaixo de 40% durante o período noturno.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerts / Events ── */}
      <div className="glass-panel" style={{ padding:24, background:"white" }}>
        <div style={{ marginBottom:16 }}>
          <h2 style={{ fontSize:16, margin:0 }}>Notificações & Eventos</h2>
          <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Últimas ocorrências do sistema</p>
        </div>

        {alertas.length === 0 ? (
          <div style={{ textAlign:"center", color:"#9ca3af", padding:"20px 0", fontSize:13 }}>
            <CheckCircle size={28} color="#10b981" style={{ marginBottom:8, display:"block", margin:"0 auto 8px" }} />
            Nenhum alerta registrado. Sistema operando normalmente.
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {alertas.slice(0, 6).map((al) => (
              <div key={al.idAlerta || al.id_alerta} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px", borderRadius:12,
                background:"#fafafa", border:"1px solid #f3f4f6",
                transition:"background 0.15s"
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {getAlertIcon(al.nivel)}
                  <div>
                    <span style={{ fontSize:13, fontWeight:600, color:"#1f2937" }}>
                      {al.mensagem || "Alerta do sistema"}
                    </span>
                    {al.sensor?.nome && (
                      <span style={{ fontSize:11, color:"#9ca3af", marginLeft:8 }}>
                        · {al.sensor.nome}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:11, color:"#9ca3af", whiteSpace:"nowrap", marginLeft:12 }}>
                  {timeAgo(al.criadoEm || al.criado_em)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (max-width: 1100px) { .dashboard-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default DashboardPage;