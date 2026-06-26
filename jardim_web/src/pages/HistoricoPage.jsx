import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Download, Search, ChevronRight,
  Droplet, CloudRain, Thermometer, Wind, Sun,
  FlaskConical, Waves, Cpu, Activity,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import ReactApexChart from "react-apexcharts";
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

// ─── Tooltip customizado removido (ApexCharts já tem nativo) ───────────────

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

  const dates = chartData.map(item => item.name);
  const chartType = tipo === "chuva" ? "bar" : "area";

  const apexOptions = {
    chart: {
      type: chartType,
      height: 350,
      fontFamily: 'inherit',
      zoom: { enabled: true, type: 'x' },
      toolbar: { 
        show: false
      },
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: { speed: 800 }
      }
    },
    colors: series.map(s => s.color),
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: chartType === "area" ? {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    } : { opacity: 0.8 },
    xaxis: {
      categories: dates,
      labels: {
        style: { colors: '#9ca3af', fontSize: '10px' },
        hideOverlappingLabels: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#9ca3af', fontSize: '10px' },
        formatter: (val) => val != null ? Number(val).toFixed(2) : ""
      },
      min: (min) => min,
      max: (max) => max
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 3,
    },
    tooltip: { 
      theme: 'light',
      style: { fontSize: '12px' }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      offsetY: 15,
      markers: { radius: 12 }
    }
  };

  const apexSeries = series.map(s => ({
    name: s.label,
    data: chartData.map(item => item[s.key] != null ? item[s.key] : null)
  }));

  return (
    <div style={{ width: "100%", height: 350 }}>
      <ReactApexChart 
        options={apexOptions} 
        series={apexSeries} 
        type={chartType} 
        height={350} 
      />
    </div>
  );
};

// ─── Tabela de leituras ───────────────────────────────────────────────────────

