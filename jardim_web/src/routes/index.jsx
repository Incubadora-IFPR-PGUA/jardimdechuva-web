import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/Layout";

import LoginPage    from "../pages/Login";
import Dashboard    from "../pages/Dashboard";
import Sensores     from "../pages/Sensores";
import Atuadores    from "../pages/Atuadores";
import Historico    from "../pages/Historico";
import Notificacoes from "../pages/Notificacoes";
import JardinsPage from "../pages/Jardins";
import Usuarios from "../pages/Usuarios/UsuariosPage";
import Organizacoes from "../pages/Organizacoes";
import Dispositivos from "../pages/Dispositivos/DispositivosPage";
import TiposSensores from "../pages/TiposSensores/TiposSensoresPage";
import TiposDispositivos from '../pages/TiposDispositivos';
import CargosPage from "../pages/Cargos";

// Página que exige uma permissão do cargo (lista completa em app/Utils/Permissoes.ts, no backend)
const restrita = (permissao, pagina) => (
  <ProtectedRoute permissao={permissao}>{pagina}</ProtectedRoute>
);

const AppRoutes = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas protegidas: exigem login e um cargo em alguma organização */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/"                   element={<Dashboard />} />
                  <Route path="/sensores"           element={restrita("sensores.ver", <Sensores />)} />
                  <Route path="/atuadores"          element={restrita("atuadores.ver", <Atuadores />)} />
                  <Route path="/historico"          element={restrita("leituras.ver", <Historico />)} />
                  <Route path="/notificacoes"       element={restrita("alertas.ver", <Notificacoes />)} />
                  <Route path="/jardins"            element={restrita("jardins.ver", <JardinsPage />)} />
                  <Route path="/usuarios"           element={restrita("usuarios.gerenciar", <Usuarios />)} />
                  <Route path="/cargos"             element={restrita("cargos.gerenciar", <CargosPage />)} />
                  <Route path="/organizacoes"       element={restrita("organizacoes.gerenciar", <Organizacoes />)} />
                  <Route path="/dispositivos"       element={restrita("dispositivos.gerenciar", <Dispositivos />)} />
                  <Route path="/tipos-sensores"     element={restrita("tipos.gerenciar", <TiposSensores />)} />
                  <Route path="/tipos-dispositivos" element={restrita("tipos.gerenciar", <TiposDispositivos />)} />
                  <Route path="*"                   element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
  </BrowserRouter>
);

export default AppRoutes;
