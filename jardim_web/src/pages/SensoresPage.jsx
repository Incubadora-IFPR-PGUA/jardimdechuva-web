import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Droplet, CloudRain, Waves, Sun, Thermometer, Wind,
  FlaskConical, Gauge, Droplets, ScanLine, Cpu,
  RefreshCw, Search, Plus, Send, X
} from "lucide-react";
import { sensorService, api } from "../services/api";
import { toast } from "react-toastify";

// ─── Icon + config por tipo de sensor ────────────────────────────────────────

const resolveSensorConfig = (sensor) => {
  const tipo = (sensor.tipoSensor?.nome || sensor.nome || "").toLowerCase();

  const maps = [
    { keys: ["solo","capacitivo"],                    Icon: Droplet,     color:"#10b981", bg:"#ecfdf5", cat:"solo"   },
    { keys: ["chuva","pluv"],                         Icon: CloudRain,   color:"#3b82f6", bg:"#eff6ff", cat:"agua"   },
    { keys: ["nível","nivel","ultrass"],              Icon: Waves,       color:"#06b6d4", bg:"#ecfeff", cat:"agua"   },
    { keys: ["luminosidade","luz","bh17"],            Icon: Sun,         color:"#f59e0b", bg:"#fefce8", cat:"clima"  },
    { keys: ["temperatura","bme","dht"],              Icon: Thermometer, color:"#f97316", bg:"#fff7ed", cat:"clima"  },
    { keys: ["umidade ar","ar","umid"],               Icon: Wind,        color:"#10b981", bg:"#ecfdf5", cat:"clima"  },
    { keys: ["ph"],                                   Icon: FlaskConical,color:"#8b5cf6", bg:"#f5f3ff", cat:"agua"   },
    { keys: ["vazão","vazao","fluxo"],                Icon: Gauge,       color:"#06b6d4", bg:"#ecfeff", cat:"agua"   },
    { keys: ["qualidade","turbidez","ntu"],           Icon: Droplets,    color:"#10b981", bg:"#ecfdf5", cat:"agua"   },
    { keys: ["presença","presenca","rfid","acesso"],  Icon: ScanLine,    color:"#7c3aed", bg:"#f5f3ff", cat:"acesso" },
  ];

  const match = maps.find(({ keys }) => keys.some((k) => tipo.includes(k)));
  return match || { Icon: Cpu, color:"#6b7280", bg:"#f3f4f6", cat:"outros" };
};

const BADGE_MAP = {
  ideal:"badge-ideal", normal:"badge-normal", ótima:"badge-otima",
  otima:"badge-otima", leve:"badge-leve", baixo:"badge-baixo",
  alto:"badge-alto", saturado:"badge-warning", fora:"badge-fora",
  chovendo:"badge-info", seco:"badge-success", diurno:"badge-diurno",
  noturno:"badge-noturno", estavel:"badge-estavel", estável:"badge-estavel",
  ligado:"badge-success", desligado:"badge-gray",
};

const statusBadge = (estadoAtual) => {
  const e = (estadoAtual || "normal").toLowerCase().trim();
  return { cls: BADGE_MAP[e] || "badge-success", label: e.charAt(0).toUpperCase() + e.slice(1) };
};

