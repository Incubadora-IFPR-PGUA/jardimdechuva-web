import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Cpu,
  Sliders,
  History,
  Bell,
  Trees,
  Search,
  Menu,
  LogOut,
  Droplet,
  Users,
  Shield,
  Building,
  Server,
  Settings
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROTULO_PAPEL } from "../utils/papeis";

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, can, perfil } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  // Itens com `permissao` só aparecem para quem a tem (perfil calculado pelo backend)
  const podeVer = (item) => !item.permissao || can(item.permissao);

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/jardins", label: "Jardins", icon: Trees, permissao: "jardins.ver" },
    { path: "/sensores", label: "Sensores", icon: Cpu, permissao: "sensores.ver" },
    { path: "/atuadores", label: "Atuadores", icon: Sliders, permissao: "atuadores.ver" },
    { path: "/historico", label: "Histórico", icon: History, permissao: "leituras.ver" },
    { path: "/notificacoes", label: "Notificações", icon: Bell, permissao: "alertas.ver" }
  ].filter(podeVer);

  const adminItems = [
    { path: "/usuarios", label: "Usuários", icon: Users, permissao: "usuarios.gerenciar" },
    { path: "/cargos", label: "Cargos", icon: Shield, permissao: "cargos.gerenciar" },
    { path: "/organizacoes", label: "Organizações", icon: Building, permissao: "organizacoes.gerenciar" },
    { path: "/dispositivos", label: "Dispositivos", icon: Server, permissao: "dispositivos.gerenciar" },
    { path: "/tipos-dispositivos", label: "Tipos Dispositivos", icon: Cpu, permissao: "tipos.gerenciar" },
    { path: "/tipos-sensores", label: "Tipos Sensores", icon: Settings, permissao: "tipos.gerenciar" }
  ].filter(podeVer);

  const currentPath = location.pathname;

  return (
    <div className="app-layout" style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      {/* Sidebar Overlay Mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(6, 78, 59, 0.4)",
            zIndex: 99,
            backdropFilter: "blur(4px)"
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`sidebar-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${isSidebarOpen ? "mobile-open" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: isSidebarCollapsed && window.innerWidth > 768 ? "80px" : "260px",
          padding: isSidebarCollapsed && window.innerWidth > 768 ? "24px 12px" : "24px 16px",
          transition: "all 0.3s ease",
          flexShrink: 0
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
          {/* Logo Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px", minHeight: "42px", justifyContent: isSidebarCollapsed ? "center" : "flex-start" }}>
            <button
              type="button"
              onClick={handleToggleSidebar}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4b5563",
                padding: "4px",
                borderRadius: "8px",
              }}
              className="hover-scale"
            >
              <Menu size={22} />
            </button>

            {!isSidebarCollapsed && (
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "#f0fdf4",
                  border: "1px solid rgba(16,185,129,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/logo-jardim.png"
                  alt="Jardim de Chuva"
                  style={{ width: "36px", height: "36px", objectFit: "contain" }}
                  onError={(e) => { e.target.style.display = "none"; e.target.parentElement.querySelector(".logo-fallback").style.display = "flex"; }}
                />
                <div className="logo-fallback" style={{ display: "none", alignItems: "center", justifyContent: "center" }}>
                  <Droplet size={22} style={{ color: "#10b981" }} />
                </div>
              </div>
            )}

            {!isSidebarCollapsed && (
              <div>
                <h2 className="logo-title" style={{ fontSize: "15px", margin: 0, fontWeight: "700", color: "#064e3b" }}>
                  Jardim de Chuva
                </h2>
                <p className="logo-subtitle" style={{ fontSize: "10px", color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
                  Inteligente
                </p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {!isSidebarCollapsed && (
              <p
                className="sidebar-label"
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#9ca3af",
                  paddingLeft: "8px",
                  marginBottom: "4px"
                }}
              >
                Operação
              </p>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                    gap: "12px",
                    padding: isSidebarCollapsed ? "12px" : "12px 16px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: isActive ? "#047857" : "#4b5563",
                    backgroundColor: isActive ? "#d1fae5" : "transparent",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "14px",
                    transition: "all 0.2s ease"
                  }}
                  className="hover-scale sidebar-link"
                >
                  <Icon size={18} style={{ color: isActive ? "#059669" : "#6b7280", flexShrink: 0 }} />
                  {!isSidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                </Link>
              );
            })}

            {!isSidebarCollapsed && adminItems.length > 0 && (
              <p
                className="sidebar-label"
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#9ca3af",
                  paddingLeft: "8px",
                  marginTop: "16px",
                  marginBottom: "4px"
                }}
              >
                Administração
              </p>
            )}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                    gap: "12px",
                    padding: isSidebarCollapsed ? "12px" : "12px 16px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: isActive ? "#047857" : "#4b5563",
                    backgroundColor: isActive ? "#d1fae5" : "transparent",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "14px",
                    transition: "all 0.2s ease"
                  }}
                  className="hover-scale sidebar-link"
                >
                  <Icon size={18} style={{ color: isActive ? "#059669" : "#6b7280", flexShrink: 0 }} />
                  {!isSidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div style={{ padding: "0 8px", width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "#ecfdf5",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "#065f46"
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px #10b981",
                flexShrink: 0,
              }}
            />
            {!isSidebarCollapsed && (
              <span className="sidebar-footer-text" style={{ fontSize: "12px", fontWeight: "600", flex: 1 }}>
                Sistema online
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "transparent",
              border: "1px solid rgba(239,68,68,0.12)",
              color: "#dc2626",
              cursor: "pointer",
              width: "100%",
              fontSize: "13px",
              fontWeight: "600",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s ease",
            }}
          >
            <LogOut size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
            {!isSidebarCollapsed && (
              <span className="sidebar-footer-text">{user?.nome?.split(" ")[0] ?? "Sair"}</span>
            )}
            {!isSidebarCollapsed && perfil?.papel && (
              <span className="sidebar-footer-text" style={{ marginLeft: "auto", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                {ROTULO_PAPEL[perfil.papel] ?? perfil.papel}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div 
        className="main-content" 
        style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          minWidth: 0,
          padding: "24px"
        }}
      >
        {/* Top Navbar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "16px",
            borderBottom: "1px solid rgba(16, 185, 129, 0.08)",
            width: "100%",
            marginBottom: "24px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af"
                }}
              />
              <input
                type="text"
                placeholder="Buscar sensores, atuadores, eventos..."
                style={{
                  width: "100%",
                  padding: "10px 16px 10px 42px",
                  borderRadius: "14px",
                  border: "1px solid rgba(16, 185, 129, 0.1)",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              to="/notificacoes"
              style={{
                position: "relative",
                background: "white",
                border: "1px solid rgba(16, 185, 129, 0.1)",
                borderRadius: "12px",
                padding: "10px",
                color: "#4b5563",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease"
              }}
              className="hover-scale"
            >
              <Bell size={18} />
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444"
                }}
              />
            </Link>

            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "#d1fae5",
                color: "#065f46",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                fontSize: "14px",
                border: "1px solid rgba(16, 185, 129, 0.2)"
              }}
            >
              JC
            </div>
          </div>
        </header>

        {/* Page Children Container */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;