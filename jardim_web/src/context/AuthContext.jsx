import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("jdc_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("jdc_token") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, senha) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { email, senha });

      // O retorno real é: { data: { access_token, refresh_token, usuario }, message, status }
      const tk = data.data.access_token;
      const u  = data.data.usuario;

      setToken(tk);
      setUser(u);
      localStorage.setItem("jdc_token", tk);
      localStorage.setItem("jdc_user", JSON.stringify(u));
      api.defaults.headers.common["Authorization"] = `Bearer ${tk}`;
      return { success: true };
    } catch (err) {
      // ... resto igual
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem("jdc_token");
    localStorage.removeItem("jdc_user");
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, clearError, isAuthenticated: !!user }}>
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
