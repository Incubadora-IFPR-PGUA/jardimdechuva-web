import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Download, Droplet, CloudRain,
  Thermometer, Recycle, TrendingUp, TrendingDown,
  Minus, Plus, Send, X, ChevronDown
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { toast } from "react-toastify";
import { leituraService, sensorService } from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const avg   = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const sum   = (arr) => arr.reduce((s, v) => s + v, 0);
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

const PERIODS = [
  { key:"24h",  label:"24 horas", hours:24,  limit:200 },
  { key:"7d",   label:"7 dias",   hours:168, limit:500 },
  { key:"30d",  label:"30 dias",  hours:720, limit:2000 },
];

const trendIcon = (delta) => {
  if (delta > 0) return <TrendingUp  size={13} />;
  if (delta < 0) return <TrendingDown size={13} />;
  return <Minus size={13} />;
};

const trendColor = (delta, positiveIsGood = true) => {
  if (delta === 0) return "#9ca3af";
  return (delta > 0) === positiveIsGood ? "#10b981" : "#ef4444";
};

// Gera dataset de nível de reservatório e vazão (estimado)
const generateReservoirData = (climaData) => {
  if (climaData.length === 0) {
    return Array.from({ length:24 }, (_, i) => ({
      name: `${i}h`,
      nivel: Math.round(40 + 20 * Math.sin(i * Math.PI / 12) + Math.random() * 5),
      vazao: round(2 + 1.5 * Math.cos(i * Math.PI / 8) + Math.random(), 1),
    }));
  }
  return climaData.map((d, i) => ({
    name: d.name,
    nivel: Math.round(35 + 20 * Math.sin(i * Math.PI / 12) + (d.umidade ?? 50) * 0.2),
    vazao: round(1.5 + (d.umidade ?? 50) * 0.03, 1),
  }));
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ icon, value, unit, label, delta, deltaUnit = "", positiveIsGood = true }) => {
  const dColor = trendColor(delta, positiveIsGood);
  return (
    <div className="glass-panel hover-scale" style={{
      padding:"20px 22px", background:"white", flex:"1 1 160px",
      border:"1px solid rgba(16,185,129,0.07)"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ color:"#10b981" }}>{icon}</span>
        {delta !== undefined && (
          <span style={{ display:"flex", alignItems:"center", gap:3,
                         fontSize:11, fontWeight:700, color:dColor }}>
            {trendIcon(delta)}
            {delta > 0 ? "+" : ""}{delta}{deltaUnit}
          </span>
        )}
      </div>
      <div style={{ fontSize:30, fontWeight:800, color:"#064e3b",
                    fontFamily:"var(--font-heading)", lineHeight:1 }}>
        {value}<span style={{ fontSize:16, fontWeight:600, color:"#6b7280", marginLeft:4 }}>{unit}</span>
      </div>
      <div style={{ fontSize:12, color:"#9ca3af", marginTop:6 }}>{label}</div>
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"white", borderRadius:12, padding:"10px 14px",
                  border:"1px solid rgba(16,185,129,0.15)", boxShadow:"var(--shadow-md)",
                  fontSize:12 }}>
      <p style={{ fontWeight:700, color:"#064e3b", marginBottom:6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color:p.color, margin:"2px 0" }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const HistoricoPage = () => {
  const [period, setPeriod]           = useState("24h");
  const [climaData, setClimaData]     = useState([]);
  const [chuvaData, setChuvaData]     = useState([]);
  const [sensores, setSensores]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulating, setSimulating]   = useState(false);

  // Simulator form
  const [sim, setSim] = useState({
    tipo:"clima", idSensor:"1",
    temperature:"24.5", humidity:"65",
    mm:"2.5", chovendo:true,
  });

  const periodCfg = PERIODS.find((p) => p.key === period);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const now   = new Date();
    const start = new Date(now - periodCfg.hours * 3600 * 1000).toISOString();

    const [climaRes, chuvaRes, sensRes] = await Promise.allSettled([
      leituraService.listarClima({ limit: periodCfg.limit, dataInicio: start }),
      leituraService.listarChuva({ limit: periodCfg.limit, dataInicio: start }),
      sensorService.listar(),
    ]);

    if (climaRes.status === "fulfilled") setClimaData(climaRes.value.data || []);
    if (chuvaRes.status === "fulfilled") setChuvaData(chuvaRes.value.data || []);
    if (sensRes.status === "fulfilled")  setSensores(sensRes.value.data  || []);

    setLoading(false);
    setRefreshing(false);
  }, [period, periodCfg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Processed chart data ────────────────────────────────────
  const climaChart = useMemo(() =>
    [...climaData].reverse().map((l) => ({
      name:        new Date(l.dataHora).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
      umidade:     l.humidity    ?? 0,
      temperatura: l.temperature ?? 0,
    })),
  [climaData]);

  const chuvaChart = useMemo(() =>
    [...chuvaData].reverse().map((l) => ({
      name: new Date(l.dataHora).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }),
      chuva: l.valor ?? 0,
    })),
  [chuvaData]);

  const reservoirChart = useMemo(() => generateReservoirData(climaChart), [climaChart]);

  // ── KPI calculations ────────────────────────────────────────
  const umidadeMedia = useMemo(() =>
    round(avg(climaData.map((l) => l.humidity ?? 0))), [climaData]);

  const chuvaAcumulada = useMemo(() =>
    round(sum(chuvaData.map((l) => l.valor ?? 0)), 0), [chuvaData]);

  const tempMedia = useMemo(() =>
    round(avg(climaData.map((l) => l.temperature ?? 0))), [climaData]);

  const aguaReaproveitada = useMemo(() =>
    round(chuvaAcumulada * 3.2, 0), [chuvaAcumulada]);

  // ── Simulator ────────────────────────────────────────────────
  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      if (sim.tipo === "clima") {
        await leituraService.registrarClima({
          idSensor:    Number(sim.idSensor),
          temperature: Number(sim.temperature),
          humidity:    Number(sim.humidity),
        });
      } else {
        await leituraService.registrarChuva({
          idSensor: Number(sim.idSensor),
          mm:       Number(sim.mm),
          chovendo: sim.chovendo,
        });
      }
      toast.success("Leitura simulada enviada!");
      setShowSimulator(false);
      fetchData(true);
    } catch {
      toast.error("Erro ao simular leitura. Verifique o ID do sensor.");
    } finally {
      setSimulating(false);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ["Tipo","DataHora","Temperatura","Umidade","Chuva_mm"],
      ...climaData.map((l) => ["clima", l.dataHora, l.temperature ?? "", l.humidity ?? "", ""]),
      ...chuvaData.map((l) => ["chuva", l.dataHora, "", "", l.valor ?? ""]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href:url, download:`historico_${period}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    flexWrap:"wrap", gap:12 }}>
        <div>
          <span className="badge badge-info" style={{ marginBottom:8 }}>Dados consolidados</span>
          <h1 style={{ fontSize:26, fontWeight:800, margin:0 }}>Histórico do sistema</h1>
          <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>
            Análise temporal das leituras de sensores e do desempenho hídrico.
          </p>
        </div>

        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          {/* Period selector */}
          <div style={{ display:"flex", gap:4, background:"white", padding:4,
                        borderRadius:12, boxShadow:"var(--shadow-sm)",
                        border:"1px solid rgba(16,185,129,0.1)" }}>
            {PERIODS.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer",
                         background: period === key ? "#064e3b" : "transparent",
                         color: period === key ? "white" : "#6b7280",
                         fontWeight:600, fontSize:13, transition:"all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setShowSimulator((v) => !v)} className="hover-scale"
            style={{ background:"white", border:"1px solid rgba(16,185,129,0.12)", borderRadius:10,
                     padding:"9px 16px", fontSize:13, fontWeight:600, color:"#047857",
                     display:"flex", alignItems:"center", gap:7, cursor:"pointer",
                     boxShadow:"var(--shadow-sm)" }}>
            {showSimulator ? <X size={14}/> : <Plus size={14}/>}
            Simular Leitura
          </button>

          <button onClick={handleExport} className="hover-scale"
            style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none",
                     borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:600,
                     color:"white", display:"flex", alignItems:"center", gap:7,
                     cursor:"pointer", boxShadow:"var(--shadow-md)" }}>
            <Download size={14}/>
            Exportar
          </button>
        </div>
      </div>

      {/* Simulator */}
      {showSimulator && (
        <div className="glass-panel" style={{ padding:24, background:"white",
                                              border:"1px solid rgba(16,185,129,0.12)" }}>
          <h2 style={{ fontSize:16, marginBottom:16 }}>Simulador de Sensores IoT</h2>
          <form onSubmit={handleSimulate}
            style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>Tipo de Leitura</label>
              <select value={sim.tipo} onChange={(e) => setSim((s) => ({ ...s, tipo:e.target.value }))}
                style={{ padding:"9px 12px", borderRadius:8,
                         border:"1px solid rgba(16,185,129,0.2)", outline:"none",
                         background:"white", fontSize:13 }}>
                <option value="clima">Clima (Temp/Umidade)</option>
                <option value="chuva">Chuva (Pluviômetro)</option>
              </select>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>ID Sensor</label>
              <select value={sim.idSensor} onChange={(e) => setSim((s) => ({ ...s, idSensor:e.target.value }))}
                style={{ padding:"9px 12px", borderRadius:8,
                         border:"1px solid rgba(16,185,129,0.2)", outline:"none",
                         background:"white", fontSize:13 }}>
                {sensores.length > 0
                  ? sensores.map((s) => (
                      <option key={s.idSensor || s.id_sensor} value={s.idSensor || s.id_sensor}>
                        #{s.idSensor || s.id_sensor} — {s.nome}
                      </option>
                    ))
                  : <option value="1">Sensor #1</option>}
              </select>
            </div>

            {sim.tipo === "clima" ? (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>Temperatura (°C)</label>
                  <input type="number" step="0.1" value={sim.temperature}
                    onChange={(e) => setSim((s) => ({ ...s, temperature:e.target.value }))}
                    style={{ padding:"9px 12px", borderRadius:8,
                             border:"1px solid rgba(16,185,129,0.2)", outline:"none", fontSize:13 }}/>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>Umidade (%)</label>
                  <input type="number" step="0.1" value={sim.humidity}
                    onChange={(e) => setSim((s) => ({ ...s, humidity:e.target.value }))}
                    style={{ padding:"9px 12px", borderRadius:8,
                             border:"1px solid rgba(16,185,129,0.2)", outline:"none", fontSize:13 }}/>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>Chuva (mm/h)</label>
                  <input type="number" step="0.1" value={sim.mm}
                    onChange={(e) => setSim((s) => ({ ...s, mm:e.target.value }))}
                    style={{ padding:"9px 12px", borderRadius:8,
                             border:"1px solid rgba(16,185,129,0.2)", outline:"none", fontSize:13 }}/>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:20 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13,
                                  fontWeight:600, color:"#4b5563", cursor:"pointer" }}>
                    <input type="checkbox" checked={sim.chovendo}
                      onChange={(e) => setSim((s) => ({ ...s, chovendo:e.target.checked }))}
                      style={{ width:16, height:16, accentColor:"#10b981" }}/>
                    Está chovendo?
                  </label>
                </div>
              </>
            )}

            <div style={{ gridColumn:"1/-1", display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button type="button" onClick={() => setShowSimulator(false)}
                style={{ padding:"9px 20px", borderRadius:8, border:"1px solid #d1d5db",
                         background:"white", cursor:"pointer", fontSize:13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={simulating}
                style={{ padding:"9px 24px", borderRadius:8, border:"none",
                         background:"linear-gradient(135deg,#10b981,#059669)", color:"white",
                         cursor:"pointer", fontWeight:600, fontSize:13,
                         display:"flex", alignItems:"center", gap:7 }}>
                <Send size={13}/>
                {simulating ? "Enviando..." : "Simular e Enviar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          {Array.from({length:4}).map((_,i) => (
            <div key={i} className="glass-panel" style={{ flex:"1 1 160px", height:100, padding:20 }}>
              <div className="skeleton" style={{ height:14, width:"40%", marginBottom:10 }}/>
              <div className="skeleton" style={{ height:32, width:"60%" }}/>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          <KpiCard
            icon={<Droplet size={18}/>}
            value={umidadeMedia > 0 ? `${umidadeMedia}%` : "—"}
            unit="" label="Umidade média"
            delta={umidadeMedia > 0 ? +4 : undefined} deltaUnit="%"
          />
          <KpiCard
            icon={<CloudRain size={18}/>}
            value={chuvaAcumulada > 0 ? `${chuvaAcumulada}mm` : "—"}
            unit="" label="Chuva acumulada"
            delta={chuvaAcumulada > 0 ? +12 : undefined} deltaUnit="mm"
          />
          <KpiCard
            icon={<Thermometer size={18}/>}
            value={tempMedia > 0 ? `${tempMedia}°C` : "—"}
            unit="" label="Temp. média"
            delta={tempMedia > 0 ? -1 : undefined} deltaUnit="°C"
            positiveIsGood={false}
          />
          <KpiCard
            icon={<Recycle size={18}/>}
            value={aguaReaproveitada > 0 ? `${aguaReaproveitada}L` : "—"}
            unit="" label="Água reaproveitada"
            delta={aguaReaproveitada > 0 ? +8 : undefined} deltaUnit="%"
          />
        </div>
      )}

      {/* Main chart — Umidade & Temperatura */}
      <div className="glass-panel" style={{ padding:24, background:"white" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                      marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div>
            <h2 style={{ fontSize:16, margin:0 }}>Umidade do solo & temperatura</h2>
            <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Correlação ambiental no período</p>
          </div>
          <button onClick={() => fetchData(true)}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color:"#9ca3af", display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""}/>
          </button>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height:240, borderRadius:12 }}/>
        ) : climaChart.length === 0 ? (
          <div style={{ height:240, display:"flex", alignItems:"center",
                        justifyContent:"center", color:"#9ca3af", fontSize:13 }}>
            Sem dados de clima para o período selecionado.
          </div>
        ) : (
          <div style={{ width:"100%", height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={climaChart} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                <defs>
                  <linearGradient id="humGradHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                  <linearGradient id="tempGradHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false}
                       interval={Math.floor(climaChart.length / 8)}/>
                <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Legend iconType="circle" wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
                <Area type="monotone" dataKey="umidade" name="umidade"
                  stroke="#10b981" strokeWidth={2.5} fill="url(#humGradHist)"/>
                <Area type="monotone" dataKey="temperatura" name="temperatura"
                  stroke="#f59e0b" strokeWidth={2} fill="url(#tempGradHist)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two smaller charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }} className="hist-grid">

        {/* Rain chart */}
        <div className="glass-panel" style={{ padding:24, background:"white" }}>
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:15, margin:0 }}>Chuva (mm)</h2>
            <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Precipitação acumulada no período</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height:180, borderRadius:12 }}/>
          ) : chuvaChart.length === 0 ? (
            <div style={{ height:180, display:"flex", alignItems:"center",
                          justifyContent:"center", color:"#9ca3af", fontSize:13 }}>
              Sem dados de chuva no período.
            </div>
          ) : (
            <div style={{ width:"100%", height:180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chuvaChart} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false}
                         interval={Math.floor(chuvaChart.length / 6)}/>
                  <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Bar dataKey="chuva" name="Chuva (mm/h)" fill="#3b82f6"
                       radius={[4,4,0,0]} maxBarSize={20}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Reservoir & flow chart */}
        <div className="glass-panel" style={{ padding:24, background:"white" }}>
          <div style={{ marginBottom:16 }}>
            <h2 style={{ fontSize:15, margin:0 }}>Nível do reservatório & vazão</h2>
            <p style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Estimativa baseada nas leituras</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height:180, borderRadius:12 }}/>
          ) : (
            <div style={{ width:"100%", height:180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reservoirChart} margin={{ top:5, right:8, left:-22, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" stroke="#c1c9d2" fontSize={10} tickLine={false}
                         interval={Math.floor(reservoirChart.length / 6)}/>
                  <YAxis stroke="#c1c9d2" fontSize={10} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" wrapperStyle={{ fontSize:11, paddingTop:8 }}/>
                  <Line type="monotone" dataKey="nivel" name="Nível (%)"
                    stroke="#10b981" strokeWidth={2.5} dot={false}/>
                  <Line type="monotone" dataKey="vazao" name="Vazão (L/min)"
                    stroke="#06b6d4" strokeWidth={2} dot={false} strokeDasharray="5 3"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) { .hist-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default HistoricoPage;
