import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Download, Search, ChevronRight,
  Droplet, CloudRain, Thermometer, Wind, Sun,
  FlaskConical, Waves, Cpu, Activity,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "react-toastify";
import { leituraService, sensorService } from "../services/api";
import { parseLeituras, calcKpis, exportCsv } from "../utils/sensorJsonParser";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { key: "24h",  label: "24h",   hours: 24,  limit: 500  },
  { key: "7d",   label: "7 dias", hours: 168, limit: 1000 },
  { key: "30d",  label: "30 dias", hours: 720, limit: 2000 },
];

const ICON_MAP = {
  wind:        Wind,
  thermometer: Thermometer,
  "cloud-rain": CloudRain,
  waves:       Waves,
  sun:         Sun,
  flask:       FlaskConical,
  droplet:     Droplet,
  cpu:         Cpu,
};

const getSensorIcon = (sensor) => {
  const tipo = (sensor.tipoSensor?.nome || sensor.nome || "").toLowerCase();
  if (tipo.includes("pm") || tipo.includes("ar") || tipo.includes("partícula")) return Wind;
  if (tipo.includes("chuva") || tipo.includes("pluv"))   return CloudRain;
  if (tipo.includes("clima") || tipo.includes("dht") || tipo.includes("bme") || tipo.includes("temp")) return Thermometer;
  if (tipo.includes("solo") || tipo.includes("capac"))   return Droplet;
  if (tipo.includes("nível") || tipo.includes("nivel") || tipo.includes("ultrass")) return Waves;
  if (tipo.includes("lum") || tipo.includes("luz") || tipo.includes("bh17")) return Sun;
  if (tipo.includes("ph"))  return FlaskConical;
  return Cpu;
};

const getSensorColor = (sensor) => {
  const tipo = (sensor.tipoSensor?.nome || sensor.nome || "").toLowerCase();
  if (tipo.includes("pm") || tipo.includes("ar"))         return { color: "#8b5cf6", bg: "#f5f3ff" };
  if (tipo.includes("chuva") || tipo.includes("pluv"))    return { color: "#3b82f6", bg: "#eff6ff" };
  if (tipo.includes("clima") || tipo.includes("temp"))    return { color: "#f97316", bg: "#fff7ed" };
  if (tipo.includes("solo") || tipo.includes("capac"))    return { color: "#10b981", bg: "#ecfdf5" };
  if (tipo.includes("nível") || tipo.includes("nivel"))   return { color: "#06b6d4", bg: "#ecfeff" };
  if (tipo.includes("lum") || tipo.includes("luz"))       return { color: "#f59e0b", bg: "#fefce8" };
  if (tipo.includes("ph"))                                 return { color: "#8b5cf6", bg: "#f5f3ff" };
  return { color: "#6b7280", bg: "#f3f4f6" };
};

const trendIcon = (delta) => {
  if (delta > 0) return <TrendingUp  size={12} />;
  if (delta < 0) return <TrendingDown size={12} />;
  return <Minus size={12} />;
};

const fmt = (n, d = 2) => n != null ? Number(n).toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";

// ─── Tooltip customizado ──────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: "10px 14px",
      border: "1px solid rgba(16,185,129,0.15)", boxShadow: "var(--shadow-md)", fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: "#064e3b", marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{p.value != null ? fmt(p.value, 3) : "—"}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, unit, delta, color = "#10b981" }) => (
  <div className="glass-panel" style={{
    padding: "16px 18px", background: "white", flex: "1 1 120px", minWidth: 0,
    border: "1px solid rgba(16,185,129,0.07)",
  }}>
    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6,
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "#064e3b",
                  fontFamily: "var(--font-heading)", lineHeight: 1 }}>
      {value}<span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginLeft: 4 }}>{unit}</span>
    </div>
    {delta != null && (
      <div style={{ display: "flex", alignItems: "center", gap: 3,
                    fontSize: 11, fontWeight: 600, color: color, marginTop: 4 }}>
        {trendIcon(delta)} {delta > 0 ? "+" : ""}{fmt(delta, 2)}
      </div>
    )}
  </div>
);

// ─── Gráfico dinâmico ─────────────────────────────────────────────────────────

const SensorChart = ({ chartData, series, tipo }) => {
  if (chartData.length === 0) {
    return (
      <div style={{ height: 260, display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
        Nenhuma leitura no período selecionado.
      </div>
    );
  }

  const interval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  // Chuva → BarChart; genérico único → LineChart; demais → AreaChart
  if (tipo === "chuva") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} interval={interval} />
          <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color}
                 radius={[4, 4, 0, 0]} maxBarSize={24} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad_${s.key}_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false} interval={interval} />
        <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {series.length > 1 && (
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        )}
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
            stroke={s.color} strokeWidth={2.5}
            fill={`url(#grad_${s.key}_${i})`} connectNulls />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

// ─── Tabela de leituras ───────────────────────────────────────────────────────

