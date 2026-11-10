import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

export const STORAGE_KEYS = {
  token: "jdc_token",
  refreshToken: "jdc_refresh_token",
  user: "jdc_user",
};

// Disparado quando não é mais possível renovar o token; o AuthContext faz o logout
export const EVENTO_SESSAO_EXPIRADA = "jdc:sessao-expirada";

// ── Renovação do token ────────────────────────────────────────
// O access token dura 15 min. Requisições que falham juntas aguardam a mesma renovação.
let renovacaoEmAndamento = null;

const renovarToken = () => {
  if (!renovacaoEmAndamento) {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    renovacaoEmAndamento = (
      refreshToken
        ? api.post("/auth/refresh", { refresh_token: refreshToken }).then(({ data }) => {
            const novoToken = data.data.access_token;
            localStorage.setItem(STORAGE_KEYS.token, novoToken);
            return novoToken;
          })
        : Promise.reject(new Error("Sem refresh token"))
    ).finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
};

// ── Interceptors ──────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.token)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.env.DEV) {
      console.log(`🚀 [API] ${config.method.toUpperCase()} ${config.url}`)
    }

    return config
  },
  (error) => {
    console.error('❌ [API] Request error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ [API] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error(`❌ [API] ${error.response.status} ${error.response.config?.url}`, error.response.data);
    } else if (error.request) {
      console.warn("⚠️ [API] Sem resposta do servidor — verifique se a API está rodando na porta 3333.");
    } else {
      console.error("❌ [API] Erro inesperado:", error.message);
    }

    // 401 = token expirado/inválido: renova uma vez e repete a requisição.
    // 403 (sem permissão) não passa por aqui: a sessão continua válida.
    const original = error.config;
    const url = original?.url || "";
    const rotaDeAutenticacao = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (error.response?.status === 401 && original && !rotaDeAutenticacao) {
      if (!original._tokenRenovado) {
        original._tokenRenovado = true;
        try {
          const novoToken = await renovarToken();
          original.headers.Authorization = `Bearer ${novoToken}`;
          return api(original);
        } catch {
          // Não foi possível renovar: segue para encerrar a sessão
        }
      }
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
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
  acionar: (id, acao) => api.post(`/atuadores/${id}/acionar`, { acao }), // acao: "ligar" | "desligar"
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
export const tipoSensorService = {
  listar: () => api.get("/tipos-sensores"),
  buscar: (id) => api.get(`/tipos-sensores/${id}`),
  criar: (data) => api.post("/tipos-sensores", data),
  atualizar: (id, d) => api.put(`/tipos-sensores/${id}`, d),
  deletar: (id) => api.delete(`/tipos-sensores/${id}`),
};

export const tipoDispositivoService = {
  listar: () => api.get("/tipos-dispositivos"),
  buscar: (id) => api.get(`/tipos-dispositivos/${id}`),
  criar: (data) => api.post("/tipos-dispositivos", data),
  atualizar: (id, d) => api.put(`/tipos-dispositivos/${id}`, d),
  deletar: (id) => api.delete(`/tipos-dispositivos/${id}`),
};
// ── Usuários ──────────────────────────────────────────────────
export const usuarioService = {
  listar: () => api.get("/usuarios"),
  buscar: (id) => api.get(`/usuarios/${id}`),
  criar: (data) => api.post("/usuarios", data),
  atualizar: (id, d) => api.put(`/usuarios/${id}`, d),
  deletar: (id) => api.delete(`/usuarios/${id}`),
};

export default api;