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
import Jardins from "../pages/JardinsPage";
import Usuarios from "../pages/Usuarios/UsuariosPage";
import Organizacoes from "../pages/Organizacoes";

const AppRoutes = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas protegidas */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/"             element={<Dashboard />} />
                  <Route path="/sensores"     element={<Sensores />} />
                  <Route path="/atuadores"    element={<Atuadores />} />
                  <Route path="/historico"    element={<Historico />} />
                  <Route path="/notificacoes" element={<Notificacoes />} />
                  <Route path="/jardins" element={<Jardins />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/organizacoes" element={<Organizacoes />} />
                  <Route path="*"             element={<Navigate to="/" replace />} />
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
