import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import EmpresaSelector from "../../components/EmpresaSelector";
import { Plus, Edit, Trash2, Search, Loader2, CheckCircle, AlertCircle, X, GitBranch, PlusCircle, ArrowUp, ArrowDown, Building2 } from "lucide-react";
import API_URL from "../../config/api";

const WorkflowAprovacao = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({ nome: "", tipo: "Outro", modulo: "", descricao: "", ativo: true, passos: [] });
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => { carregarEmpresas(); }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregar();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [empresaSelecionada]);

  const carregarEmpresas = async () => {
    if (isTecnico()) { setLoadingEmpresas(false); return; }
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${API_URL}/empresa`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      const empresaPadrao = empresasList[0]?._id || user?.empresaId;
      if (empresaPadrao && !empresaSelecionada) {
        setEmpresaSelecionada(empresaPadrao);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregar = async () => {
    if (!empresaSelecionada) return;
    try {
      const response = await fetch(`${API_URL}/rh/workflow?empresaId=${empresaSelecionada}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setItems(data.dados || []);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMsg = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const method = editando ? "PUT" : "POST";
      const url = editando ? `${API_URL}/rh/workflow/${editando}` : `${API_URL}/rh/workflow`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, empresaId: empresaSelecionada })
      });
      const result = await response.json();
      if (response.ok) {
        mostrarMsg(editando ? "Actualizado com sucesso!" : "Criado com sucesso!", "sucesso");
        setModalOpen(false);
        setEditando(null);
        carregar();
      } else {
        mostrarMsg(result.mensagem || "Erro ao salvar", "erro");
      }
    } catch (error) {
      mostrarMsg("Erro ao conectar", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id) => {
    if (!window.confirm("Tem certeza?")) return;
    try {
      const response = await fetch(`${API_URL}/rh/workflow/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        mostrarMsg("Removido com sucesso!", "sucesso");
        carregar();
      }
    } catch (error) {
      mostrarMsg("Erro ao remover", "erro");
    }
  };

  const filtered = items.filter(item =>
    [item.nome, item.tipo, item.modulo].some(campo =>
      String(campo || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loadingEmpresas) {
    return (
      <Layout title="Workflows e Aprovações" showBackButton backToRoute="/rh">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Workflows e Aprovações" showBackButton backToRoute="/rh">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <EmpresaSelector
        empresas={empresas}
        empresaSelecionada={empresaSelecionada}
        setEmpresaSelecionada={setEmpresaSelecionada}
        onRefresh={carregar}
        loading={loadingEmpresas}
      />

      {!empresaSelecionada ? (
        <div className="bg-gray-800 rounded-2xl p-12 text-center">
          <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
          <p className="text-gray-400 text-lg">
            {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa"}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => { setEditando(null); setFormData({ nome: "", tipo: "Outro", modulo: "", descricao: "", ativo: true, passos: [] }); setModalOpen(true); }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Plus size={18} /> Novo Workflow
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
            ) : filtered.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <GitBranch className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum workflow encontrado</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map(item => (
                  <div key={item._id} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{item.nome}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${item.ativo ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                            {item.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-1">{item.descricao}</p>
                        <p className="text-gray-500 text-xs">Tipo: {item.tipo} | Módulo: {item.modulo}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditando(item._id); setFormData(item); setModalOpen(true); }} className="p-2 bg-yellow-600/20 rounded-lg">
                          <Edit size={16} className="text-yellow-400" />
                        </button>
                        <button onClick={() => excluir(item._id)} className="p-2 bg-red-600/20 rounded-lg">
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                    {item.passos?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-gray-400 text-xs mb-2">Passos do workflow ({item.passos.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {item.passos.map((passo, idx) => (
                            <span key={idx} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full">
                              {idx + 1}. {passo.nome || passo.nomePasso} ({passo.aprovador || passo.roleAprovador || "—"})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {modalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">{editando ? "Editar Workflow" : "Novo Workflow"}</h2>
                  <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                      <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" required
                        value={formData.nome || ""}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                        <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.tipo || ""}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        >
                          <option value="Ferias">Férias</option>
                          <option value="Licenca">Licença</option>
                          <option value="Despesa">Despesa</option>
                          <option value="Aquisicao">Aquisição</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Módulo</label>
                        <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.modulo || ""}
                          onChange={(e) => setFormData({ ...formData, modulo: e.target.value })}
                        >
                          <option value="rh">RH</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="compras">Compras</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                      <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                        value={formData.descricao || ""}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-300">Activo</label>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input type="checkbox" className="toggle-checkbox absolute w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                          checked={formData.ativo}
                          onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-300">Passos do Workflow</label>
                        <button type="button"
                          onClick={() => setFormData({ ...formData, passos: [...(formData.passos || []), { nome: "", aprovador: "" }] })}
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                        >
                          <PlusCircle size={14} /> Adicionar Passo
                        </button>
                      </div>
                      {formData.passos?.map((passo, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input type="text" placeholder="Nome do passo" className="flex-1 p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm"
                            value={passo.nome || ""}
                            onChange={(e) => {
                              const novosPassos = [...formData.passos];
                              novosPassos[idx] = { ...novosPassos[idx], nome: e.target.value };
                              setFormData({ ...formData, passos: novosPassos });
                            }}
                          />
                          <input type="text" placeholder="Aprovador (role ou ID)" className="flex-1 p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm"
                            value={passo.aprovador || ""}
                            onChange={(e) => {
                              const novosPassos = [...formData.passos];
                              novosPassos[idx] = { ...novosPassos[idx], aprovador: e.target.value };
                              setFormData({ ...formData, passos: novosPassos });
                            }}
                          />
                          <button type="button" onClick={() => {
                            const novosPassos = formData.passos.filter((_, i) => i !== idx);
                            setFormData({ ...formData, passos: novosPassos });
                          }} className="p-2 text-red-400 hover:text-red-300">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" disabled={salvando} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl text-white">
                        {salvando ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Salvar"}
                      </button>
                      <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white">Cancelar</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default WorkflowAprovacao;
