import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building, Search, Plus, RefreshCw, Pencil, Trash2, Send, X, MapPin, Mail, Phone, FileText, Layers
} from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

// Mesmos valores do enum organizacoes.tipo no banco
const TIPOS = [
  { value: "instituicao_ensino", label: "Instituição de Ensino" },
  { value: "empresa", label: "Empresa" },
  { value: "ong", label: "ONG" },
  { value: "orgao_publico", label: "Órgão Público" },
  { value: "pessoa_fisica", label: "Pessoa Física" },
];
const ROTULO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.value, t.label]));

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const FORM_EMPTY = {
  nome: "", tipo: "instituicao_ensino", documento: "", email: "", telefone: "",
  endereco: "", cidade: "", estado: "", cep: "", logo_url: "", id_plano: "", ativo: true,
};

// Máscaras simples (o banco guarda o texto formatado; limites: documento 18, telefone 20, cep 9)
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
const mascaraDocumento = (v) => {
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};
const mascaraTelefone = (v) => {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};
const mascaraCep = (v) => soDigitos(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const idDaOrg = (o) => o.id_organizacao || o.idOrganizacao;

const estiloCampo = { padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(79,70,229,0.2)", outline: "none", background: "white", fontSize: 13 };
const estiloRotulo = { fontSize: 12, fontWeight: 600, color: "#4b5563" };

const Campo = ({ rotulo, children, largo }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: largo ? "1 / -1" : undefined }}>
    <label style={estiloRotulo}>{rotulo}</label>
    {children}
  </div>
);

