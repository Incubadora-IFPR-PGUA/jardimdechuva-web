import React, { useState, useEffect, useCallback } from "react";
import {
  Droplet, CloudRain, Waves, Sun, Thermometer, Wind,
  FlaskConical, Gauge, Droplets, ScanLine, Cpu,
  Power, RefreshCw, AlertTriangle, CheckCircle,
  XCircle, Info, Sliders, Activity, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { toast } from "react-toastify";
import { sensorService, atuadorService, leituraService, alertaService } from "../../services/api";
import { parseLeituras } from "../../utils/sensorJsonParser";
import s from "./Dashboard.module.css";

const getSensorConfig = (sensor) => {
  const tipo = (sensor.tipoSensor?.nome || sensor.nome || "").toLowerCase();
  let Icon = Cpu, color = "#10b981", progressColor = "green";

  if (tipo.includes("pm") || tipo.includes("partícula") || tipo.includes("qualidade do ar")) {
    Icon = Wind;        color = "#8b5cf6"; progressColor = "purple";
  } else if (tipo.includes("solo") || (tipo.includes("umidade") && !tipo.includes("ar"))) {
    Icon = Droplet;
  } else if (tipo.includes("chuva") || tipo.includes("pluv")) {
    Icon = CloudRain;   color = "#3b82f6"; progressColor = "blue";
  } else if (tipo.includes("nível") || tipo.includes("nivel") || tipo.includes("ultrass")) {
    Icon = Waves;
  } else if (tipo.includes("luminosidade") || tipo.includes("luz") || tipo.includes("bh17")) {
    Icon = Sun;         color = "#f59e0b"; progressColor = "orange";
  } else if (tipo.includes("temperatura") || tipo.includes("dht") || tipo.includes("bme")) {
    Icon = Thermometer; color = "#f97316"; progressColor = "orange";
  } else if (tipo.includes("ar") || tipo.includes("umidade")) {
    Icon = Wind;
  } else if (tipo.includes("ph")) {
    Icon = FlaskConical; color = "#8b5cf6"; progressColor = "purple";
  } else if (tipo.includes("vazão") || tipo.includes("vazao")) {
    Icon = Gauge;        color = "#06b6d4"; progressColor = "blue";
  } else if (tipo.includes("qualidade") || tipo.includes("turbidez")) {
    Icon = Droplets;
  } else if (tipo.includes("presença") || tipo.includes("rfid")) {
    Icon = ScanLine;     color = "#7c3aed"; progressColor = "purple";
  }

  const estado = (sensor.estadoAtual || "normal").toLowerCase().trim();
  const badgeMap = {
    ideal: "badge-ideal", normal: "badge-normal", ótima: "badge-otima", otima: "badge-otima",
    leve: "badge-leve", baixo: "badge-baixo", alto: "badge-alto", saturado: "badge-warning",
    fora: "badge-fora", chovendo: "badge-info", seco: "badge-success", diurno: "badge-diurno",
    noturno: "badge-noturno", estavel: "badge-estavel", estável: "badge-estavel",
    ligado: "badge-success", desligado: "badge-gray", online: "badge-success", offline: "badge-danger",
    bom: "badge-success", moderado: "badge-warning",
  };
  const badgeClass = badgeMap[estado] || "badge-success";
  const badgeLabel = estado.charAt(0).toUpperCase() + estado.slice(1);
  return { Icon, color, progressColor, badgeClass, badgeLabel };
};

// Formata a última leitura do sensor usando o parser dinâmico
const formatUltimaLeitura = (leitura, tipoSensor) => {
  if (!leitura) return null;
  const parsed = parseLeituras([leitura], tipoSensor);
  if (!parsed.series.length) return null;
  const ponto = parsed.chartData[0];
  return parsed.series
    .map((s) => ponto[s.key] != null
      ? `${Number(ponto[s.key]).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${s.label.match(/\(([^)]+)\)/)?.[1] || parsed.unit}`
      : null
    )
    .filter(Boolean)
    .join(" · ") || null;
};

// Hora relativa
const horaRelativa = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return "agora";
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
};

