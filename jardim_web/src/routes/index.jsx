import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/DashboardPage";
import Sensores from "../pages/SensoresPage"
import Atuadores from "../pages/AtuadoresPage";
import Historico from "../pages/HistoricoPage";
import Notificacoes from "../pages/NotificacoesPage";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sensores" element={<Sensores />} />
        <Route path="/atuadores" element={<Atuadores />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
