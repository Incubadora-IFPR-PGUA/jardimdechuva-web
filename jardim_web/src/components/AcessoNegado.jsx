import { Link } from "react-router-dom";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROTULO_PAPEL } from "../utils/papeis";

/**
 * Exibida quando o usuário não pode ver a página.
 * semCargo: usuário sem cargo em nenhuma organização — ocupa a tela toda (fora do Layout).
 */
const AcessoNegado = ({ semCargo = false }) => {
  const { user, perfil, logout } = useAuth();
  const primeiroNome = user?.nome?.split(" ")[0];

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      minHeight: semCargo ? "100vh" : "60vh",
      background: semCargo ? "#f0fdf4" : "transparent",
    }}>
      <div className="glass-panel animate-fade-up"
        style={{ background: "white", borderRadius: 16, padding: "32px 28px", maxWidth: 420, width: "100%", textAlign: "center", border: "1px solid rgba(16,185,129,0.12)", boxShadow: "var(--shadow-md)" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <ShieldAlert size={28} />
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#111827" }}>
          {semCargo ? "Acesso pendente" : "Acesso negado"}
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          {semCargo
            ? `${primeiroNome ? `${primeiroNome}, seu` : "Seu"} usuário ainda não tem cargo em nenhuma organização. Peça a um administrador para liberar o seu acesso.`
            : `Seu cargo (${ROTULO_PAPEL[perfil?.papel] || perfil?.papel}) não tem permissão para acessar esta página.`}
        </p>

        {semCargo ? (
          <button onClick={logout} className="hover-scale"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.25)", background: "white", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <LogOut size={14} />
            Sair
          </button>
        ) : (
          <Link to="/" className="hover-scale"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", color: "white", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <ArrowLeft size={14} />
            Voltar ao painel
          </Link>
        )}
      </div>
    </div>
  );
};

export default AcessoNegado;
