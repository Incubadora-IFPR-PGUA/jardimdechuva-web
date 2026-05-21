import axios from "axios";

const baseURL = import.meta.env.API_URL;

// adiciona esse log temporário no topo do api.js
console.log('BASE URL:', import.meta.env.API_URL)
export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Requisição
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 [API] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ [API] Erro ao enviar requisição:", error);
    return Promise.reject(error);
  },
);

// Resposta
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ [API] ${error.response.status} ${error.response.config.url}`, error.response.data);
    } else if (error.request) {
      console.error("❌ [API] Sem resposta do servidor — verifique se a API está rodando");
    } else {
      console.error("❌ [API] Erro inesperado:", error.message);
    }
    return Promise.reject(error);
  },
);

// Endpoints
export const leituraService = {
  listar: () => api.get('/leituras'),
  
}

export const sensorService = {
  listar: () => api.get('/sensores'),
}

export const atuadorService = {
  listar: () => api.get('/atuadores'),
}