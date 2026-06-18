import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Cpu, Sliders, History,
  Bell, Search, Menu, X, LogOut, Droplet
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import s from "./Layout.module.css";

const Layout = ({ children }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: "/",             label: "Dashboard",    icon: LayoutDashboard },
    { path: "/sensores",     label: "Sensores",     icon: Cpu },
    { path: "/atuadores",    label: "Atuadores",    icon: Sliders },
    { path: "/historico",    label: "Histórico",    icon: History },
    { path: "/jardins", label: "Jardins", icon: Bell },
    { path: "/notificacoes", label: "Notificações", icon: Bell },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={s.appLayout}>
      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          className={s.sidebarOverlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={s.sidebar}
        style={isSidebarOpen ? { transform: "translateX(0)", left: 0 } : {}}
      >
        <div className="flex flex-col gap-8 w-full">
          {/* Logo */}
          <div className={s.logoWrap}>
            <div className={s.logoIconBox}>
              <img
                src="/logo-jardim.png"
                alt="Jardim de Chuva"
                className={s.logoImg}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div style={{ display: "none", alignItems: "center", justifyContent: "center" }}>
                <Droplet size={22} style={{ color: "#10b981" }} />
              </div>
            </div>
            <div>
              <h2 className={s.logoTitle}>Jardim de Chuva</h2>
              <p className={s.logoSubtitle}>Inteligente</p>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-2">
            <p className={s.navLabel}>Operação</p>
            {menuItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`${s.navLink} ${isActive ? s.navLinkActive : ""} hover-scale`}
                >
                  <Icon
                    size={18}
                    className={`${s.navLinkIcon} ${isActive ? s.navLinkIconActive : ""}`}
                  />
                  <span className={s.logoTitle}>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer do sidebar */}
        <div className={s.sidebarFooter}>
          <div className={s.statusBadge}>
            <span className={s.statusDot} />
            <span className={s.statusText}>Sistema online</span>
          </div>
          <button className={s.logoutBtn} onClick={handleLogout}>
            <LogOut size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
            <span className={s.statusText}>
              {user?.nome?.split(" ")[0] ?? "Sair"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <div className={s.mainContent}>
        {/* Navbar */}
        <header className={s.header}>
          <div className={s.headerLeft}>
            <button
              className={s.mobileToggle}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className={s.searchWrap}>
              <Search size={18} className={s.searchIcon} />
              <input
                type="text"
                placeholder="Buscar sensores, atuadores, eventos..."
                className={s.searchInput}
              />
            </div>
          </div>

          <div className={s.headerRight}>
            <Link to="/notificacoes" className={`${s.bellBtn} hover-scale`}>
              <Bell size={18} />
              <span className={s.bellDot} />
            </Link>
            <div className={s.avatar}>JC</div>
          </div>
        </header>

        {/* Página */}
        <main className="flex-1 flex flex-col w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