// Filtro por categoria
const FILTERS = [
  { key:"todos", label:"Todos" },
  { key:"solo",  label:"Solo" },
  { key:"agua",  label:"Água" },
  { key:"clima", label:"Clima" },
  { key:"acesso",label:"Acesso" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const SensoresPage = () => {
  const [sensores, setSensores]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState({
    nome:"", idDispositivo:"1", idTipoSensor:"1",
    mqttTopicoLeitura:"", localizacao:""
  });

  const fetchSensores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res  = await sensorService.listar();
      setSensores(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os sensores.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSensores();
    const iv = setInterval(() => fetchSensores(true), 20000);
    return () => clearInterval(iv);
  }, [fetchSensores]);

  // Filtered + searched list
  const displayed = useMemo(() => {
    let list = sensores;
    if (activeFilter !== "todos") {
      list = list.filter((s) => resolveSensorConfig(s).cat === activeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.nome || "").toLowerCase().includes(q) ||
          (s.tipoSensor?.nome || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [sensores, activeFilter, search]);

  const ativos = sensores.length;

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.mqttTopicoLeitura) {
      toast.warn("Preencha nome e tópico MQTT.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/sensores", {
        ...form,
        idDispositivo: Number(form.idDispositivo),
        idTipoSensor:  Number(form.idTipoSensor),
      });
      toast.success(`Sensor "${form.nome}" cadastrado!`);
      setForm({ nome:"", idDispositivo:"1", idTipoSensor:"1", mqttTopicoLeitura:"", localizacao:"" });
      setShowForm(false);
      fetchSensores(true);
    } catch {
      toast.error("Erro ao cadastrar sensor. Verifique os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                    flexWrap:"wrap", gap:12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom:8 }}>
            {ativos} sensores ativos
          </span>
          <h1 style={{ fontSize:26, fontWeight:800, margin:0 }}>Sensores ambientais</h1>
          <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>
            Coleta contínua de dados físico-químicos e ambientais do jardim de chuva.
          </p>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => fetchSensores(true)} className="hover-scale"
            style={{ background:"white", border:"1px solid rgba(16,185,129,0.12)", borderRadius:10,
                     padding:"9px 16px", fontSize:13, fontWeight:600, color:"#047857",
                     display:"flex", alignItems:"center", gap:7, cursor:"pointer",
                     boxShadow:"var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="hover-scale"
            style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none",
                     borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:600,
                     color:"white", display:"flex", alignItems:"center", gap:7,
                     cursor:"pointer", boxShadow:"var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancelar" : "Novo Sensor"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding:24, background:"white",
                                              border:"1px solid rgba(16,185,129,0.12)" }}>
          <h2 style={{ fontSize:16, marginBottom:16 }}>Cadastrar Novo Sensor</h2>
          <form onSubmit={handleSubmit}
            style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
            {[
              { key:"nome",              label:"Nome do Sensor *",         placeholder:"Ex: Sensor de Chuva Setor A", type:"text" },
              { key:"mqttTopicoLeitura", label:"Tópico MQTT de Leitura *", placeholder:"Ex: sensor/chuva",           type:"text" },
              { key:"localizacao",       label:"Localização / Canteiro",   placeholder:"Ex: Canteiro A",              type:"text" },
              { key:"idDispositivo",     label:"ID do Dispositivo",        placeholder:"1",                           type:"number" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>{label}</label>
                <input type={type} value={form[key]} placeholder={placeholder}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={key === "nome" || key === "mqttTopicoLeitura"}
                  style={{ padding:"9px 12px", borderRadius:8,
                           border:"1px solid rgba(16,185,129,0.2)", outline:"none",
                           fontSize:13, background:"white" }} />
              </div>
            ))}

            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#4b5563" }}>Tipo de Sensor</label>
              <select value={form.idTipoSensor}
                onChange={(e) => setForm((f) => ({ ...f, idTipoSensor: e.target.value }))}
                style={{ padding:"9px 12px", borderRadius:8,
                         border:"1px solid rgba(16,185,129,0.2)", outline:"none",
                         background:"white", fontSize:13 }}>
                <option value="1">Chuva (Pluviômetro)</option>
                <option value="2">Clima (DHT22 / BME280)</option>
                <option value="3">Umidade do Solo</option>
                <option value="4">Nível de Água (Ultrassônico)</option>
                <option value="5">Luminosidade (BH1750)</option>
                <option value="6">pH do Solo</option>
                <option value="7">Vazão de Água</option>
                <option value="8">Qualidade da Água</option>
                <option value="9">Presença / Acesso</option>
              </select>
            </div>

            <div style={{ gridColumn:"1/-1", display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding:"9px 20px", borderRadius:8, border:"1px solid #d1d5db",
                         background:"white", cursor:"pointer", fontSize:13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding:"9px 24px", borderRadius:8, border:"none",
                         background:"linear-gradient(135deg,#10b981,#059669)", color:"white",
                         cursor:"pointer", display:"flex", alignItems:"center", gap:7,
                         fontWeight:600, fontSize:13 }}>
                <Send size={13} />
                {submitting ? "Cadastrando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    flexWrap:"wrap", gap:12 }}>
        {/* Search */}
        <div style={{ position:"relative", minWidth:240, flex:"0 1 300px" }}>
          <Search size={15} style={{ position:"absolute", left:12, top:"50%",
                                     transform:"translateY(-50%)", color:"#9ca3af" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar sensor..."
            style={{ width:"100%", padding:"9px 12px 9px 36px", borderRadius:12,
                     border:"1px solid rgba(16,185,129,0.12)", outline:"none",
                     background:"white", fontSize:13, boxShadow:"var(--shadow-sm)" }} />
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs">
          {FILTERS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveFilter(key)}
              className={`filter-tab ${activeFilter === key ? "active" : ""}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:14 }}>
          {Array.from({ length:8 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding:20, height:140 }}>
              <div className="skeleton" style={{ height:14, width:"60%", marginBottom:10 }} />
              <div className="skeleton" style={{ height:10, width:"40%", marginBottom:16 }} />
              <div className="skeleton" style={{ height:36, width:"50%", marginBottom:10 }} />
              <div className="skeleton" style={{ height:4 }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding:"48px 24px", textAlign:"center",
                                              background:"white" }}>
          <Cpu size={36} color="#d1d5db" style={{ marginBottom:12 }} />
          <p style={{ color:"#9ca3af", fontSize:14 }}>
            {search ? `Nenhum sensor encontrado para "${search}".` : "Nenhum sensor registrado ainda."}
          </p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:14 }}>
          {displayed.map((s) => {
            const { Icon, color, bg }        = resolveSensorConfig(s);
            const { cls, label }             = statusBadge(s.estadoAtual);
            const val = s.valorAtual != null ? parseFloat(s.valorAtual) : null;

            // Rough unit & progress
            const tipo = (s.tipoSensor?.nome || "").toLowerCase();
            let unit = "";
            let maxV = 100;
            if (tipo.includes("temperatura") || tipo.includes("bme") || tipo.includes("dht"))
              { unit = "°C"; maxV = 50; }
            else if (tipo.includes("chuva") || tipo.includes("pluv"))
              { unit = "mm/h"; maxV = 50; }
            else if (tipo.includes("ph"))      { unit = "pH"; maxV = 14; }
            else if (tipo.includes("vazão") || tipo.includes("fluxo"))
              { unit = "L/min"; maxV = 20; }
            else if (tipo.includes("luminosidade") || tipo.includes("bh17"))
              { unit = "klx"; }
            else if (tipo.includes("ntu") || tipo.includes("turbid"))
              { unit = "NTU"; }
            else if (tipo.includes("presença") || tipo.includes("rfid"))
              { unit = ""; maxV = 1; }
            else { unit = "%"; }

            const progress = val != null
              ? Math.min(100, Math.max(0, (val / maxV) * 100))
              : 0;

            const progressColorMap = {
              "#3b82f6":"blue", "#f59e0b":"orange", "#f97316":"orange",
              "#8b5cf6":"purple", "#06b6d4":"blue", "#7c3aed":"purple",
            };
            const progressColor = progressColorMap[color] || "green";

            return (
              <div key={s.idSensor || s.id_sensor}
                className="glass-panel hover-scale"
                style={{ padding:"18px 20px", background:"white", display:"flex",
                         flexDirection:"column", gap:13,
                         border:"1px solid rgba(16,185,129,0.07)" }}>
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:bg,
                                    display:"flex", alignItems:"center", justifyContent:"center", color }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#064e3b", lineHeight:1.2 }}>
                          {s.nome || "Sensor"}
                        </div>
                        <div style={{ fontSize:10, color:"#9ca3af" }}>
                          {s.tipoSensor?.nome || "Tipo desconhecido"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${cls}`} style={{ fontSize:10 }}>{label}</span>
                </div>

                {/* Value */}
                <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                  <span style={{ fontSize:30, fontWeight:800, color:"#064e3b",
                                 fontFamily:"var(--font-heading)", lineHeight:1 }}>
                    {val != null
                      ? val.toLocaleString("pt-BR", { maximumFractionDigits:1 })
                      : "—"}
                  </span>
                  {unit && (
                    <span style={{ fontSize:13, fontWeight:600, color:"#6b7280" }}>{unit}</span>
                  )}
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
  );
};

export default SensoresPage;
