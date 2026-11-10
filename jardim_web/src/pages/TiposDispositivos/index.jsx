import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  X 
} from 'lucide-react';
import { tipoDispositivoService } from '../../services/api';

export default function TiposDispositivos() {
  const [tipos, setTipos] = useState([]);
  const [nome, setNome] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  // Estado para controlar inclusão vs edição
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoEmEdicao, setTipoEmEdicao] = useState(null); // null = Criando; Objeto = Editando
  const [mensagem, setMensagem] = useState(null);

  // Helper para padronizar acesso ao ID (Adonis camelCase ou snake_case do banco)
  const getId = (item) => item?.idTipoDispositivo || item?.id_tipo_dispositivo;

  // ── READ (Listar) ──────────────────────────────────────────
  const carregarTipos = async () => {
    try {
      setCarregando(true);
      const response = await tipoDispositivoService.listar();
      setTipos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao buscar tipos de dispositivos:', err);
      mostrarFeedback('erro', 'Falha ao buscar a lista de tipos de dispositivos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTipos();
  }, []);

  const mostrarFeedback = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 3500);
  };

  // ── Abertura dos Modais ────────────────────────────────────
  const abrirModalCriar = () => {
    setTipoEmEdicao(null);
    setNome('');
    setModalAberto(true);
  };

  const abrirModalEditar = (tipo) => {
    setTipoEmEdicao(tipo);
    setNome(tipo.nome || '');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setTipoEmEdicao(null);
    setNome('');
  };

  // ── CREATE & UPDATE (Salvar / Editar) ───────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      setSalvando(true);
      if (tipoEmEdicao) {
        // UPDATE
        const id = getId(tipoEmEdicao);
        await tipoDispositivoService.atualizar(id, { nome: nome.trim() });
        mostrarFeedback('sucesso', 'Tipo de dispositivo atualizado com sucesso!');
      } else {
        // CREATE
        await tipoDispositivoService.criar({ nome: nome.trim() });
        mostrarFeedback('sucesso', 'Tipo de dispositivo cadastrado com sucesso!');
      }
      fecharModal();
      carregarTipos();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      mostrarFeedback('erro', 'Erro ao processar requisição no servidor.');
    } finally {
      setSalvando(false);
    }
  };

  // ── DELETE (Excluir) ───────────────────────────────────────
  const handleExcluir = async (tipo) => {
    const id = getId(tipo);
    const confirmacao = window.confirm(`Deseja realmente remover o tipo "${tipo.nome}"?`);
    if (!confirmacao) return;

    try {
      await tipoDispositivoService.deletar(id);
      mostrarFeedback('sucesso', 'Tipo de dispositivo removido com sucesso!');
      carregarTipos();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      mostrarFeedback('erro', 'Não foi possível excluir. O tipo pode estar associado a dispositivos ativos.');
    }
  };

  // Filtragem local por termo de busca
  const tiposFiltrados = tipos.filter((t) =>
    t.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#f8faf9] min-h-screen text-slate-800">
      {/* Toast Notification */}
      {mensagem && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border animate-in fade-in slide-in-from-top-3 duration-200 ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {mensagem.tipo === 'sucesso' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{mensagem.texto}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {tipos.length} cadastrados
          </span>
          <h1 className="text-3xl font-extrabold text-[#064e3b] mt-2">Tipos de Dispositivos</h1>
          <p className="text-sm text-slate-500">
            Gerencie os modelos e arquiteturas de placas suportadas pelo sistema (ESP32, ESP32-C3, etc).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={carregarTipos}
            disabled={carregando}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={abrirModalCriar}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-xl transition shadow-sm"
          >
            <Plus size={18} />
            Novo Tipo
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar modelo ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition shadow-sm"
        />
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tiposFiltrados.map((tipo) => {
          const id = getId(tipo);
          return (
            <div
              key={id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Cpu size={22} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => abrirModalEditar(tipo)}
                    className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleExcluir(tipo)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-bold text-slate-800 text-base">{tipo.nome}</h3>
                <p className="text-xs text-slate-400 mt-0.5">ID de Referência: #{id}</p>
              </div>
            </div>
          );
        })}

        {tiposFiltrados.length === 0 && !carregando && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
            Nenhum tipo de dispositivo encontrado.
          </div>
        )}
      </div>

      {/* Modal Unificado (Create / Edit) */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                {tipoEmEdicao ? 'Editar Tipo de Dispositivo' : 'Novo Tipo de Dispositivo'}
              </h2>
              <button 
                onClick={fecharModal} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Informe o modelo da placa ou controlador (ex.: ESP32 DevKit v1, ESP32-C3 SuperMini, Gateway LoRa).
            </p>

            <form onSubmit={handleSubmit}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nome do Modelo / Placa
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: ESP32 DevKit v1"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981] transition mb-5"
                required
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : tipoEmEdicao ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}