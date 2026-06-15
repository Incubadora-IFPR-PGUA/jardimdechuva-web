import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Leaf, Wifi, Lock, Mail, AlertCircle, ArrowRight, Droplets } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import s from "./Login.module.css";

/* ── Partícula de chuva ─── */
const RainParticle = ({ style }) => <div className={s.rainParticle} style={style} />;

/* ── Orb flutuante ─── */
const FloatingOrb = ({ size, top, left, delay, duration }) => (
  <div
    className={s.orb}
    style={{ width: size, height: size, top, left, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
  />
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError, isAuthenticated } = useAuth();

  const [email, setEmail]               = useState("");
  const [senha, setSenha]               = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [localError, setLocalError]     = useState("");

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

  useEffect(() => { if (isAuthenticated) navigate("/", { replace: true }); }, [isAuthenticated, navigate]);
  useEffect(() => { if (error) setLocalError(error); }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();
    if (!email.trim()) return setLocalError("Informe seu e-mail.");
    if (!senha.trim()) return setLocalError("Informe sua senha.");
    const result = await login(email.trim(), senha);
    if (result.success) navigate("/", { replace: true });
  };

  return (
    <div className={s.root}>
      {/* Chuva animada */}
      {rainParticles.map((p) => (
        <RainParticle
          key={p.id}
          style={{ left: p.left, height: p.height, animationDuration: p.animationDuration, animationDelay: p.animationDelay, opacity: p.opacity }}
        />
      ))}

      {/* Orbs */}
      <FloatingOrb size="600px" top="-100px" left="-150px" delay={0}  duration={7} />
      <FloatingOrb size="400px" top="40%"    left="70%"    delay={2}  duration={9} />
      <FloatingOrb size="300px" top="70%"    left="10%"    delay={1}  duration={11} />

      {/* Grade de circuito */}
      <div className={s.grid} />

      {/* Layout */}
      <div className={s.center}>

        {/* ── Branding ── */}
        <div className={s.brandCol}>
          <div className={s.brandBadge}>
            <Wifi size={12} style={{ color: "#10b981" }} />
            <span>Sistema IoT Inteligente</span>
          </div>

          <div className={s.logoWrap}>
            <img
              src="/logo-jardim.png"
              alt="Jardim de Chuva Inteligente"
              className={s.logoImg}
              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            />
            <div style={{ display: "none", alignItems: "center", justifyContent: "center" }}>
              <Droplets size={48} style={{ color: "#10b981" }} />
            </div>
          </div>

          <h1 className={s.brandTitle}>
            Jardim de<br />
            <span className={s.brandHighlight}>Chuva</span>
          </h1>

          <p className={s.brandSub}>
            Monitore, automatize e otimize o aproveitamento de água da chuva com tecnologia IoT de ponta.
          </p>

          <div className={s.statsRow}>
            {[
              { label: "Sensores",   value: "12+" },
              { label: "Automações", value: "98%" },
              { label: "Economia",   value: "40%" },
            ].map(({ label, value }) => (
              <div key={label} className={s.statItem}>
                <span className={s.statValue}>{value}</span>
                <span className={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Card de Login ── */}
        <div className={s.cardCol}>
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.logoMini}>
                <img
                  src="/logo-jardim.png"
                  alt="Logo"
                  style={{ width: 36, height: 36, objectFit: "contain" }}
                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
                />
                <Leaf size={20} style={{ display: "none", color: "#10b981" }} />
              </div>
              <h2 className={s.cardTitle}>Bem-vindo de volta</h2>
              <p className={s.cardSub}>Acesse o painel de controle do seu jardim</p>
            </div>

            <form onSubmit={handleSubmit} className={s.form} noValidate>
              {localError && (
                <div className={s.errorBox}>
                  <AlertCircle size={15} style={{ color: "#ef4444", flexShrink: 0 }} />
                  <span>{localError}</span>
                </div>
              )}

              {/* E-mail */}
              <div className={s.fieldGroup}>
                <label htmlFor="login-email" className={s.label}>E-mail</label>
                <div className={s.inputWrap}>
                  <Mail
                    size={17}
                    className={`${s.inputIcon} ${focusedField === "email" ? s.inputIconFocused : ""}`}
                  />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setLocalError(""); }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className={s.input}
                  />
                </div>
              </div>

              {/* Senha */}
              <div className={s.fieldGroup}>
                <div className={s.labelRow}>
                  <label htmlFor="login-senha" className={s.label}>Senha</label>
                  <a href="#" className={s.forgotLink}>Esqueceu a senha?</a>
                </div>
                <div className={s.inputWrap}>
                  <Lock
                    size={17}
                    className={`${s.inputIcon} ${focusedField === "senha" ? s.inputIconFocused : ""}`}
                  />
                  <input
                    id="login-senha"
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setLocalError(""); }}
                    onFocus={() => setFocusedField("senha")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`${s.input} ${s.inputWithPadding}`}
                  />
                  <button
                    type="button"
                    className={s.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Lembrar */}
              <div className={s.rememberRow}>
                <label className={s.checkLabel}>
                  <input type="checkbox" className={s.checkbox} id="remember-me" />
                  <span>Manter-me conectado</span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="login-submit-btn"
                disabled={loading}
                className={s.submitBtn}
              >
                {loading ? (
                  <div className={s.spinner} />
                ) : (
                  <>
                    <span>Entrar no sistema</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className={s.divider}>
              <div className={s.dividerLine} />
              <span className={s.dividerText}>ou continue como</span>
              <div className={s.dividerLine} />
            </div>

            {/* Demo */}
            <button
              type="button"
              className={s.demoBtn}
              onClick={() => { setEmail("demo@jardim.io"); setSenha("demo1234"); }}
            >
              <Leaf size={15} style={{ color: "#10b981" }} />
              Usar conta demonstração
            </button>

            <p className={s.cardFooter}>
              Jardim de Chuva Inteligente &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
