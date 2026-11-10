import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trees,
  Search,
  Plus,
  RefreshCw,
  Send,
  X,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Cpu
} from "lucide-react";
import { api, jardimService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import s from "./Jardins.module.css";

const FORM_EMPTY = {
  nome: "",
  idOrganizacao: "",
  descricao: "",
  localizacao: ""
};

// ── Função auxiliar para converter o POINT do MySQL em string segura ──────────
const formatarLocalizacaoParaTexto = (loc) => {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object") {
    // Caso venha como GeoJSON { type: 'Point', coordinates: [lng, lat] }
    if (Array.isArray(loc.coordinates)) {
      return `${loc.coordinates[1]}, ${loc.coordinates[0]}`;
    }
    // Caso venha como objeto simples { x, y }
    if (loc.x !== undefined && loc.y !== undefined) {
      return `${loc.x}, ${loc.y}`;
    }
    return JSON.stringify(loc);
  }
  return String(loc);
};

const JardinsPage = () => {
  const { perfil, can } = useAuth();
  const podeGerenciar = can("jardins.gerenciar");
  const ehDesenvolvedor = perfil?.papel === "desenvolvedor";
  const [jardins, setJardins]             = useState([]);
  const [organizacoes, setOrganizacoes]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState("");
  const [showForm, setShowForm]           = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [editando, setEditando]           = useState(null);
  const [deletando, setDeletando]         = useState(null);
  const [form, setForm]                   = useState(FORM_EMPTY);

  // ── Fetch de Jardins ───────────────────────────────────────────────────────
  const fetchJardins = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await (jardimService?.listar ? jardimService.listar() : api.get("/jardins"));
      let lista = [];
      if (Array.isArray(res.data)) lista = res.data;
      else if (Array.isArray(res.data?.data)) lista = res.data.data;
      else if (Array.isArray(res.data?.jardins)) lista = res.data.jardins;
      setJardins(lista);
    } catch (err) {
      console.error("Erro ao carregar jardins:", err);
      toast.error("Não foi possível carregar a lista de jardins.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch de Organizações (só o desenvolvedor escolhe entre todas) ─────────
  const carregarOrganizacoes = async () => {
    try {
      const res = await api.get("/organizacoes", { params: { limit: 100 } });
      let lista = [];

      if (Array.isArray(res.data)) {
        lista = res.data;
      } else if (Array.isArray(res.data?.data)) {
        lista = res.data.data;
      } else if (Array.isArray(res.data?.data?.data)) {
        // Resposta paginada do Adonis: { data: { meta, data: [...] } }
        lista = res.data.data.data;
      } else if (Array.isArray(res.data?.organizacoes)) {
        lista = res.data.organizacoes;
      } else if (Array.isArray(res.data?.rows)) {
        lista = res.data.rows;
      }

      setOrganizacoes(lista);
    } catch (err) {
      console.error("Erro ao carregar organizações:", err);
      setOrganizacoes([]); // Garante que nunca fique indefinido ou objeto inválido
    }
  };

  useEffect(() => {
    fetchJardins();
    if (ehDesenvolvedor) carregarOrganizacoes();
    const interval = setInterval(() => fetchJardins(true), 30000);
    return () => clearInterval(interval);
  }, [fetchJardins, ehDesenvolvedor]);

  // Organizações em que o usuário pode criar jardins. O desenvolvedor escolhe qualquer uma;
  // os demais, as que administram (com uma só, o backend vincula o jardim a ela automaticamente).
  const orgsGerenciaveis = useMemo(
    () => ehDesenvolvedor
      ? organizacoes
      : (perfil?.organizacoes || []).filter((o) => o.permissoes?.includes("jardins.gerenciar")),
    [ehDesenvolvedor, organizacoes, perfil]
  );

  // Sem escolha possível, o campo de organização é só informativo
  const organizacaoFixa = !ehDesenvolvedor && (Boolean(editando) || orgsGerenciaveis.length <= 1);
  const nomeOrganizacaoFixa = editando
    ? (editando.organizacao?.nome || "Organização do jardim")
    : (orgsGerenciaveis[0]?.nome || "Sua organização");

  // ── Filtro / Busca ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return jardins;
    const q = search.toLowerCase();
    return jardins.filter(
      (j) =>
        (j.nome || "").toLowerCase().includes(q) ||
        (j.descricao || "").toLowerCase().includes(q) ||
        (j.organizacao?.nome || "").toLowerCase().includes(q) ||
        formatarLocalizacaoParaTexto(j.localizacao).toLowerCase().includes(q)
    );
  }, [jardins, search]);

  // ── Formulário (Abrir / Fechar) ────────────────────────────────────────────
  const abrirCriacao = () => {
    setEditando(null);
    const orgPadrao = ehDesenvolvedor
      ? perfil?.organizacoes?.[0]?.idOrganizacao
      : orgsGerenciaveis[0]?.idOrganizacao;
    setForm({
      ...FORM_EMPTY,
      idOrganizacao: orgPadrao ? String(orgPadrao) : ""
    });
    setShowForm(true);
  };

  const abrirEdicao = (j) => {
    setEditando(j);
    setForm({
      nome: j.nome || "",
      idOrganizacao: j.idOrganizacao || j.id_organizacao || "",
      descricao: j.descricao || "",
      localizacao: formatarLocalizacaoParaTexto(j.localizacao)
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit (Salvar ou Editar) ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome.trim() || !form.idOrganizacao) {
      toast.warn("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setSubmitting(true);
    try {
      // O backend define o criador (usuário logado) e confere a organização pelo cargo
      const payload = {
        nome: form.nome.trim(),
        idOrganizacao: Number(form.idOrganizacao),
        descricao: form.descricao?.trim() || null,
        localizacao: form.localizacao?.trim() || null
      };

      if (editando) {
        const id = editando.idJardim || editando.id_jardim;
        await api.put(`/jardins/${id}`, payload);
        toast.success(`Jardim "${form.nome}" atualizado com sucesso!`);
      } else {
        await api.post("/jardins", payload);
        toast.success(`Jardim "${form.nome}" cadastrado com sucesso!`);
      }

      fecharForm();
      await fetchJardins(false);
    } catch (err) {
      console.error("Erro ao salvar jardim:", err.response?.data || err);
      const erroMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
      toast.error(erroMsg || "Erro ao salvar jardim na base de dados.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      const id = deletando.idJardim || deletando.id_jardim;
      await api.delete(`/jardins/${id}`);
      toast.success("Jardim removido com sucesso.");
      setDeletando(null);
      await fetchJardins(true);
    } catch (err) {
      console.error("Erro ao remover jardim:", err);
      toast.error("Erro ao remover o jardim. Verifique se existem placas ou sensores associados.");
    }
  };

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.header}>
        <div className={s.headingGroup}>
          <span className="badge" style={{ marginBottom: 4, background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, width: "fit-content" }}>
            {jardins.length} jardins registados
          </span>
          <h1 className={s.title}>Jardins de Chuva</h1>
          <p className={s.subtitle}>
            Gerencie as áreas drenantes, canteiros e instalações ecológicas monitorizadas.
          </p>
        </div>

        <div className={s.actions}>
          <button onClick={() => fetchJardins(true)} className={`${s.btnOutline} hover-scale`}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          {podeGerenciar && (
            <button onClick={showForm ? fecharForm : abrirCriacao} className={`${s.btnPrimary} hover-scale`}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Cancelar" : "Novo Jardim"}
            </button>
          )}
        </div>
      </div>

      {/* Formulário de Cadastro / Edição */}
      {showForm && (
        <div className={`glass-panel ${s.formPanel}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#065f46" }}>
              {editando ? `Editar Jardim — ${editando.nome}` : "Cadastrar Novo Jardim"}
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Campos com <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> são obrigatórios
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>

            {/* Nome do Jardim */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Nome do Jardim / Canteiro <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Jardim de Chuva - Canteiro 01"
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }}
              />
            </div>

            {/* Organização Vinculada */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Organização / Cliente <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {organizacaoFixa ? (
                <div style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 13, color: "#374151" }}>
                  {nomeOrganizacaoFixa}
                  {!editando && <span style={{ color: "#6b7280" }}> (vinculado automaticamente)</span>}
                </div>
              ) : (
                <select
                  value={form.idOrganizacao}
                  onChange={(e) => setForm((f) => ({ ...f, idOrganizacao: e.target.value }))}
                  required
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", background: "white", fontSize: 13 }}
                >
                  <option value="">Selecione a organização...</option>
                  {orgsGerenciaveis.map((org) => {
                    const id = org.idOrganizacao || org.id_organizacao;
                    return (
                      <option key={id} value={id}>
                        {org.nome}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* Localização */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Localização Física / Ponto</label>
              <input
                value={form.localizacao}
                onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                placeholder="Ex: -25.5204, -48.5095"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }}
              />
            </div>

            {/* Descrição */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Descrição e Detalhes Construtivos</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva as características ecológicas, bacia de acumulação ou área de drenagem..."
                rows={3}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13, resize: "vertical" }}
              />
            </div>

            {/* Ações */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13, color: "#4b5563" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}
              >
                <Send size={13} />
                {submitting ? "A processar..." : (editando ? "Salvar alterações" : "Cadastrar Jardim")}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jardim ou local..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)", outline: "none", background: "white", fontSize: 13, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
        />
      </div>

      {/* Grid de Cards dos Jardins */}
      {loading ? (
        <div className={s.gridCards}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`glass-panel ${s.card}`} style={{ height: 160 }}>
              <div className="skeleton" style={{ height: 16, width: "60%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 40, width: "100%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 12, width: "40%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white", borderRadius: 16 }}>
          <Trees size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum jardim encontrado para "${search}".` : "Nenhum jardim de chuva registado ainda."}
          </p>
        </div>
      ) : (
        <div className={s.gridCards}>
          {displayed.map((j) => {
            const id = j.idJardim || j.id_jardim;
            const nDispositivos = j.dispositivos?.length ?? 0;
            const localFormatado = formatarLocalizacaoParaTexto(j.localizacao);

            return (
              <div key={id} className={`glass-panel ${s.card} hover-scale`}>

                {/* Top Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", flexShrink: 0 }}>
                      <Trees size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", lineHeight: 1.2 }}>
                        {j.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Building2 size={11} />
                        {j.organizacao?.nome || "Organização Vinculada"}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  {podeGerenciar && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(j)} title="Editar"
                        style={{ background: "none", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#059669", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(j)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <p style={{ fontSize: 12, color: "#4b5563", margin: 0, lineHeight: 1.4, minHeight: 34 }}>
                  {j.descricao || "Sem descrição informada."}
                </p>

                {/* Metadados */}
                <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: 10, fontSize: 11, color: "#64748b", display: "flex", flexDirection: "column", gap: 5 }}>
                  {localFormatado && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={11} color="#059669" /> Local:
                      </span>
                      <strong style={{ color: "#334155" }}>{localFormatado}</strong>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Cpu size={11} color="#4f46e5" /> Dispositivos Instalados:
                    </span>
                    <strong style={{ color: "#334155" }}>{nDispositivos} nós</strong>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Deletar */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover jardim?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              <strong>{deletando.nome}</strong> será removido permanentemente.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmarDelete} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JardinsPage;