const LeiturasTable = ({ chartData, series }) => {
  const shown = chartData.slice().reverse().slice(0, 50);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
            <th style={{ textAlign: "left", padding: "8px 12px", color: "#9ca3af",
                         fontWeight: 600, whiteSpace: "nowrap" }}>Data / Hora</th>
            {series.map((s) => (
              <th key={s.key} style={{ textAlign: "right", padding: "8px 12px",
                                       color: s.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={i} style={{
              borderBottom: "1px solid #f9fafb",
              background: i % 2 === 0 ? "transparent" : "rgba(16,185,129,0.02)",
            }}>
              <td style={{ padding: "7px 12px", color: "#4b5563", whiteSpace: "nowrap" }}>
                {row.name}
              </td>
              {series.map((s) => (
                <td key={s.key} style={{ padding: "7px 12px", textAlign: "right",
                                          fontWeight: 600, color: "#064e3b" }}>
                  {row[s.key] != null ? fmt(row[s.key], 3) : <span style={{ color: "#d1d5db" }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {chartData.length > 50 && (
        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", padding: "8px 0" }}>
          Exibindo 50 de {chartData.length} leituras. Exporte o CSV para ver todas.
        </p>
      )}
    </div>
  );
};

// ─── Component Principal ──────────────────────────────────────────────────────

const HistoricoPage = () => {
  const [sensores, setSensores]             = useState([]);
  const [sensorSelecionado, setSensor]      = useState(null);
  const [leituras, setLeituras]             = useState([]);
  const [period, setPeriod]                 = useState("24h");
  const [search, setSearch]                 = useState("");
  const [loadingSensores, setLoadingSensores] = useState(true);
  const [loadingLeituras, setLoadingLeituras] = useState(false);

  const periodCfg = PERIODS.find((p) => p.key === period);

  // ── Buscar lista de sensores ─────────────────────────────────
  useEffect(() => {
    sensorService.listar()
      .then((res) => setSensores(res.data || []))
      .catch(() => toast.error("Erro ao carregar sensores."))
      .finally(() => setLoadingSensores(false));
  }, []);

  // ── Buscar leituras do sensor selecionado ────────────────────
  const fetchLeituras = useCallback(async (sensor, cfg) => {
    if (!sensor) return;
    setLoadingLeituras(true);
    try {
      const now   = new Date();
      const start = new Date(now - cfg.hours * 3600_000).toISOString();
      const res   = await leituraService.listarPorSensor(sensor.idSensor || sensor.id_sensor, {
        limit: cfg.limit,
        dataInicio: start,
      });
      setLeituras(res.data || []);
    } catch {
      toast.error("Erro ao carregar leituras.");
      setLeituras([]);
    } finally {
      setLoadingLeituras(false);
    }
  }, []);

  useEffect(() => {
    if (sensorSelecionado) fetchLeituras(sensorSelecionado, periodCfg);
  }, [sensorSelecionado, period, fetchLeituras, periodCfg]);

  // ── Parser dinâmico ──────────────────────────────────────────
  const parsed = useMemo(
    () => parseLeituras(leituras, sensorSelecionado?.tipoSensor),
    [leituras, sensorSelecionado]
  );

  const kpis = useMemo(
    () => calcKpis(parsed.chartData, parsed.series),
    [parsed]
  );

  // ── Sensores filtrados ───────────────────────────────────────
  const sensoresFiltrados = useMemo(() => {
    if (!search.trim()) return sensores;
    const q = search.toLowerCase();
    return sensores.filter(
      (s) =>
        (s.nome || "").toLowerCase().includes(q) ||
        (s.tipoSensor?.nome || "").toLowerCase().includes(q)
    );
  }, [sensores, search]);

  // ── Exportar CSV ──────────────────────────────────────────────
  const handleExport = () => {
    if (!parsed.chartData.length) { toast.warn("Sem dados para exportar."); return; }
    exportCsv(parsed.chartData, parsed.series, sensorSelecionado?.nome, period);
    toast.success("CSV exportado!");
  };

  // ── Render ────────────────────────────────────────────────────
  const IconComp = sensorSelecionado ? getSensorIcon(sensorSelecionado) : Cpu;
  const sensorColor = sensorSelecionado ? getSensorColor(sensorSelecionado) : { color: "#10b981", bg: "#ecfdf5" };
  const primaryKpiKey = parsed.series[0]?.key;
  const primaryKpi    = primaryKpiKey ? kpis[primaryKpiKey] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-up">

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-info" style={{ marginBottom: 8 }}>Dados consolidados</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Histórico do sistema</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Selecione um sensor para visualizar suas leituras no período.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Período */}
          <div style={{ display: "flex", gap: 4, background: "white", padding: 4,
                        borderRadius: 12, boxShadow: "var(--shadow-sm)",
                        border: "1px solid rgba(16,185,129,0.1)" }}>
            {PERIODS.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                         background: period === key ? "#064e3b" : "transparent",
                         color: period === key ? "white" : "#6b7280",
                         fontWeight: 600, fontSize: 13, transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={handleExport} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Layout 2 colunas ── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}
           className="historico-grid">

        {/* ── Coluna Esquerda: Lista de Sensores ── */}
        <div className="glass-panel" style={{ padding: 0, background: "white", overflow: "hidden" }}>
          {/* Search */}
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%",
                                         transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar sensor..."
                style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 8,
                         border: "1px solid rgba(16,185,129,0.15)", outline: "none",
                         fontSize: 12, background: "#fafafa" }}
              />
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {loadingSensores ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "12px 14px", borderBottom: "1px solid #f9fafb" }}>
                  <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: "40%" }} />
                </div>
              ))
            ) : sensoresFiltrados.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                Nenhum sensor encontrado.
              </div>
            ) : (
              sensoresFiltrados.map((s) => {
                const SIcon = getSensorIcon(s);
                const { color, bg } = getSensorColor(s);
                const isSelected = sensorSelecionado?.idSensor === (s.idSensor || s.id_sensor);
                const val = s.valorAtual != null ? parseFloat(s.valorAtual) : null;

                return (
                  <button
                    key={s.idSensor || s.id_sensor}
                    onClick={() => setSensor(s)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", background: isSelected ? `${color}0f` : "transparent",
                      border: "none", borderBottom: "1px solid #f9fafb",
                      borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                      cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: bg,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color, flexShrink: 0 }}>
                      <SIcon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#064e3b",
                                    lineHeight: 1.2, whiteSpace: "nowrap",
                                    overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.nome || `Sensor #${s.idSensor}`}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {s.tipoSensor?.nome || "Tipo desconhecido"}
                        {val != null && (
                          <span style={{ color, fontWeight: 600, marginLeft: 6 }}>
                            · {fmt(val, 1)} {s.tipoSensor?.unidade || ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={14} color={color} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Coluna Direita: Gráfico e Dados ── */}
        {!sensorSelecionado ? (
          <div className="glass-panel" style={{
            padding: "60px 24px", background: "white", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ecfdf5",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={26} color="#10b981" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#064e3b" }}>
              Selecione um sensor
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 320 }}>
              Escolha um sensor na lista ao lado para visualizar o histórico de leituras e os gráficos.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Cabeçalho do sensor */}
            <div className="glass-panel" style={{
              padding: "18px 22px", background: "white",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12,
                              background: sensorColor.bg,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: sensorColor.color }}>
                  <IconComp size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                    {sensorSelecionado.nome || `Sensor #${sensorSelecionado.idSensor}`}
                  </h2>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {sensorSelecionado.tipoSensor?.nome} · {parsed.label}
                    {sensorSelecionado.estadoAtual && (
                      <span className="badge badge-success" style={{ marginLeft: 8, fontSize: 10 }}>
                        {sensorSelecionado.estadoAtual}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => fetchLeituras(sensorSelecionado, periodCfg)}
                style={{ background: "white", border: "1px solid rgba(16,185,129,0.15)",
                         borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600,
                         color: "#047857", display: "flex", alignItems: "center", gap: 6,
                         cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
                <RefreshCw size={13} className={loadingLeituras ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>

            {/* KPIs */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {parsed.series.map((s) => {
                const k = kpis[s.key];
                return k ? (
                  <React.Fragment key={s.key}>
                    <KpiCard label={`Média — ${s.label.split(" ")[0]}`}
                      value={fmt(k.media)} unit={parsed.unit.split(" / ")[0]}
                      color={s.color} />
                    <KpiCard label="Máximo"  value={fmt(k.max)}  unit="" color={s.color} />
                    <KpiCard label="Mínimo"  value={fmt(k.min)}  unit="" color={s.color} />
                  </React.Fragment>
                ) : null;
              })}
              <KpiCard label="Leituras" value={fmt(parsed.chartData.length, 0)} unit="" />

              {/* Badge de qualidade do ar */}
              {parsed.tipo === "ar" && parsed.qualidade && primaryKpi?.media != null && (() => {
                const q = parsed.qualidade(primaryKpi.media);
                return q ? (
                  <div className="glass-panel" style={{
                    padding: "16px 18px", background: q.color + "0f",
                    border: `1px solid ${q.color}30`, flex: "1 1 120px", minWidth: 0,
                  }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6,
                                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Qualidade</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: q.color,
                                  fontFamily: "var(--font-heading)" }}>{q.label}</div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Gráfico */}
            <div className="glass-panel" style={{ padding: "22px 22px 14px", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 15, margin: 0 }}>Leituras — {period}</h3>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {parsed.chartData.length} pontos · unidade: {parsed.unit || "—"}
                  </p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 10 }}>
                  <Activity size={9} /> Tempo real
                </span>
              </div>

              {loadingLeituras ? (
                <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
              ) : (
                <SensorChart chartData={parsed.chartData} series={parsed.series} tipo={parsed.tipo} />
              )}
            </div>

            {/* Tabela */}
            <div className="glass-panel" style={{ padding: 22, background: "white" }}>
              <h3 style={{ fontSize: 15, margin: "0 0 14px" }}>
                Últimas leituras
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 8 }}>
                  (máx. 50 exibidas)
                </span>
              </h3>
              {loadingLeituras ? (
                <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
              ) : (
                <LeiturasTable chartData={parsed.chartData} series={parsed.series} />
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .historico-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default HistoricoPage;
