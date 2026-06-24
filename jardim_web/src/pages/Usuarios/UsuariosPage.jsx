import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, User, Mail, Shield, Building,
  RefreshCw, Search, Plus, Send, X, Pencil, Trash2, UserPlus, Key
} from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

// ─── Form vazio ───────────────────────────────────────────────────────────────

const FORM_EMPTY = { nome: "", email: "", senha: "", confirmacaoSenha: "", idOrganizacao: "", idCargo: "" };

// ─── Component ────────────────────────────────────────────────────────────────

const UsuariosPage = () => {
  const [usuarios, setUsuarios]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState("");
  const [filtroOrg, setFiltroOrg]   = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando]     = useState(null); // usuário em edição
  const [deletando, setDeletando]   = useState(null); // usuário aguardando confirmação
  const [form, setForm]             = useState(FORM_EMPTY);

  const { user } = useAuth();
  const [organizacoes, setOrganizacoes] = useState([]);

  const currentUserRole = useMemo(() => {
    if (!user || !user.cargos || user.cargos.length === 0) return 5;
    return Math.min(...user.cargos.map((c) => c.id_cargo || c.idCargo || 5));
  }, [user]);

  const isPlatformAdmin = useMemo(() => {
    if (!user) return false;
    const hasGlobalRole = user.cargos?.some((c) => c.id_cargo <= 2 || c.idCargo <= 2);
    const inPlatformOrg = user.organizacoes?.some((o) => o.id_organizacao === 1 || o.idOrganizacao === 1);
    return hasGlobalRole || inPlatformOrg;
  }, [user]);

  const fetchOrganizacoes = useCallback(async () => {
    try {
      const res = await api.get("/organizacoes");
      setOrganizacoes(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOrganizacoes();
  }, [fetchOrganizacoes]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsuarios = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/usuarios");
      setUsuarios(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
    // Refresh a cada 1 minuto, menos frequente para usuários
    const iv = setInterval(() => fetchUsuarios(true), 60000);
    return () => clearInterval(iv);
  }, [fetchUsuarios]);

  // ── Filtro/busca ───────────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    let result = usuarios;
    if (filtroOrg) {
      result = result.filter(u => u.organizacoes?.some(org => String(org.id_organizacao || org.idOrganizacao) === String(filtroOrg)));
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

  // ── Abrir form de criação ──────────────────────────────────────────────────

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  // ── Abrir form de edição ───────────────────────────────────────────────────

  const abrirEdicao = (usuario) => {
    setEditando(usuario);
    const cargo = usuario.cargos && usuario.cargos.length > 0 ? usuario.cargos[0] : null;
    setForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      senha: "",
      confirmacaoSenha: "",
      idOrganizacao: "", // idealmente precisaria vir a organização do user, manteremos limpo para forçar nova se quiser trocar
      idCargo: cargo ? (cargo.id_cargo || cargo.idCargo || "") : "",
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  // ── Submit (criar ou editar) ───────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) {
      toast.warn("Nome e email são obrigatórios.");
      return;
    }

    if (!editando && !form.senha) {
      toast.warn("A senha é obrigatória para novos usuários.");
      return;
    }

    if (form.senha && form.senha !== form.confirmacaoSenha) {
      toast.warn("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nome: form.nome,
        email: form.email,
      };

      if (form.senha) {
        payload.senha = form.senha;
      }

      let userId;
      if (editando) {
        await api.put(`/usuarios/${editando.id_usuario || editando.idUsuario || editando.id}`, payload);
        userId = editando.id_usuario || editando.idUsuario || editando.id;
        toast.success(`Usuário "${form.nome}" atualizado!`);
      } else {
        const res = await api.post("/usuarios", payload);
        userId = res.data?.data?.id_usuario || res.data?.id_usuario || res.data?.data?.idUsuario || res.data?.idUsuario;
        toast.success(`Usuário "${form.nome}" criado!`);
      }

      if (userId && form.idOrganizacao && form.idCargo) {
        try {
          await api.post(`/organizacoes/${form.idOrganizacao}/usuarios`, {
            idUsuario: userId,
            idCargo: form.idCargo
          });
        } catch (err) {
          console.error("Erro ao vincular organização:", err);
          toast.error("Usuário salvo, mas erro ao vincular organização.");
        }
      }

      fecharForm();
      fetchUsuarios(true);
    } catch {
      toast.error(editando ? "Erro ao atualizar usuário." : "Erro ao criar usuário.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Deletar ────────────────────────────────────────────────────────────────

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await api.delete(`/usuarios/${deletando.id_usuario || deletando.idUsuario || deletando.id}`);
      toast.success(`Usuário "${deletando.nome}" removido.`);
      setDeletando(null);
      fetchUsuarios(true);
    } catch {
      toast.error("Erro ao remover usuário.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5" }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} cadastrado{usuarios.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Gerenciar Usuários</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Adicione e gerencie os acessos ao sistema.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchUsuarios(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10,
                     padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5",
                     display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                     boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          <button onClick={showForm ? fecharForm : abrirNovo} className="hover-scale"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none",
                     borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                     color: "white", display: "flex", alignItems: "center", gap: 7,
                     cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
            {showForm ? <X size={14} /> : <UserPlus size={14} />}
            {showForm ? "Cancelar" : "Novo Usuário"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white",
                                              border: "1px solid rgba(79,70,229,0.12)" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#3730a3" }}>
            {editando ? `Editar Usuário — ${editando.nome}` : "Novo Usuário"}
          </h3>
          <form onSubmit={handleSubmit}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>

            {/* Nome */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Nome completo *</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: João da Silva"
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(79,70,229,0.2)", outline: "none",
                         background: "white", fontSize: 13 }} />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Email *</label>
              <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Ex: joao@email.com"
                type="email"
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(79,70,229,0.2)", outline: "none",
                         background: "white", fontSize: 13 }} />
            </div>

            {/* Senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>
                {editando ? "Nova Senha (opcional)" : "Senha *"}
              </label>
              <input value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                placeholder="••••••••"
                type="password"
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(79,70,229,0.2)", outline: "none",
                         background: "white", fontSize: 13 }} />
            </div>

            {/* Confirmar Senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>
                Confirmar Senha {(!editando || form.senha) && "*"}
              </label>
              <input value={form.confirmacaoSenha} onChange={(e) => setForm((f) => ({ ...f, confirmacaoSenha: e.target.value }))}
                placeholder="••••••••"
                type="password"
                style={{ padding: "9px 12px", borderRadius: 8,
                         border: "1px solid rgba(79,70,229,0.2)", outline: "none",
                         background: "white", fontSize: 13 }} />
            </div>

            {/* Organização */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Organização</label>
              <select value={form.idOrganizacao} onChange={(e) => setForm((f) => ({ ...f, idOrganizacao: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 }}>
                <option value="">Selecione uma organização</option>
                {organizacoes.map(org => (
                  <option key={org.id_organizacao || org.idOrganizacao} value={org.id_organizacao || org.idOrganizacao}>
                    {org.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Cargo */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>Cargo</label>
              <select value={form.idCargo} onChange={(e) => setForm((f) => ({ ...f, idCargo: e.target.value }))}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 }}>
                <option value="">Selecione um cargo</option>
                {isPlatformAdmin && <option value="1">Teste</option>}
                {isPlatformAdmin && <option value="2">Desenvolvedor</option>}
                {(isPlatformAdmin || currentUserRole <= 3) && <option value="3">Admin</option>}
                <option value="4">Usuário</option>
                <option value="5">Visitante</option>
              </select>
            </div>

            {/* Botões */}
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                         background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none",
                         background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
                         cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                         fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                <Send size={13} />
                {submitting ? (editando ? "Salvando..." : "Criando...") : (editando ? "Salvar alterações" : "Criar usuário")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca e Filtros */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%",
                                     transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário por nome ou email..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12,
                     border: "1px solid rgba(79,70,229,0.12)", outline: "none",
                     background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
        </div>

        {isPlatformAdmin && (
          <select value={filtroOrg} onChange={(e) => setFiltroOrg(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)",
                     outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)", minWidth: 200 }}>
            <option value="">Todas as Organizações</option>
            {organizacoes.map(org => (
              <option key={org.id_organizacao || org.idOrganizacao} value={org.id_organizacao || org.idOrganizacao}>
                {org.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 20, height: 120 }}>
              <div className="skeleton" style={{ height: 14, width: "65%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 10, width: "80%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Users size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhum usuário encontrado para "${search}".` : "Nenhum usuário cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {displayed.map((u) => {
            return (
              <div key={u.id_usuario || u.idUsuario || u.id}
                className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex",
                         flexDirection: "column", gap: 14,
                         border: "1px solid rgba(79,70,229,0.07)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e0e7ff",
                                  display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5",
                                  flexShrink: 0, fontWeight: 700, fontSize: 16 }}>
                      {u.nome ? u.nome.charAt(0).toUpperCase() : <User size={18} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#312e81", lineHeight: 1.2 }}>
                        {u.nome}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={10} />
                        {u.email}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {u.organizacoes && u.organizacoes.length > 0 ? (
                          u.organizacoes.map(org => (
                            <span key={org.id_organizacao || org.idOrganizacao} style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 10, display: "flex", alignItems: "center", gap: 3, color: "#4b5563" }}>
                              <Building size={10} /> {org.nome}
                            </span>
                          ))
                        ) : (
                          <span style={{ background: "#fef2f2", padding: "2px 6px", borderRadius: 4, fontSize: 10, color: "#ef4444" }}>Sem org.</span>
                        )}
                        {u.cargos && u.cargos.length > 0 && (
                          <span style={{ background: "#e0e7ff", padding: "2px 6px", borderRadius: 4, fontSize: 10, display: "flex", alignItems: "center", gap: 3, color: "#4f46e5", fontWeight: 600 }}>
                            <Shield size={10} /> {u.cargos[0].nome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => abrirEdicao(u)} title="Editar"
                      style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)",
                               borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                               color: "#4f46e5", display: "flex", alignItems: "center" }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeletando(u)} title="Remover"
                      style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)",
                               borderRadius: 7, padding: "5px 7px", cursor: "pointer",
                               color: "#ef4444", display: "flex", alignItems: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16,
                                                maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover usuário?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
              O usuário <strong>{deletando.nome}</strong> será removido permanentemente.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db",
                         background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmarDelete}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none",
                         background: "#ef4444", color: "white", cursor: "pointer",
                         fontSize: 13, fontWeight: 600 }}>
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
