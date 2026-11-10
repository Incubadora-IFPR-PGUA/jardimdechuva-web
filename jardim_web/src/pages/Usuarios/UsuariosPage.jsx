import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, User, Mail, Shield, Building,
  RefreshCw, Search, Plus, Send, X, Pencil, Trash2, UserPlus, CheckCircle2, XCircle
} from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

const FORM_EMPTY = {
  nome: "",
  email: "",
  senha: "",
  confirmacaoSenha: "",
  ativo: true,
  vinculos: []
};

const UsuariosPage = () => {
  const [usuarios, setUsuarios]         = useState([]);
  const [organizacoes, setOrganizacoes] = useState([]);
  const [cargos, setCargos]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState("");
  const [filtroOrg, setFiltroOrg]       = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [editando, setEditando]         = useState(null);
  const [deletando, setDeletando]       = useState(null);
  const [form, setForm]                 = useState(FORM_EMPTY);

  const [novaOrg, setNovaOrg]     = useState("");
  const [novoCargo, setNovoCargo] = useState("");

  const { perfil, can } = useAuth();

  // Só aparecem os cargos até o nível de quem está logado (o backend também valida)
  const cargosAtribuiveis = useMemo(
    () => cargos.filter((c) => (c.nivel ?? 0) <= (perfil?.nivel ?? 0)),
    [cargos, perfil]
  );

  // Cargo sugerido em novos vínculos: o de menor acesso
  const idCargoPadrao = useMemo(() => {
    const menor = cargosAtribuiveis.reduce((m, c) => (!m || c.nivel < m.nivel ? c : m), null);
    return menor ? String(menor.id_cargo || menor.idCargo) : "";
  }, [cargosAtribuiveis]);

  // O backend já esconde quem tem cargo acima do seu; a checagem fica como segurança extra
  const podeGerenciarUsuario = (u) => (u.nivel ?? 0) <= (perfil?.nivel ?? 0);

  // Organizações em que se pode vincular usuários: todas para o desenvolvedor; para os demais,
  // só as que ele administra (o backend recusa as outras)
  const organizacoesVinculaveis = useMemo(() => {
    if (!Array.isArray(organizacoes)) return [];
    if (perfil?.papel === "desenvolvedor") return organizacoes;
    const administradas = new Set(
      (perfil?.organizacoes || [])
        .filter((o) => o.permissoes?.includes("usuarios.gerenciar"))
        .map((o) => Number(o.idOrganizacao))
    );
    return organizacoes.filter((o) => administradas.has(Number(o.id_organizacao || o.idOrganizacao)));
  }, [organizacoes, perfil]);

  // ── Carregar Dados Auxiliares (Organizações e Cargos) ──────────────────────
  const carregarAuxiliares = useCallback(async () => {
    try {
      const [resOrg, resCar] = await Promise.all([
        api.get("/organizacoes"),
        api.get("/cargos")
      ]);

      // Desempacota com suporte a paginação do Adonis Lucid (.paginate)
      const extrairArray = (dados) => {
        if (Array.isArray(dados)) return dados;
        if (Array.isArray(dados?.data)) return dados.data;
        if (Array.isArray(dados?.data?.data)) return dados.data.data;
        if (Array.isArray(dados?.organizacoes)) return dados.organizacoes;
        if (Array.isArray(dados?.cargos)) return dados.cargos;
        return [];
      };

      setOrganizacoes(extrairArray(resOrg.data));
      setCargos(extrairArray(resCar.data));
    } catch (err) {
      console.error("Erro ao carregar dados auxiliares:", err);
      setOrganizacoes([]);
      setCargos([]);
    }
  }, []);

  // ── Fetch de Usuários ──────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/usuarios");
      const lista = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setUsuarios(lista);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      if (!silent) toast.error("Não foi possível carregar a lista de usuários.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
    carregarAuxiliares();
    const iv = setInterval(() => fetchUsuarios(true), 60000);
    return () => clearInterval(iv);
  }, [fetchUsuarios, carregarAuxiliares]);

  // ── Filtro / Busca ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let result = usuarios;
    if (filtroOrg) {
      result = result.filter(u =>
        u.organizacoes?.some(org => String(org.id_organizacao || org.idOrganizacao) === String(filtroOrg))
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.nome || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [usuarios, search, filtroOrg]);

  // ── Abrir/Fechar Form ──────────────────────────────────────────────────────
  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setNovaOrg("");
    setNovoCargo(idCargoPadrao);
    setShowForm(true);
  };

  const abrirEdicao = (usuario) => {
    setEditando(usuario);

    const vinculosIniciais = (usuario.organizacoes || []).map((org) => ({
      idOrganizacao: Number(org.id_organizacao || org.idOrganizacao),
      idCargo: Number(org.id_cargo || org.idCargo || 4)
    }));

    setForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      senha: "",
      confirmacaoSenha: "",
      ativo: usuario.ativo !== undefined ? Boolean(usuario.ativo) : true,
      vinculos: vinculosIniciais
    });
    setNovaOrg("");
    setNovoCargo(idCargoPadrao);
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Gerenciamento de Vínculos ──────────────────────────────────────────────
  const adicionarVinculo = () => {
    if (!novaOrg) {
      toast.warn("Selecione uma organização.");
      return;
    }
    if (!novoCargo) {
      toast.warn("Selecione um cargo.");
      return;
    }
    const jaExiste = form.vinculos.some((v) => Number(v.idOrganizacao) === Number(novaOrg));
    if (jaExiste) {
      toast.warn("Este usuário já está vinculado a esta organização.");
      return;
    }

    setForm((f) => ({
      ...f,
      vinculos: [...f.vinculos, { idOrganizacao: Number(novaOrg), idCargo: Number(novoCargo) }]
    }));
    setNovaOrg("");
  };

  const removerVinculo = (idOrg) => {
    setForm((f) => ({
      ...f,
      vinculos: f.vinculos.filter((v) => Number(v.idOrganizacao) !== Number(idOrg))
    }));
  };

  const alterarCargoVinculo = (idOrg, novoIdCargo) => {
    setForm((f) => ({
      ...f,
      vinculos: f.vinculos.map((v) =>
        Number(v.idOrganizacao) === Number(idOrg)
          ? { ...v, idCargo: Number(novoIdCargo) }
          : v
      )
    }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      toast.warn("Nome e email são obrigatórios.");
      return;
    }

    if (!editando && !form.senha) {
      toast.warn("A senha é obrigatória para cadastrar um novo usuário.");
      return;
    }

    if (form.senha && form.senha !== form.confirmacaoSenha) {
      toast.warn("As senhas informadas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        ativo: form.ativo ? 1 : 0,
        vinculos: form.vinculos
      };

      if (form.senha.trim()) {
        payload.senha = form.senha.trim();
      }

      if (editando) {
        const id = editando.id_usuario || editando.idUsuario || editando.id;
        await api.put(`/usuarios/${id}`, payload);
        toast.success(`Usuário "${form.nome}" atualizado!`);
      } else {
        await api.post("/usuarios", payload);
        toast.success(`Usuário "${form.nome}" cadastrado com sucesso!`);
      }

      fecharForm();
      await fetchUsuarios(false);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Erro ao salvar usuário.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      const id = deletando.id_usuario || deletando.idUsuario || deletando.id;
      await api.delete(`/usuarios/${id}`);
      toast.success(`Usuário "${deletando.nome}" removido.`);
      setDeletando(null);
      await fetchUsuarios(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover usuário.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: "#111827" }}>Gerenciar Usuários</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Adicione e gerencie os acessos e permissões por organização.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchUsuarios(false)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : abrirNovo} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, color: "white", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <UserPlus size={14} />}
            {showForm ? "Cancelar" : "Novo Usuário"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white", borderRadius: 16, border: "1px solid rgba(79,70,229,0.15)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#3730a3" }}>
              {editando ? `Editar Usuário — ${editando.nome}` : "Cadastrar Novo Usuário"}
            </h3>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Campos com <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> são obrigatórios
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>

            {/* Nome */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Nome completo *</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Carlos Silva"
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Email *</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Ex: carlos@jardim.com"
                type="email"
                required
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} />
            </div>

            {/* Senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                {editando ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
              </label>
              <input value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                placeholder="••••••••"
                type="password"
                required={!editando}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} />
            </div>

            {/* Confirmar Senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Confirmar Senha {(!editando || form.senha) && "*"}
              </label>
              <input value={form.confirmacaoSenha} onChange={(e) => setForm((f) => ({ ...f, confirmacaoSenha: e.target.value }))}
                placeholder="••••••••"
                type="password"
                required={!editando && !!form.senha}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", outline: "none", fontSize: 13 }} />
            </div>

            {/* Status Ativo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1", paddingTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "#4f46e5" }}
                />
                Usuário Ativo (Acesso Liberado à Plataforma)
              </label>
            </div>

            {/* ── Seção de Vínculos com Organizações ── */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                <Building size={16} color="#4f46e5" /> Organizações e Permissões Vinculadas
              </h4>

              {/* Seletor de inclusão */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 2, minWidth: 200 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Adicionar Organização</label>
                  <select
                    value={novaOrg}
                    onChange={(e) => setNovaOrg(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", background: "white", fontSize: 13 }}
                  >
                    <option value="">Selecione uma organização...</option>
                    {organizacoesVinculaveis.map((org) => {
                    const idOrg = org.id_organizacao || org.idOrganizacao;
                    return (
                      <option key={idOrg} value={idOrg}>
                        {org.nome}
                      </option>
                    );
                  })}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Cargo nesta Organização</label>
                  <select
                    value={novoCargo}
                    onChange={(e) => setNovoCargo(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", background: "white", fontSize: 13 }}
                  >
                    {cargosAtribuiveis.map((c) => {
                      const idC = c.id_cargo || c.idCargo;
                      return (
                        <option key={idC} value={idC}>{c.nome}</option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={adicionarVinculo}
                  style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#4f46e5", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={14} /> Vincular
                </button>
              </div>

              {/* Lista dos vínculos atuais */}
              {form.vinculos.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", padding: "6px 0" }}>
                  Nenhuma organização vinculada ainda. O usuário não terá acesso até ser vinculado.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {form.vinculos.map((v) => {
                    const orgObj = organizacoes.find((o) => Number(o.id_organizacao || o.idOrganizacao) === Number(v.idOrganizacao));
                    const nomeOrg = orgObj?.nome || `Organização #${v.idOrganizacao}`;

                    return (
                      <div key={v.idOrganizacao} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "white", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Building size={14} color="#6366f1" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{nomeOrg}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <select
                            value={Number(v.idCargo)}
                            onChange={(e) => alterarCargoVinculo(v.idOrganizacao, e.target.value)}
                            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, background: "#f8fafc", outline: "none", fontWeight: 600 }}
                          >
                            {cargosAtribuiveis.map((c) => {
                              const idC = Number(c.id_cargo || c.idCargo);
                              return (
                                <option key={idC} value={idC}>{c.nome}</option>
                              );
                            })}
                          </select>

                          <button
                            type="button"
                            onClick={() => removerVinculo(v.idOrganizacao)}
                            title="Remover vínculo"
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ações */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <button type="button" onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13, color: "#4b5563" }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                <Send size={13} />
                {submitting ? "Processando..." : (editando ? "Salvar alterações" : "Criar usuário")}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Busca e Filtros */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário por nome ou email..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
        </div>

        {can("organizacoes.ver") && (
          <select value={filtroOrg} onChange={(e) => setFiltroOrg(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)", minWidth: 200 }}>
            <option value="">Todas as Organizações</option>
              {Array.isArray(organizacoes) && organizacoes.map(org => {
              const idO = org.id_organizacao || org.idOrganizacao;
              return (
                <option key={idO} value={idO}>{org.nome}</option>
              );
            })}
          </select>
        )}
      </div>

      {/* Grid de Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 20, height: 130, background: "white", borderRadius: 16 }}>
              <div className="skeleton" style={{ height: 14, width: "65%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 10, width: "80%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white", borderRadius: 16 }}>
          <Users size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum usuário encontrado para "${search}".` : "Nenhum usuário cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {displayed.map((u) => {
            const id = u.id_usuario || u.idUsuario || u.id;
            const isAtivo = Boolean(u.ativo ?? true);

            return (
              <div key={id} className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex", flexDirection: "column", gap: 14, borderRadius: 16, border: "1px solid rgba(79,70,229,0.08)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.04)" }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: isAtivo ? "#e0e7ff" : "#fee2e2",
                                  display: "flex", alignItems: "center", justifyContent: "center", color: isAtivo ? "#4f46e5" : "#dc2626",
                                  flexShrink: 0, fontWeight: 700, fontSize: 16 }}>
                      {u.nome ? u.nome.charAt(0).toUpperCase() : <User size={18} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937", lineHeight: 1.2 }}>
                          {u.nome}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: isAtivo ? "#d1fae5" : "#fee2e2", color: isAtivo ? "#059669" : "#dc2626", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {isAtivo ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {isAtivo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={11} />
                        {u.email}
                      </div>

                      {/* Lista de Organizações e Cargos */}
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {u.organizacoes && u.organizacoes.length > 0 ? (
                          u.organizacoes.map((org) => (
                            <span key={org.id_organizacao || org.idOrganizacao} style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 6, fontSize: 10, display: "flex", alignItems: "center", gap: 4, color: "#374151", border: "1px solid #e5e7eb" }}>
                              <Building size={10} color="#4f46e5" />
                              <strong>{org.nome}</strong>
                              <span style={{ color: "#4f46e5", fontWeight: 700 }}>({org.cargo_nome || 'Usuário'})</span>
                            </span>
                          ))
                        ) : (
                          <span style={{ background: "#fef2f2", padding: "2px 6px", borderRadius: 4, fontSize: 10, color: "#ef4444" }}>
                            Sem organizações vinculadas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {podeGerenciarUsuario(u) && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(u)} title="Editar"
                        style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#4f46e5", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(u)} title="Remover"
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
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
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover usuário?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              O usuário <strong>{deletando.nome}</strong> será desativado do sistema.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmarDelete}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsuariosPage;