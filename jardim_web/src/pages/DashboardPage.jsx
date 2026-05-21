// src/pages/Dashboard/index.jsx
import { useEffect, useState } from "react";
import { leituraService } from "../services/api";

const Dashboard = () => {
  const [leituras, setLeituras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    leituraService
      .listar()
      .then((res) => {
        console.log(res.data);
        const dados = Array.isArray(res.data) ? res.data : res.data.data ?? [];
        setLeituras(dados);
      })
      .catch(() => setErro("Erro ao carregar leituras"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (erro) return <p>{erro}</p>;

  return (
    <div>
      <h1>Dashboard</h1>

      {leituras.map((leitura) => (
        <div
          key={leitura.id_leitura}
          style={{
            border: "1px solid #ccc",
            padding: 16,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <p><strong>Sensor:</strong> {leitura.sensor.tipoSensor.nome}</p>
          <p><strong>Status:</strong> {leitura.valor_json.statusTexto}</p>
          <p>
            <strong>Chovendo:</strong>{" "}
            {leitura.valor_json.chovendo ? "🌧 Sim" : "☀️ Não"}
          </p>
          <p><strong>Valor raw:</strong> {leitura.valor_json.raw}</p>
          <p>
            <strong>Data:</strong>{" "}
            {new Date(leitura.data_hora).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;