const LeiturasTable = ({ chartData, series, qualidadeFn }) => {
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
            {qualidadeFn && (
              <th style={{ textAlign: "center", padding: "8px 12px", color: "#9ca3af",
                           fontWeight: 600, whiteSpace: "nowrap" }}>
                Qualidade
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => {
            let q = null;
            if (qualidadeFn && series.length > 0) {
              const mainValue = row[series[0].key];
              if (mainValue != null) q = qualidadeFn(mainValue);
            }

            return (
              <tr key={row._raw?.idLeitura || row._raw?.id_leitura || i} className="new-row-anim" style={{
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
                {qualidadeFn && (
                  <td style={{ padding: "7px 12px", textAlign: "center" }}>
                    {q ? (
                      <span style={{
                        background: `${q.color}15`,
                        color: q.color,
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700
                      }}>
                        {q.label}
                      </span>
                    ) : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                )}
              </tr>
            );
          })}
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
  const [filtrarAnomalias, setFiltrarAnomalias] = useState(true);

  const periodCfg = PERIODS.find((p) => p.key === period);

  // ── Buscar lista de sensores ─────────────────────────────────
  useEffect(() => {
    sensorService.listar()
      .then((res) => setSensores(res.data || []))
      .catch(() => toast.error("Erro ao carregar sensores."))
      .finally(() => setLoadingSensores(false));
  }, []);

  // ── Buscar leituras do sensor selecionado ────────────────────
  const fetchLeituras = useCallback(async (sensor, cfg, silent = false) => {
    if (!sensor) return;
    if (!silent) setLoadingLeituras(true);
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
    if (sensorSelecionado) {
      fetchLeituras(sensorSelecionado, periodCfg);
      // Atualização em tempo real (polling silencioso)
      const iv = setInterval(() => fetchLeituras(sensorSelecionado, periodCfg, true), 10000);
      return () => clearInterval(iv);
    }
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

  const chartDataFiltrado = useMemo(() => {
    let data = parsed.chartData;
    if (!filtrarAnomalias) return data;
    
    const maxVal = sensorSelecionado?.configuracao?.valorMax;
    const minVal = sensorSelecionado?.configuracao?.valorMin;

    if (maxVal != null || minVal != null) {
       return data.filter(d => {
         let isAnomaly = false;
         parsed.series.forEach(s => {
           if (d[s.key] != null) {
              if (maxVal != null && d[s.key] > maxVal) isAnomaly = true;
              if (minVal != null && d[s.key] < minVal) isAnomaly = true;
           }
         });
         return !isAnomaly;
       });
    }

    // Filtro estatístico automático usando IQR
    const allVals = [];
    parsed.series.forEach(s => {
      data.forEach(d => { if (d[s.key] != null) allVals.push(d[s.key]); });
    });
    if (allVals.length === 0) return data;
    
    allVals.sort((a,b) => a - b);
    const q1 = allVals[Math.floor(allVals.length * 0.25)];
    const q3 = allVals[Math.floor(allVals.length * 0.75)];
    const iqr = q3 - q1;
    
    if (iqr === 0) return data; 
    
    const limiteSup = q3 + (3 * iqr);
    const limiteInf = q1 - (3 * iqr);

    return data.filter(d => {
       let isAnomaly = false;
       parsed.series.forEach(s => {
         if (d[s.key] != null) {
            if (d[s.key] > limiteSup || d[s.key] < limiteInf) isAnomaly = true;
         }
       });
       return !isAnomaly;
    });
  }, [parsed.chartData, parsed.series, filtrarAnomalias, sensorSelecionado]);

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
          {/* Botão de Exportar apenas */}

          <button onClick={handleExport} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Carrossel de Sensores (Horizontal) ── */}
      <div className="glass-panel" style={{ padding: 14, background: "white", marginBottom: 20 }}>
        {/* Search */}
        <div style={{ marginBottom: 12, maxWidth: 300 }}>
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

        {/* Lista Horizontal */}
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }} className="custom-scrollbar">
          {loadingSensores ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: 220, height: 60, borderRadius: 12, flexShrink: 0 }} />
            ))
          ) : sensoresFiltrados.length === 0 ? (
            <div style={{ padding: 24, color: "#9ca3af", fontSize: 13 }}>
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
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", background: isSelected ? `${color}0f` : "transparent",
                    border: isSelected ? `1px solid ${color}` : "1px solid #f9fafb",
                    borderRadius: 12,
                    cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                    minWidth: 220, flexShrink: 0
                  }}
                  className="hover-scale"
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
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.tipoSensor?.nome || "Tipo desconhecido"}
                      {val != null && (
                        <span style={{ color, fontWeight: 600, marginLeft: 6 }}>
                          · {fmt(val, 1)} {s.tipoSensor?.unidade || ""}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Conteúdo Principal ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#374151", margin: 0 }}>
                    {parsed.tipo === "ar" ? "Concentração de Partículas" : `Histórico de ${parsed.label}`}
                  </h3>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {parsed.tipo === "ar" ? "Variação de PM2.5 e PM10 no ar" : `${parsed.chartData.length} pontos · unidade: ${parsed.unit || "—"}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer", background: "#f3f4f6", padding: "5px 10px", borderRadius: 8, userSelect: "none" }}>
                    <input type="checkbox" checked={filtrarAnomalias} onChange={e => setFiltrarAnomalias(e.target.checked)} style={{ cursor: "pointer" }} />
                    Filtrar Anomalias
                  </label>
                  <span className="badge badge-success" style={{ fontSize: 10 }}>
                    <Activity size={9} /> Tempo real
                  </span>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(16,185,129,0.2)",
                      outline: "none",
                      fontSize: 12,
                      background: "white",
                      color: "#374151",
                      cursor: "pointer"
                    }}
                  >
                    {PERIODS.map(p => (
                      <option key={p.key} value={p.key}>{p.label === "24h" ? "Hoje" : p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loadingLeituras ? (
                <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
              ) : (
                <SensorChart chartData={chartDataFiltrado} series={parsed.series} tipo={parsed.tipo} />
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
                <LeiturasTable chartData={parsed.chartData} series={parsed.series} qualidadeFn={parsed.qualidade} />
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeInRow {
          0% { opacity: 0; transform: translateY(-10px); background: #d1fae5; }
          100% { opacity: 1; transform: translateY(0); }
        }
        .new-row-anim {
          animation: fadeInRow 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HistoricoPage;
