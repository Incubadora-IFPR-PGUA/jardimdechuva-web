import { Navigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AcessoNegado from "./AcessoNegado";

/**
 * Protege rotas que exigem login e, opcionalmente, uma permissão do cargo
 * (ex.: permissao="usuarios.gerenciar"). Sem login, redireciona para /login.
 *
 * As permissões vêm do backend, que também as confere em cada requisição:
 * esconder a página aqui é só para a interface.
 */
const ProtectedRoute = ({ children, permissao }) => {
  const { isAuthenticated, sessaoCarregando, perfil, can } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Espera o /auth/me trazer o perfil atualizado antes de decidir o acesso
  if (sessaoCarregando) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: "100vh", color: "#6b7280", fontSize: 14 }}>
        <RefreshCw size={20} className="animate-spin" style={{ color: "#10b981" }} />
        Verificando acesso...
      </div>
    );
  }

  if (!perfil?.papel) {
    return <AcessoNegado semCargo />;
  }

  if (permissao && !can(permissao)) {
    return <AcessoNegado />;
  }

  return children;
};

export default ProtectedRoute;
