import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Leaf, Wifi, Lock, Mail, AlertCircle, ArrowRight, Droplets } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/* ─── Partícula animada de chuva ─── */
const RainParticle = ({ style }) => (
  <div
    style={{
      position: "absolute",
      width: "1.5px",
      borderRadius: "2px",
      background: "linear-gradient(to bottom, transparent, rgba(16,185,129,0.6))",
      animation: "rain-fall linear infinite",
      ...style,
    }}
  />
);

/* ─── Bolhas flutuantes de fundo ─── */
const FloatingOrb = ({ size, top, left, delay, duration }) => (
  <div
    style={{
      position: "absolute",
      width: size,
      height: size,
      top,
      left,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
      animation: `float-orb ${duration}s ease-in-out ${delay}s infinite alternate`,
      pointerEvents: "none",
    }}
  />
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [localError, setLocalError] = useState("");
  const [submitAnim, setSubmitAnim] = useState(false);
  const [rainParticles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      height: `${40 + Math.random() * 80}px`,
      animationDuration: `${0.6 + Math.random() * 1.2}s`,
      animationDelay: `${Math.random() * 2}s`,
      opacity: 0.1 + Math.random() * 0.35,
    }))
  );

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!email.trim()) return setLocalError("Informe seu e-mail.");
    if (!senha.trim()) return setLocalError("Informe sua senha.");

    setSubmitAnim(true);
    const result = await login(email.trim(), senha);
    setSubmitAnim(false);

    if (result.success) {
      navigate("/", { replace: true });
    }
  };

  return (
    <div style={styles.root}>
      {/* ── Estilo de animações ── */}
      <style>{`
        @keyframes rain-fall {
          from { transform: translateY(-60px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          to   { transform: translateY(110vh); opacity: 0; }
        }
        @keyframes float-orb {
          from { transform: translateY(0) scale(1); }
          to   { transform: translateY(-30px) scale(1.1); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logo-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
          50%      { box-shadow: 0 0 0 14px rgba(16,185,129,0); }
        }
        @keyframes leaf-sway {
          0%,100% { transform: rotate(-4deg) scale(1); }
          50%      { transform: rotate(4deg) scale(1.04); }
        }
        @keyframes slide-up {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes btn-ripple {
          from { transform:scale(0.95); opacity:0.8; }
          to   { transform:scale(1.02); opacity:1; }
        }
        .login-input:focus { outline:none; border-color:#10b981 !important; box-shadow:0 0 0 3px rgba(16,185,129,0.15) !important; }
        .login-btn:hover:not(:disabled) { background:linear-gradient(135deg,#059669,#047857) !important; transform:translateY(-1px); box-shadow:0 8px 30px rgba(5,150,105,0.45) !important; }
        .login-btn:active:not(:disabled) { transform:translateY(0); }
        .login-btn:disabled { opacity:0.7; cursor:not-allowed; }
        .forgot-link { color:#6b7280; font-size:13px; text-decoration:none; transition:color 0.2s; }
        .forgot-link:hover { color:#10b981; }
      `}</style>

      {/* ── Chuva de fundo ── */}
      {rainParticles.map((p) => (
        <RainParticle
          key={p.id}
          style={{
            left: p.left,
            height: p.height,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* ── Orbs de luz ── */}
      <FloatingOrb size="600px" top="-100px" left="-150px" delay={0} duration={7} />
      <FloatingOrb size="400px" top="40%" left="70%" delay={2} duration={9} />
      <FloatingOrb size="300px" top="70%" left="10%" delay={1} duration={11} />

      {/* ── Grade decorativa ── */}
      <div style={styles.grid} />

      {/* ── Layout central ── */}
      <div style={styles.center}>
        {/* Coluna Esquerda — Branding */}
        <div style={styles.brandCol}>
          <div style={styles.brandInner}>
            {/* Badge */}
            <div style={styles.badge}>
              <Wifi size={12} style={{ color: "#10b981" }} />
              <span>Sistema IoT Inteligente</span>
            </div>

            {/* Logo grande */}
            <div style={styles.logoWrap}>
              <img
                src="/logo-jardim.png"
                alt="Jardim de Chuva Inteligente"
                style={styles.logoImg}
                onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
              />
              {/* Fallback se a imagem não carregar */}
              <div style={{ ...styles.logoFallback, display: "none" }}>
                <Droplets size={48} style={{ color: "#10b981" }} />
              </div>
            </div>

            <h1 style={styles.brandTitle}>
              Jardim de<br />
              <span style={styles.brandHighlight}>Chuva</span>
            </h1>
            <p style={styles.brandSub}>
              Monitore, automatize e otimize o aproveitamento de água da chuva com tecnologia IoT de ponta.
            </p>

            {/* Stats row */}
            <div style={styles.statsRow}>
              {[
                { label: "Sensores", value: "12+" },
                { label: "Automações", value: "98%" },
                { label: "Economia", value: "40%" },
              ].map((s) => (
                <div key={s.label} style={styles.statItem}>
                  <span style={styles.statValue}>{s.value}</span>
                  <span style={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita — Card de Login */}
        <div style={styles.cardCol}>
          <div style={styles.card}>
            {/* Topo do card */}
            <div style={styles.cardHeader}>
              {/* Logo mini */}
              <div style={styles.logoMini}>
                <img
                  src="/logo-jardim.png"
                  alt="Logo"
                  style={{ width: "36px", height: "36px", objectFit: "contain" }}
                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
                />
                <Leaf size={20} style={{ display: "none", color: "#10b981" }} />
              </div>
              <h2 style={styles.cardTitle}>Bem-vindo de volta</h2>
              <p style={styles.cardSub}>Acesse o painel de controle do seu jardim</p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} style={styles.form} noValidate>
              {/* Mensagem de erro */}
              {localError && (
                <div style={styles.errorBox}>
                  <AlertCircle size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <span>{localError}</span>
                </div>
              )}

              {/* Campo E-mail */}
              <div style={styles.fieldGroup}>
                <label htmlFor="login-email" style={styles.label}>
                  E-mail
                </label>
                <div style={styles.inputWrap}>
                  <Mail
                    size={17}
                    style={{
                      ...styles.inputIcon,
                      color: focusedField === "email" ? "#10b981" : "#9ca3af",
                    }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    className="login-input"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setLocalError(""); }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    style={{
                      ...styles.input,
                      borderColor: focusedField === "email" ? "#10b981" : "rgba(16,185,129,0.15)",
                    }}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div style={styles.fieldGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="login-senha" style={styles.label}>Senha</label>
                  <a href="#" className="forgot-link">Esqueceu a senha?</a>
                </div>
                <div style={styles.inputWrap}>
                  <Lock
                    size={17}
                    style={{
                      ...styles.inputIcon,
                      color: focusedField === "senha" ? "#10b981" : "#9ca3af",
                    }}
                  />
                  <input
                    id="login-senha"
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setLocalError(""); }}
                    onFocus={() => setFocusedField("senha")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      ...styles.input,
                      paddingRight: "44px",
                      borderColor: focusedField === "senha" ? "#10b981" : "rgba(16,185,129,0.15)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Lembrar-me */}
              <div style={styles.rememberRow}>
                <label style={styles.checkLabel}>
                  <input type="checkbox" style={styles.checkbox} id="remember-me" />
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>Manter-me conectado</span>
                </label>
              </div>

              {/* Botão de login */}
              <button
                type="submit"
                id="login-submit-btn"
                className="login-btn"
                disabled={loading}
                style={styles.submitBtn}
              >
                {loading ? (
                  <div style={styles.spinner} />
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divisor */}
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>ou continue como</span>
              <div style={styles.dividerLine} />
            </div>

            {/* Demo login */}
            <button
              type="button"
              onClick={() => { setEmail("demo@jardim.io"); setSenha("demo1234"); }}
              style={styles.demoBtn}
            >
              <Leaf size={15} style={{ color: "#10b981" }} />
              Usar conta demonstração
            </button>

            {/* Footer do card */}
            <p style={styles.cardFooter}>
              Jardim de Chuva Inteligente &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Estilos em objeto ─── */
const styles = {
  root: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #020d06 0%, #031a0e 30%, #042b15 60%, #053520 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)
    `,
    backgroundSize: "60px 60px",
    pointerEvents: "none",
  },
  center: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "60px",
    width: "100%",
    maxWidth: "1000px",
    padding: "24px",
  },
  /* Coluna branding */
  brandCol: {
    flex: "1 1 400px",
    display: "flex",
    flexDirection: "column",
    color: "white",
  },
  brandInner: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.25)",
    borderRadius: "100px",
    padding: "5px 14px",
    fontSize: "12px",
    color: "#6ee7b7",
    fontWeight: "600",
    letterSpacing: "0.04em",
    width: "fit-content",
  },
  logoWrap: {
    width: "120px",
    height: "120px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(16,185,129,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(12px)",
    animation: "logo-pulse 3s ease-in-out infinite",
    overflow: "hidden",
  },
  logoImg: {
    width: "100px",
    height: "100px",
    objectFit: "contain",
    animation: "leaf-sway 4s ease-in-out infinite",
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: "clamp(32px, 5vw, 48px)",
    fontWeight: "800",
    color: "white",
    lineHeight: "1.1",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  brandHighlight: {
    background: "linear-gradient(90deg, #10b981, #34d399)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  brandSub: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.55)",
    lineHeight: "1.6",
    maxWidth: "360px",
    margin: 0,
  },
  statsRow: {
    display: "flex",
    gap: "28px",
    marginTop: "8px",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#34d399",
    fontFamily: "'Outfit', sans-serif",
  },
  statLabel: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.45)",
    fontWeight: "500",
  },
  /* Card */
  cardCol: {
    flex: "0 0 420px",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "28px",
    padding: "40px 36px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
    animation: "card-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    marginBottom: "28px",
    textAlign: "center",
  },
  logoMini: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "white",
    margin: 0,
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  cardSub: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.45)",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "10px",
    color: "#fca5a5",
    fontSize: "13px",
    fontWeight: "500",
    animation: "slide-up 0.2s ease",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    pointerEvents: "none",
    transition: "color 0.2s",
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(16,185,129,0.15)",
    borderRadius: "12px",
    color: "white",
    fontSize: "14px",
    transition: "all 0.2s ease",
    caretColor: "#10b981",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "6px",
    transition: "color 0.2s",
  },
  rememberRow: {
    display: "flex",
    alignItems: "center",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkbox: {
    accentColor: "#10b981",
    width: "15px",
    height: "15px",
    cursor: "pointer",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "14px 24px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
    fontFamily: "'Inter', sans-serif",
    marginTop: "4px",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2.5px solid rgba(255,255,255,0.3)",
    borderTop: "2.5px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0 16px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255,255,255,0.07)",
  },
  dividerText: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    whiteSpace: "nowrap",
  },
  demoBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "12px",
    background: "rgba(16,185,129,0.07)",
    border: "1px solid rgba(16,185,129,0.2)",
    borderRadius: "12px",
    color: "#6ee7b7",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif",
  },
  cardFooter: {
    textAlign: "center",
    fontSize: "11px",
    color: "rgba(255,255,255,0.2)",
    marginTop: "20px",
  },
};

export default LoginPage;
