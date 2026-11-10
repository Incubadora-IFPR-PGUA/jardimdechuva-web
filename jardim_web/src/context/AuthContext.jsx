import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import api, { STORAGE_KEYS, EVENTO_SESSAO_EXPIRADA } from "../services/api";

const AuthContext = createContext(null);

const lerUsuarioSalvo = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.user);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const limparSessaoSalva = () => {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(lerUsuarioSalvo);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  // Enquanto /auth/me confirma a sessão salva e traz o perfil de acesso atualizado
  const [sessaoCarregando, setSessaoCarregando] = useState(() => !!localStorage.getItem(STORAGE_KEYS.token));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (refreshToken) {
      // Revoga o refresh token no servidor; a sessão local termina mesmo se isso falhar
      api.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
    }
    limparSessaoSalva();
    setUser(null);
    setToken(null);
    setError(null);
    setSessaoCarregando(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;

    api.get("/auth/me")
      .then(({ data }) => {
        if (cancelado) return;
        setUser(data.data);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.data));
      })
      .catch((err) => {
        // 401 é tratado pelo interceptor (renova o token ou encerra a sessão)
        if (err.response?.status !== 401) console.error("Não foi possível validar a sessão", err);
      })
      .finally(() => {
        if (!cancelado) setSessaoCarregando(false);
      });

    return () => { cancelado = true; };
  }, [token]);

  useEffect(() => {
    const aoExpirarSessao = () => {
      toast.info("Sua sessão expirou. Faça login novamente.", { toastId: "sessao-expirada" });
      logout();
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
  }, [logout]);

  const login = useCallback(async (email, senha) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { email, senha });

      // O retorno real é: { data: { access_token, refresh_token, usuario: { ..., perfil } }, message, status }
      const { access_token: tk, refresh_token: refreshToken, usuario: u } = data.data;

      localStorage.setItem(STORAGE_KEYS.token, tk);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
      setToken(tk);
      setUser(u);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response ? "Não foi possível entrar. Tente novamente." : "Servidor indisponível. Verifique sua conexão.");
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Perfil calculado pelo backend: { papel, nivel, permissoes }. O backend valida
  // as permissões em cada requisição; aqui elas servem para montar a interface.
  const perfil = user?.perfil ?? null;
  const can = useCallback(
    (permissao) => Boolean(perfil?.permissoes?.includes(permissao)),
    [perfil]
  );

  return (
    <AuthContext.Provider
      value={{
        user, token, loading, error, login, logout, clearError,
        isAuthenticated: !!user,
        sessaoCarregando, perfil, can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export default AuthContext;
