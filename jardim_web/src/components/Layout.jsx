import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Cpu,
  Sliders,
  History,
  Bell,
  Search,
  Menu,
  X,
  Droplet
} from "lucide-react";

const Layout = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/sensores", label: "Sensores", icon: Cpu },
    { path: "/atuadores", label: "Atuadores", icon: Sliders },
    { path: "/historico", label: "Histórico", icon: History },
    { path: "/notificacoes", label: "Notificações", icon: Bell }
  ];

  const currentPath = location.pathname;

  return (
    <div className="app-layout" style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      {/* Sidebar Overlay for Mobile */}
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
        className="sidebar-container"
        style={{
          transform: isSidebarOpen ? "translateX(0)" : "",
          left: isSidebarOpen ? 0 : ""
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
          {/* Sidebar Header / Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white"
              }}
            >
              <Droplet size={24} />
            </div>
            <div>
              <h2 className="logo-title" style={{ fontSize: "16px", margin: 0, fontWeight: "700", color: "#064e3b" }}>
                Jardim de Chuva
              </h2>
              <p className="logo-subtitle" style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                IoT Inteligente
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: isActive ? "#047857" : "#4b5563",
                    backgroundColor: isActive ? "#d1fae5" : "transparent",
                    fontWeight: isActive ? "600" : "500",
                    fontSize: "14px",
                    transition: "all 0.2s ease"
                  }}
                  className="hover-scale"
                >
                  <Icon size={18} style={{ color: isActive ? "#059669" : "#6b7280" }} />
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - System Status Indicator */}
        <div style={{ padding: "0 8px", width: "100%" }}>
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
                boxShadow: "0 0 8px #10b981"
              }}
            />
            <span className="sidebar-footer-text" style={{ fontSize: "12px", fontWeight: "600" }}>
              Sistema online
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="main-content">
        {/* Top Navbar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "16px",
            borderBottom: "1px solid rgba(16, 185, 129, 0.08)",
            width: "100%"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                background: "white",
                border: "1px solid rgba(16, 185, 129, 0.1)",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)"
              }}
              className="mobile-toggle-btn"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Search Input */}
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
                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(16, 185, 129, 0.1)")}
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Notification Bell */}
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
                boxShadow: "var(--shadow-sm)",
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

            {/* Profile Avatar */}
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
        <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
          {children}
        </main>
      </div>

      {/* Extra styles for media queries inside Layout */}
      <style>{`
        @media (max-width: 1024px) {
          .mobile-toggle-btn {
            display: flex !important;
          }
        }
        @media (max-width: 640px) {
          .mobile-toggle-btn {
            display: flex !important;
          }
          header {
            padding: 8px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
