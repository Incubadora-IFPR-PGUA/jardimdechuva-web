import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ── Interceptors ──────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`🚀 [API] ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error("❌ [API] Request error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ [API] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ [API] ${error.response.status} ${error.response.config?.url}`, error.response.data);
    } else if (error.request) {
      console.warn("⚠️ [API] Sem resposta do servidor — verifique se a API está rodando na porta 3333.");
    } else {
      console.error("❌ [API] Erro inesperado:", error.message);
    }
    return Promise.reject(error);
  }
);

// ── Leituras de Sensores ──────────────────────────────────────
export const leituraService = {
  listar:           (params)         => api.get("/leituras", { params }),
  listarPorSensor:  (idSensor, params) => api.get("/leituras", { params: { idSensor, ...params } }),
  buscar:           (id)             => api.get(`/leituras/${id}`),
  listarChuva:      (params)         => api.get("/leituras/chuva", { params }),
  listarClima:      (params)         => api.get("/leituras/clima", { params }),
  listarAr:         (params)         => api.get("/leituras/ar",    { params }),
  registrarChuva:   (data)           => api.post("/leituras/chuva", data),
  registrarClima:   (data)           => api.post("/leituras/clima", data),
  registrarAr:      (data)           => api.post("/leituras/ar",    data),
  criar:            (data)           => api.post("/leituras", data),
};

// ── Sensores ──────────────────────────────────────────────────
export const sensorService = {
  listar: () => api.get("/sensores"),
  buscar: (id) => api.get(`/sensores/${id}`),
  criar: (data) => api.post("/sensores", data),
  atualizar: (id, d) => api.put(`/sensores/${id}`, d),
  deletar: (id) => api.delete(`/sensores/${id}`),
};

// ── Atuadores ─────────────────────────────────────────────────
export const atuadorService = {
  listar: () => api.get("/atuadores"),
  buscar: (id) => api.get(`/atuadores/${id}`),
  criar: (data) => api.post("/atuadores", data),
  atualizar: (id, d) => api.put(`/atuadores/${id}`, d),
  deletar: (id) => api.delete(`/atuadores/${id}`),
};

// ── Alertas ───────────────────────────────────────────────────
export const alertaService = {
  listar: (params) => api.get("/alertas", { params }),
  buscar: (id) => api.get(`/alertas/${id}`),
  criar: (data) => api.post("/alertas", data),
  deletar: (id) => api.delete(`/alertas/${id}`),
};

// ── Automações ────────────────────────────────────────────────
export const automacaoService = {
  listar: (params) => api.get("/automacoes", { params }),
  buscar: (id) => api.get(`/automacoes/${id}`),
  criar: (data) => api.post("/automacoes", data),
  atualizar: (id, d) => api.put(`/automacoes/${id}`, d),
  deletar: (id) => api.delete(`/automacoes/${id}`),
};

// ── Jardins ───────────────────────────────────────────────────
export const jardimService = {
  listar: () => api.get("/jardins"),
  buscar: (id) => api.get(`/jardins/${id}`),
  criar: (d) => api.post("/jardins", d),
};

// ── Tipos ─────────────────────────────────────────────────────
export const tipoSensorService = { listar: () => api.get("/tipos-sensores") };
export const tipoDispositivoService = { listar: () => api.get("/tipos-dispositivos") };

export default api;