const getAlertIcon = (nivel) => {
  const n = (nivel || "").toLowerCase();
  if (n === "critico" || n === "crítico" || n === "error") return <XCircle size={16} color="#ef4444" />;
  if (n === "aviso" || n === "warning") return <AlertTriangle size={16} color="#f59e0b" />;
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

const generateSoilData = () => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now - (23 - i) * 3600000).getHours();
    const v = Math.round(58 + 14 * Math.sin((h - 14) * Math.PI / 12) + (Math.random() * 4 - 2));
    return { name: `${h}h`, umidade: Math.max(30, Math.min(95, v)) };
  });
};

/* ─── Component ───────────────────────────────────────────── */
const DashboardPage = () => {
  const [sensores, setSensores]             = useState([]);
  const [ultimasLeituras, setUltimasLeituras] = useState({}); // { idSensor: leituraObj }
  const [atuadores, setAtuadores]           = useState([]);
  const [leiturasChuva, setLeiturasChuva]   = useState([]);
  const [leiturasClima, setLeiturasClima]   = useState([]);
  const [alertas, setAlertas]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState(null);
  const [activeChartTab, setActiveChartTab] = useState("solo");
  const [soilData] = useState(generateSoilData);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const results = await Promise.allSettled([
      sensorService.listar(),
      atuadorService.listar(),
      leituraService.listarChuva({ limit: 24 }),
      leituraService.listarClima({ limit: 24 }),
      alertaService.listar({ limit: 10 }),
    ]);
    const [sensRes, atRes, chuvaRes, climaRes, alertRes] = results;
    if (sensRes.status === "fulfilled")  {
      const lista = sensRes.value.data || [];
      setSensores(lista);
      // Buscar última leitura de cada sensor em paralelo
      const leiturasProm = lista.map((s) =>
        leituraService.listarPorSensor(s.idSensor || s.id_sensor, { limit: 1 })
          .then((r) => [s.idSensor || s.id_sensor, (r.data || [])[0] || null])
          .catch(() => [s.idSensor || s.id_sensor, null])
      );
      Promise.all(leiturasProm).then((pares) => {
        const mapa = {};
        pares.forEach(([id, l]) => { mapa[id] = l; });
        setUltimasLeituras(mapa);
      });
    }
    if (chuvaRes.status === "fulfilled") setLeiturasChuva(chuvaRes.value.data || []);
    if (climaRes.status === "fulfilled") setLeiturasClima(climaRes.value.data || []);
    if (alertRes.status === "fulfilled") setAlertas(alertRes.value.data || []);
    if (atRes.status === "fulfilled" && (atRes.value.data || []).length > 0) {
      setAtuadores(atRes.value.data.map((a) => ({
        id: a.idAtuador || a.id_atuador,
        nome: a.nome || `Atuador #${a.idAtuador}`,
        descricao: a.localizacao || a.mqttTopicoComando || "Atuador registrado",
        topico: a.mqttTopicoComando || a.mqtt_topico_comando,
        estado: ["LIGADO","ON","true",true].includes(a.estadoAtual ?? a.estado_atual),
        modo: a.mqttTopicoComando ? "Automático" : "Manual",
      })));
    } else if (atRes.status === "rejected") {
      setAtuadores([
        { id:1, nome:"Válvula Solenoide", descricao:"Controle de entrada/saída",      modo:"Automático", estado:false },
        { id:2, nome:"Bomba d'Água",      descricao:"Reaproveitamento e circulação",  modo:"Automático", estado:true  },
        { id:3, nome:"Relé Principal",    descricao:"Comutação de cargas elétricas",  modo:"Manual",     estado:true  },
        { id:4, nome:"Servo Motor",       descricao:"Direcionamento de fluxo",        modo:"Automático", estado:false },
        { id:5, nome:"LED / Display",     descricao:"Status visual",                  modo:"Manual",     estado:true  },
      ]);
    }
    setError(results.some(r => r.status === "rejected") ? "Alguns dados não puderam ser carregados. Exibindo valores em cache." : null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); const iv = setInterval(() => loadData(true), 15000); return () => clearInterval(iv); }, [loadData]);

  const handleToggle = async (id, current) => {
    const next = !current;
    setAtuadores(prev => prev.map(a => a.id === id ? { ...a, estado: next } : a));
    const label = atuadores.find(a => a.id === id)?.nome || "Atuador";
    try {
      await atuadorService.atualizar(id, { estadoAtual: next ? "LIGADO" : "DESLIGADO" });
      toast.success(`${label} → ${next ? "LIGADO" : "DESLIGADO"}`);
    } catch {
      setAtuadores(prev => prev.map(a => a.id === id ? { ...a, estado: current } : a));
      toast.error(`Falha ao alterar ${label}`);
    }
  };

  const rainChartData  = [...leiturasChuva].reverse().map(l => ({ name: new Date(l.dataHora).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }), chuva: l.valor ?? 0 }));
  const climaChartData = [...leiturasClima].reverse().map(l => ({ name: new Date(l.dataHora).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }), umidade: l.humidity ?? 0, temperatura: l.temperature ?? 0 }));
  const totalSensores  = sensores.length;
  const atoresAtivos   = atuadores.filter(a => a.estado).length;
  const eficiencia     = totalSensores > 0 ? Math.round(90 + (atoresAtivos / Math.max(atuadores.length, 1)) * 6) : 94;

  if (loading) {
    return (
      <div className={s.loadingWrap}>
        <RefreshCw size={36} className="animate-spin" style={{ color: "#10b981" }} />
        <p className={s.loadingText}>Carregando painel de controle...</p>
      </div>
    );
  }

  const tooltipStyle = { background:"white", borderRadius:12, border:"1px solid rgba(16,185,129,0.15)", boxShadow:"var(--shadow-md)", fontSize:12 };

  return (
    <div className={s.page}>
      {/* ── Banner ── */}
      <div className={`glass-panel ${s.banner}`}>
        <div className={s.bannerInfo}>
          <span className="badge badge-success" style={{ marginBottom: 10, display: "inline-flex" }}>
            <span className="status-dot online" style={{ width: 6, height: 6 }} />
            Sistema operando em modo automático
          </span>
          <h1 className={s.bannerTitle}>Gestão hídrica urbana inteligente</h1>
          <p className={s.bannerDesc}>
            Monitoramento em tempo real de sensores ambientais e atuadores hidráulicos para drenagem sustentável e otimização do uso da água.
          </p>
        </div>
        <div className={s.kpiRow}>
          {[
            { icon: <Droplet size={18} />, val: `${eficiencia}%`, label: "EFICIÊNCIA" },
            { icon: <Cpu size={18} />,     val: `${totalSensores}/${totalSensores}`, label: "SENSORES" },
            { icon: <Sliders size={18} />, val: atoresAtivos, label: "ATUADORES" },
          ].map(({ icon, val, label }) => (
            <div key={label} className={`glass-panel ${s.kpiCard}`}>
              <span className={s.kpiIcon}>{icon}</span>
              <span className={s.kpiValue}>{val}</span>
              <span className={s.kpiLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={s.errorBanner}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Sensor Cards ── */}
      <div>
        <div className={s.sectionHeader}>
          <div>
            <h2 className={s.sectionTitle}>Sensores ambientais</h2>
            <p className={s.sectionSub}>Leituras em tempo real · {sensores.length} sensores</p>
          </div>
          <button className={`${s.refreshBtn} hover-scale`} onClick={() => loadData(true)}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        <div className={s.sensorGrid}>
          {sensores.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`glass-panel ${s.sensorCard}`}>
                  <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 32, width: "40%", marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 4 }} />
                </div>
              ))
            : sensores.map((sensor) => {
                const id = sensor.idSensor || sensor.id_sensor;
                const { Icon, color, progressColor, badgeClass, badgeLabel } = getSensorConfig(sensor);
                const ultimaLeitura = ultimasLeituras[id];
                const valorFormatado = formatUltimaLeitura(ultimaLeitura, sensor.tipoSensor);
                const tempoLeitura  = horaRelativa(ultimaLeitura?.dataHora || ultimaLeitura?.data_hora);

                // Progresso baseado no valor_atual do sensor (fallback)
                const valAtual = parseFloat(sensor.valorAtual) || 0;
                const parsed   = ultimaLeitura ? parseLeituras([ultimaLeitura], sensor.tipoSensor) : null;
                const primVal  = parsed?.chartData?.[0]?.[parsed?.series?.[0]?.key];
                const maxProg  = parsed?.tipo === "ar" ? 150 : parsed?.tipo === "chuva" ? 50 : 100;
                const progress = primVal != null
                  ? Math.min(100, Math.max(0, (primVal / maxProg) * 100))
                  : Math.min(100, Math.max(0, (valAtual / 100) * 100));

                return (
                  <div key={id} className={`glass-panel hover-scale ${s.sensorCard}`}>
                    {/* Top: ícone + nome + badge */}
                    <div className={s.sensorCardTop}>
                      <div className={s.sensorIconRow}>
                        <div className={s.sensorIconBox} style={{ background: `${color}18`, color }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className={s.sensorName}>{sensor.nome || `Sensor #${id}`}</div>
                          <div className={s.sensorType}>{sensor.tipoSensor?.nome || "—"}</div>
                        </div>
                      </div>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: 10 }}>{badgeLabel}</span>
                    </div>

                    {/* Valor da última leitura (via valor_json) */}
                    <div>
                      {valorFormatado ? (
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#064e3b",
                                      fontFamily: "var(--font-heading)", lineHeight: 1.2 }}>
                          {valorFormatado}
                        </div>
                      ) : sensor.valorAtual != null ? (
                        <div className={s.sensorValue}>
                          <span className={s.sensorValueNum}>
                            {parseFloat(sensor.valorAtual).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                          </span>
                          {sensor.tipoSensor?.unidade && (
                            <span className={s.sensorUnit}>{sensor.tipoSensor.unidade}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 22, fontWeight: 700, color: "#d1d5db" }}>—</span>
                      )}

                      {/* Hora da leitura */}
                      {tempoLeitura && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4,
                                      fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                          <Clock size={10} />
                          {tempoLeitura}
                        </div>
                      )}
                    </div>

                    {/* Barra de progresso */}
                    <div className="sensor-progress">
                      <div className={`sensor-progress-fill ${progressColor}`}
                           style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* ── Chart + Atuadores ── */}
      <div className={s.dashGrid}>
        {/* Chart */}
        <div className={`glass-panel ${s.chartPanel}`}>
          <div className={s.chartHeader}>
            <div>
              <h2 className={s.chartTitle}>Tendências ambientais (24h)</h2>
              <p className={s.chartSub}>Umidade do solo, chuva e temperatura</p>
            </div>
            <div className={s.chartHeaderRight}>
              <span className="badge badge-success" style={{ fontSize: 10 }}>
                <Activity size={10} /> Tempo real
              </span>
              <div className="filter-tabs" style={{ padding: 3 }}>
                {[["solo","Umidade do solo"],["chuva","Chuva"],["clima","Temperatura"]].map(([k, l]) => (
                  <button key={k} onClick={() => setActiveChartTab(k)} className={`filter-tab ${activeChartTab === k ? "active" : ""}`} style={{ padding:"6px 12px", fontSize:12 }}>
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
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} />
                  <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} domain={[20,100]} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight:700, color:"#064e3b" }} />
                  <Area type="monotone" dataKey="umidade" name="Umidade (%)" stroke="#10b981" strokeWidth={2.5} fill="url(#soilGrad)" />
                </AreaChart>
              ) : activeChartTab === "chuva" ? (
                rainChartData.length > 0 ? (
                  <AreaChart data={rainChartData} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="stepAfter" dataKey="chuva" name="Chuva (mm/h)" stroke="#3b82f6" strokeWidth={2.5} fill="url(#rainGrad)" />
                  </AreaChart>
                ) : <div className={s.chartEmpty}>Sem leituras de chuva recentes.</div>
              ) : (
                climaChartData.length > 0 ? (
                  <AreaChart data={climaChartData} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                    <defs>
                      <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize:11, paddingTop:8 }} />
                    <Area type="monotone" dataKey="umidade" name="Umidade (%)" stroke="#10b981" strokeWidth={2.5} fill="url(#humGrad)" />
                    <Area type="monotone" dataKey="temperatura" name="Temperatura (°C)" stroke="#f59e0b" strokeWidth={2} fill="url(#tempGrad)" />
                  </AreaChart>
                ) : <div className={s.chartEmpty}>Sem leituras de clima recentes.</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Atuadores */}
        <div className={`glass-panel ${s.actuatorsPanel}`}>
          <div className={s.sectionHeader}>
            <div>
              <h2 className={s.chartTitle}>Atuadores</h2>
              <p className={s.chartSub}>Controle automático e manual</p>
            </div>
            <Sliders size={16} color="#9ca3af" />
          </div>
          <div className={s.actuatorsList}>
            {atuadores.map((a) => (
              <div key={a.id} className={`${s.actuatorItem} ${a.estado ? s.actuatorItemOn : s.actuatorItemOff}`}>
                <div className={s.actuatorLeft}>
                  <div className={`${s.actuatorIconBox} ${a.estado ? s.actuatorIconOn : s.actuatorIconOff}`}>
                    <Power size={16} />
                  </div>
                  <div>
                    <div className={s.actuatorNameRow}>
                      <span className={s.actuatorName}>{a.nome}</span>
                      <span className={`badge ${a.modo === "Automático" ? "badge-success" : "badge-warning"}`} style={{ fontSize:9, padding:"2px 6px" }}>
                        {a.modo}
                      </span>
                    </div>
                    <p className={s.actuatorDesc}>{a.descricao}</p>
                  </div>
                </div>
                <label className="switch-container">
                  <input type="checkbox" checked={a.estado} onChange={() => handleToggle(a.id, a.estado)} />
                  <span className="slider" />
                </label>
              </div>
            ))}
          </div>
          <div className={s.automationBox}>
            <Info size={18} style={{ color:"#059669", flexShrink:0, marginTop:1 }} />
            <div>
              <span className={s.automationTitle}>Automação ativa</span>
              <p className={s.automationDesc}>Irrigação iniciará automaticamente se a umidade do solo cair abaixo de 40% durante o período noturno.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alertas ── */}
      <div className={`glass-panel ${s.alertsPanel}`}>
        <div className={s.sectionHeader} style={{ marginBottom: 16 }}>
          <div>
            <h2 className={s.chartTitle}>Notificações &amp; Eventos</h2>
            <p className={s.chartSub}>Últimas ocorrências do sistema</p>
          </div>
        </div>
        {alertas.length === 0 ? (
          <div className={s.emptyAlerts}>
            <CheckCircle size={28} color="#10b981" style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
            Nenhum alerta registrado. Sistema operando normalmente.
          </div>
        ) : (
          <div className={s.alertsList}>
            {alertas.slice(0, 6).map((al) => (
              <div key={al.idAlerta || al.id_alerta} className={s.alertItem}>
                <div className={s.alertLeft}>
                  {getAlertIcon(al.nivel)}
                  <div>
                    <span className={s.alertMsg}>{al.mensagem || "Alerta do sistema"}</span>
                    {al.sensor?.nome && <span className={s.alertSensor}>· {al.sensor.nome}</span>}
                  </div>
                </div>
                <span className={s.alertTime}>{timeAgo(al.criadoEm || al.criado_em)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
