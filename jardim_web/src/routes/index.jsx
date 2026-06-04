import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "../components/Layout";

import Dashboard from "../pages/DashboardPage";
import Sensores from "../pages/SensoresPage";
import Atuadores from "../pages/AtuadoresPage";
import Historico from "../pages/HistoricoPage";
import Notificacoes from "../pages/NotificacoesPage";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sensores" element={<Sensores />} />
          <Route path="/atuadores" element={<Atuadores />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
        </Routes>
      </Layout>
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
    </BrowserRouter>
  );
};

export default AppRoutes;
