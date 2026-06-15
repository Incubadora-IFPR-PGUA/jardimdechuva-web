/**
 * sensorJsonParser.js
 *
 * Analisa um array de leituras ({ valorJson, valor, dataHora })
 * e detecta automaticamente quais séries exibir no gráfico,
 * com cores, unidades e labels corretos.
 */

// ── Regras de detecção ──────────────────────────────────────────────────────
// Ordem importa: regras mais específicas primeiro.
const DETECTION_RULES = [
  {
    tipo: 'ar',
    label: 'Qualidade do Ar',
    match: (keys) => keys.includes('pm25') || keys.includes('pm10') || keys.includes('pm2_5'),
    series: [
      { key: 'pm25',    label: 'PM2.5 (µg/m³)', color: '#8b5cf6', altKeys: ['pm2_5', 'pm2.5'] },
      { key: 'pm10',    label: 'PM10 (µg/m³)',  color: '#f59e0b' },
    ],
    unit: 'µg/m³',
    icon: 'wind',
    qualidade: (val) => {
      if (val == null) return null;
      if (val <= 12)    return { label: 'Bom',          color: '#10b981' };
      if (val <= 35.4)  return { label: 'Moderado',     color: '#f59e0b' };
      if (val <= 55.4)  return { label: 'Insalubre*',   color: '#f97316' };
      if (val <= 150.4) return { label: 'Insalubre',    color: '#ef4444' };
      if (val <= 250.4) return { label: 'Muito insalubre', color: '#9f1239' };
      return              { label: 'Perigoso',     color: '#581c87' };
    },
  },
  {
    tipo: 'clima',
    label: 'Clima',
    match: (keys) => keys.includes('temperature') || keys.includes('temperatura') ||
                     keys.includes('humidity')    || keys.includes('umidade'),
    series: [
      { key: 'temperature', label: 'Temperatura (°C)', color: '#f97316', altKeys: ['temperatura'] },
      { key: 'humidity',    label: 'Umidade (%)',       color: '#10b981', altKeys: ['umidade'] },
    ],
    unit: '°C / %',
    icon: 'thermometer',
    qualidade: null,
  },
  {
    tipo: 'chuva',
    label: 'Chuva',
    match: (keys) => keys.includes('deltaV') || keys.includes('delta_v') ||
                     keys.includes('mm')     || keys.includes('chovendo'),
    series: [
      { key: 'mm',     label: 'Precipitação (mm)', color: '#3b82f6', altKeys: ['deltaV', 'delta_v', 'valor'] },
    ],
    unit: 'mm',
    icon: 'cloud-rain',
    qualidade: null,
  },
  {
    tipo: 'nivel',
    label: 'Nível de Água',
    match: (keys) => keys.includes('nivel') || keys.includes('distancia') || keys.includes('cm'),
    series: [
      { key: 'nivel',     label: 'Nível (%)',     color: '#06b6d4', altKeys: ['distancia'] },
    ],
    unit: '%',
    icon: 'waves',
    qualidade: null,
  },
  {
    tipo: 'luminosidade',
    label: 'Luminosidade',
    match: (keys) => keys.includes('lux') || keys.includes('luminosidade') || keys.includes('light'),
    series: [
      { key: 'lux', label: 'Luminosidade (lux)', color: '#f59e0b', altKeys: ['luminosidade', 'light'] },
    ],
    unit: 'lux',
    icon: 'sun',
    qualidade: null,
  },
  {
    tipo: 'ph',
    label: 'pH do Solo',
    match: (keys) => keys.includes('ph'),
    series: [
      { key: 'ph', label: 'pH', color: '#8b5cf6' },
    ],
    unit: 'pH',
    icon: 'flask',
    qualidade: (val) => {
      if (val == null) return null;
      if (val < 5.5)  return { label: 'Muito ácido',  color: '#ef4444' };
      if (val < 6.0)  return { label: 'Ácido',        color: '#f97316' };
      if (val <= 7.0) return { label: 'Ideal',        color: '#10b981' };
      if (val <= 8.0) return { label: 'Alcalino',     color: '#f59e0b' };
      return            { label: 'Muito alcalino', color: '#ef4444' };
    },
  },
  {
    tipo: 'solo',
    label: 'Umidade do Solo',
    match: (keys) => keys.includes('solo') || keys.includes('capacitancia') || keys.includes('vwc'),
    series: [
      { key: 'solo', label: 'Umidade do Solo (%)', color: '#10b981', altKeys: ['capacitancia', 'vwc'] },
    ],
    unit: '%',
    icon: 'droplet',
    qualidade: null,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve o valor de uma série: tenta key principal, depois altKeys.
 */
function resolveVal(json, serie) {
  if (json == null) return null;
  let v = json[serie.key];
  if (v == null && serie.altKeys) {
    for (const alt of serie.altKeys) {
      v = json[alt];
      if (v != null) break;
    }
  }
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Analisa um array de leituras e retorna a configuração detectada.
 * @param {Array} leituras  — array de objetos { valorJson, valor, dataHora }
 * @param {object} [tipoSensor] — { nome, unidade } do sensor cadastrado (fallback)
 * @returns {object} config — { tipo, label, unit, series, qualidade, chartData }
 */
export function parseLeituras(leituras, tipoSensor = {}) {
  if (!leituras || leituras.length === 0) {
    return { tipo: 'vazio', label: 'Sem dados', unit: '', series: [], qualidade: null, chartData: [] };
  }

  // Coletar todas as chaves JSON que aparecem nas leituras
  const allKeys = new Set();
  leituras.forEach((l) => {
    const j = l.valorJson || l.valor_json;
    if (j && typeof j === 'object') Object.keys(j).forEach((k) => allKeys.add(k));
  });
  const keys = [...allKeys];

  // Detectar regra
  let rule = DETECTION_RULES.find((r) => r.match(keys));

  // Fallback: usar campo `valor` numérico com unidade do tipoSensor
  if (!rule) {
    rule = {
      tipo: 'generico',
      label: tipoSensor.nome || 'Sensor',
      match: () => true,
      series: [{ key: '_valor', label: `Valor (${tipoSensor.unidade || ''})`, color: '#10b981' }],
      unit: tipoSensor.unidade || '',
      icon: 'cpu',
      qualidade: null,
    };
  }

  // Montar chartData
  const chartData = [...leituras].reverse().map((l) => {
    const json = l.valorJson || l.valor_json || {};
    const point = {
      name: new Date(l.dataHora || l.data_hora).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }),
      _raw: l,
    };

    rule.series.forEach((s) => {
      if (s.key === '_valor') {
        const v = l.valor ?? l.valor_atual;
        point[s.key] = v != null ? parseFloat(Number(v).toFixed(3)) : null;
      } else {
        const v = resolveVal(json, s);
        point[s.key] = v != null ? parseFloat(Number(v).toFixed(3)) : null;
      }
    });

    return point;
  });

  return {
    tipo: rule.tipo,
    label: rule.label,
    unit: rule.unit,
    icon: rule.icon,
    series: rule.series,
    qualidade: rule.qualidade,
    chartData,
  };
}

/**
 * Calcula KPIs (média, máx, mín, total) para a primeira série principal.
 */
export function calcKpis(chartData, series) {
  const results = {};
  series.forEach((s) => {
    const vals = chartData.map((d) => d[s.key]).filter((v) => v != null);
    if (vals.length === 0) {
      results[s.key] = { media: null, max: null, min: null, total: 0 };
    } else {
      const soma = vals.reduce((a, b) => a + b, 0);
      results[s.key] = {
        media: parseFloat((soma / vals.length).toFixed(2)),
        max:   parseFloat(Math.max(...vals).toFixed(2)),
        min:   parseFloat(Math.min(...vals).toFixed(2)),
        total: vals.length,
      };
    }
  });
  return results;
}

/**
 * Exporta leituras para CSV dinamicamente.
 */
export function exportCsv(chartData, series, sensorNome, periodo) {
  const headers = ['DataHora', ...series.map((s) => s.label)];
  const rows = chartData.map((d) => [
    d.name,
    ...series.map((s) => (d[s.key] != null ? d[s.key] : '')),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${sensorNome || 'sensor'}_${periodo}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