const OrganizacoesPage = () => {
  const { can } = useAuth();
  const podeGerenciar = can("organizacoes.gerenciar");
  const podeVerPlanos = can("planos.gerenciar");

  const [organizacoes, setOrganizacoes] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deletando, setDeletando] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const set = (campo) => (e) => {
    const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
  };

  const fetchOrganizacoes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get("/organizacoes", { params: { limit: 200 } });
      setOrganizacoes(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível carregar as organizações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizacoes();
  }, [fetchOrganizacoes]);

  useEffect(() => {
    if (!podeVerPlanos) return;
    api.get("/planos")
      .then((res) => setPlanos(res.data?.data || []))
      .catch(() => setPlanos([]));
  }, [podeVerPlanos]);

  const displayed = useMemo(() => {
    if (!search.trim()) return organizacoes;
    const q = search.toLowerCase();
    return organizacoes.filter((o) =>
      [o.nome, o.cidade, o.documento, o.email].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [organizacoes, search]);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_EMPTY);
    setShowForm(true);
  };

  const abrirEdicao = (org) => {
    setEditando(org);
    setForm({
      nome: org.nome || "",
      tipo: org.tipo || "instituicao_ensino",
      documento: org.documento || "",
      email: org.email || "",
      telefone: org.telefone || "",
      endereco: org.endereco || "",
      cidade: org.cidade || "",
      estado: org.estado || "",
      cep: org.cep || "",
      logo_url: org.logo_url || org.logoUrl || "",
      id_plano: org.id_plano ?? org.idPlano ?? "",
      ativo: org.ativo === undefined || org.ativo === null ? true : Boolean(Number(org.ativo)),
    });
    setShowForm(true);
  };

  const fecharForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_EMPTY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.warn("O nome da organização é obrigatório.");
      return;
    }

    // Campos vazios vão como null (o documento é único no banco: dois "" colidiam)
    const vazioViraNull = (v) => (String(v ?? "").trim() === "" ? null : String(v).trim());
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      documento: vazioViraNull(form.documento),
      email: vazioViraNull(form.email),
      telefone: vazioViraNull(form.telefone),
      endereco: vazioViraNull(form.endereco),
      cidade: vazioViraNull(form.cidade),
      estado: vazioViraNull(form.estado),
      cep: vazioViraNull(form.cep),
      logo_url: vazioViraNull(form.logo_url),
      ativo: Boolean(form.ativo),
    };
    if (podeVerPlanos) payload.id_plano = form.id_plano === "" ? null : Number(form.id_plano);

    setSubmitting(true);
    try {
      if (editando) {
        await api.put(`/organizacoes/${idDaOrg(editando)}`, payload);
        toast.success(`Organização "${form.nome}" atualizada!`);
      } else {
        await api.post("/organizacoes", payload);
        toast.success(`Organização "${form.nome}" criada!`);
      }
      fecharForm();
      fetchOrganizacoes(true);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || (editando ? "Erro ao atualizar organização." : "Erro ao criar organização."));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmarDelete = async () => {
    if (!deletando) return;
    try {
      await api.delete(`/organizacoes/${idDaOrg(deletando)}`);
      toast.success(`Organização "${deletando.nome}" removida.`);
      setDeletando(null);
      fetchOrganizacoes(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao remover organização.");
    }
  };

  const nomePlano = (org) => {
    const plano = org.plano || planos.find((p) => Number(p.id_plano ?? p.idPlano) === Number(org.id_plano ?? org.idPlano));
    return plano?.nome || null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="badge badge-success" style={{ marginBottom: 8, background: "#e0e7ff", color: "#4f46e5" }}>
            {organizacoes.length} organização{organizacoes.length !== 1 ? "ões" : ""} cadastrada{organizacoes.length !== 1 ? "s" : ""}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Gerenciar Organizações</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Adicione e gerencie instituições, empresas ou grupos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => fetchOrganizacoes(true)} className="hover-scale"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.12)", borderRadius: 10,
                     padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5",
                     display: "flex", alignItems: "center", gap: 7, cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar agora
          </button>
          {podeGerenciar && (
            <button onClick={showForm ? fecharForm : abrirNovo} className="hover-scale"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none",
                       borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600,
                       color: "white", display: "flex", alignItems: "center", gap: 7,
                       cursor: "pointer", boxShadow: "var(--shadow-md)" }}>
              {showForm ? <X size={14} /> : <Plus size={14} />}
              {showForm ? "Cancelar" : "Nova Organização"}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: 24, background: "white", border: "1px solid rgba(79,70,229,0.12)" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#3730a3" }}>
            {editando ? `Editar Organização — ${editando.nome}` : "Nova Organização"}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <Campo rotulo="Nome *">
              <input value={form.nome} onChange={set("nome")} maxLength={150} placeholder="Ex: IFPR Campus Paranaguá" style={estiloCampo} />
            </Campo>

            <Campo rotulo="Tipo">
              <select value={form.tipo} onChange={set("tipo")} style={estiloCampo}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Campo>

            <Campo rotulo="CNPJ / CPF">
              <input value={form.documento} onChange={(e) => setForm((f) => ({ ...f, documento: mascaraDocumento(e.target.value) }))}
                maxLength={18} placeholder="00.000.000/0000-00" style={estiloCampo} />
            </Campo>

            <Campo rotulo="E-mail">
              <input value={form.email} onChange={set("email")} type="email" maxLength={150} placeholder="contato@organizacao.com" style={estiloCampo} />
            </Campo>

            <Campo rotulo="Telefone">
              <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: mascaraTelefone(e.target.value) }))}
                maxLength={20} placeholder="(41) 99999-9999" style={estiloCampo} />
            </Campo>

            <Campo rotulo="CEP">
              <input value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: mascaraCep(e.target.value) }))}
                maxLength={9} placeholder="83200-000" style={estiloCampo} />
            </Campo>

            <Campo rotulo="Endereço" largo>
              <input value={form.endereco} onChange={set("endereco")} maxLength={255} placeholder="Rua, número, bairro" style={estiloCampo} />
            </Campo>

            <Campo rotulo="Cidade">
              <input value={form.cidade} onChange={set("cidade")} maxLength={100} placeholder="Ex: Paranaguá" style={estiloCampo} />
            </Campo>

            <Campo rotulo="Estado (UF)">
              <select value={form.estado} onChange={set("estado")} style={estiloCampo}>
                <option value="">—</option>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </Campo>

            <Campo rotulo="URL do logo">
              <input value={form.logo_url} onChange={set("logo_url")} maxLength={255} placeholder="https://..." style={estiloCampo} />
            </Campo>

            {podeVerPlanos && (
              <Campo rotulo="Plano">
                <select value={form.id_plano} onChange={set("id_plano")} style={estiloCampo}>
                  <option value="">Sem plano</option>
                  {planos.map((p) => (
                    <option key={p.id_plano ?? p.idPlano} value={p.id_plano ?? p.idPlano}>{p.nome}</option>
                  ))}
                </select>
              </Campo>
            )}

            <Campo rotulo="Situação">
              <label style={{ ...estiloCampo, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={form.ativo} onChange={set("ativo")} />
                {form.ativo ? "Ativa" : "Inativa"}
              </label>
            </Campo>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={fecharForm}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white",
                         cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13, opacity: submitting ? 0.7 : 1 }}>
                <Send size={13} />
                {submitting ? "Salvando..." : "Salvar Organização"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div style={{ position: "relative", maxWidth: 320 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, cidade, documento..."
          style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 12, border: "1px solid rgba(79,70,229,0.12)", outline: "none", background: "white", fontSize: 13, boxShadow: "var(--shadow-sm)" }} />
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel" style={{ padding: 20, height: 150 }}>
              <div className="skeleton" style={{ height: 14, width: "65%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 10, width: "50%", marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 10, width: "80%" }} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center", background: "white" }}>
          <Building size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            {search ? `Nenhuma organização encontrada para "${search}".` : "Nenhuma organização cadastrada."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {displayed.map((o) => {
            const ativa = o.ativo === undefined || o.ativo === null ? true : Boolean(Number(o.ativo));
            const local = [o.cidade, o.estado].filter(Boolean).join(" / ");
            const logo = o.logo_url || o.logoUrl;
            const plano = nomePlano(o);
            const linha = (Icone, texto) => texto && (
              <div style={{ fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <Icone size={12} style={{ color: "#9ca3af", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texto}</span>
              </div>
            );
            return (
              <div key={idDaOrg(o)} className="glass-panel hover-scale"
                style={{ padding: "18px 20px", background: "white", display: "flex", flexDirection: "column", gap: 12, border: "1px solid rgba(79,70,229,0.07)", opacity: ativa ? 1 : 0.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#9333ea", flexShrink: 0, overflow: "hidden" }}>
                      {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <Building size={18} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#312e81", lineHeight: 1.2 }}>{o.nome}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span>{ROTULO_TIPO[o.tipo] || o.tipo}</span>
                        <span style={{ fontWeight: 700, color: ativa ? "#15803d" : "#b91c1c" }}>• {ativa ? "Ativa" : "Inativa"}</span>
                      </div>
                    </div>
                  </div>
                  {podeGerenciar && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => abrirEdicao(o)} title="Editar" style={{ background: "none", border: "1px solid rgba(79,70,229,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#4f46e5", display: "flex", alignItems: "center" }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletando(o)} title="Remover" style={{ background: "none", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {linha(FileText, o.documento)}
                  {linha(Mail, o.email)}
                  {linha(Phone, o.telefone)}
                  {linha(MapPin, [o.endereco, local, o.cep].filter(Boolean).join(" · ") || "Local não informado")}
                  {linha(Layers, plano && `Plano: ${plano}`)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Confirm Delete */}
      {deletando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div className="glass-panel" style={{ background: "white", padding: 28, borderRadius: 16, maxWidth: 360, width: "90%", textAlign: "center" }}>
            <Trash2 size={32} color="#ef4444" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Remover Organização?</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>A organização <strong>{deletando.nome}</strong> será removida.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeletando(null)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={confirmarDelete} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizacoesPage;
