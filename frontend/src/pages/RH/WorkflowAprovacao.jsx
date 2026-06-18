import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { Plus, Edit, Trash2, Search, Loader2, CheckCircle, AlertCircle, X, GitBranch, PlusCircle, ArrowUp, ArrowDown } from "lucide-react";
import API_URL from "../../config/api";

const WorkflowAprovacao = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({ nome: "", tipo: "Outro", modulo: "", descricao: "", ativo: true, passos: [] });
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const empresaId = user?.empresaId || localStorage.getItem("empresaId");
  const token = localStorage.getItem("token");

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    try {
      const response = await fetch(`${API_URL}/rh/workflow?empresaId=${empresaId}`, {
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
        body: JSON.stringify({ ...formData, empresaId })
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

  const abrirEdicao = (item) => {
    setEditando(item._id);
    setFormData({ nome: item.nome, tipo: item.tipo, modulo: item.modulo || "", descricao: item.descricao || "", ativo: item.ativo, passos: (item.passos || []).map(p => ({ ...p })) });
    setModalOpen(true);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData({ nome: "", tipo: "Outro", modulo: "", descricao: "", ativo: true, passos: [] });
    setModalOpen(true);
  };

  const addPasso = () => {
    setFormData(prev => ({
      ...prev,
      passos: [...prev.passos, { ordem: prev.passos.length + 1, nome: "", tipoAprovador: "Gestor", prazoHoras: 48, podeRejeitar: true, podePular: false }]
    }));
  };

  const updatePasso = (index, key, value) => {
    const novos = [...formData.passos];
    novos[index] = { ...novos[index], [key]: value };
    setFormData(prev => ({ ...prev, passos: novos }));
  };

  const removePasso = (index) => {
    setFormData(prev => ({
      ...prev,
      passos: prev.passos.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 }))
    }));
  };

  const movePasso = (index, direcao) => {
    const novos = [...formData.passos];
    if (direcao === "up" && index > 0) {
      [novos[index], novos[index - 1]] = [novos[index - 1], novos[index]];
    } else if (direcao === "down" && index < novos.length - 1) {
      [novos[index], novos[index + 1]] = [novos[index + 1], novos[index]];
    }
    setFormData(prev => ({
      ...prev,
      passos: novos.map((p, i) => ({ ...p, ordem: i + 1 }))
    }));
  };

  const filtered = items.filter(item =>
    (item.nome || "").toLowerCase().includes(search.toLowerCase()) ||
    (item.tipo || "").toLowerCase().includes(search.toLowerCase())
  );

  const tipoLabels = { Ferias: "Férias", Licenca: "Licença", Falta: "Falta", Abono: "Abono", Despesa: "Despesa", Formacao: "Formação", Promocao: "Promoção", Recrutamento: "Recrutamento", Outro: "Outro" };
  const aprovadorLabels = { Gestor: "Gestor", RH: "RH", Admin: "Admin", Supervisor: "Supervisor", Especifico: "Específico" };
  const tipoCores = { Ferias: "text-blue-400", Licenca: "text-purple-400", Falta: "text-red-400", Abono: "text-green-400", Despesa: "text-yellow-400", Formacao: "text-indigo-400", Promocao: "text-amber-400", Recrutamento: "text-cyan-400", Outro: "text-gray-400" };

  return (
    <Layout title="Workflows e Aprovações" showBackButton backToRoute="/rh">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"} text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={abrirNovo} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 rounded-xl flex items-center gap-2">
            <Plus size={18} /> Novo Workflow
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <GitBranch className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 text-lg">Nenhum workflow encontrado</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(item => (
              <div key={item._id} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 hover:border-gray-600 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <GitBranch className="text-purple-400" size={20} />
                      <h3 className="text-lg font-semibold text-white">{item.nome}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoCores[item.tipo] || "text-gray-400"} bg-gray-700`}>{tipoLabels[item.tipo] || item.tipo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.ativo ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>{item.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                    {item.descricao && <p className="text-gray-400 text-sm mb-2">{item.descricao}</p>}
                    <div className="text-gray-500 text-xs">
                      {(item.passos || []).length > 0 ? `${item.passos.length} passo(s) de aprovação` : "Sem passos definidos"}
                      {item.modulo && ` • Módulo: ${item.modulo}`}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => abrirEdicao(item)} className="p-2 bg-yellow-600/20 rounded-lg"><Edit size={16} className="text-yellow-400" /></button>
                    <button onClick={() => excluir(item._id)} className="p-2 bg-red-600/20 rounded-lg"><Trash2 size={16} className="text-red-400" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar Workflow" : "Novo Workflow"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                      {Object.entries(tipoLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Módulo</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.modulo} onChange={(e) => setFormData({ ...formData, modulo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                  <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                    value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ativo" className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                    checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />
                  <label htmlFor="ativo" className="text-sm text-gray-300">Workflow ativo</label>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">Passos de Aprovação ({formData.passos.length})</h3>
                    <button type="button" onClick={addPasso} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                      <PlusCircle size={16} /> Adicionar Passo
                    </button>
                  </div>
                  {formData.passos.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">Nenhum passo definido. Clique em "Adicionar Passo" para começar.</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.passos.map((passo, i) => (
                        <div key={i} className="bg-gray-700/30 rounded-xl p-4 border border-gray-600">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-purple-400">Passo {passo.ordem}</span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => movePasso(i, "up")} disabled={i === 0} className="p-1 hover:bg-gray-600 rounded disabled:opacity-30"><ArrowUp size={14} /></button>
                              <button type="button" onClick={() => movePasso(i, "down")} disabled={i === formData.passos.length - 1} className="p-1 hover:bg-gray-600 rounded disabled:opacity-30"><ArrowDown size={14} /></button>
                              <button type="button" onClick={() => removePasso(i)} className="p-1 hover:bg-red-600/30 rounded text-red-400"><X size={14} /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Nome do Passo</label>
                              <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm"
                                value={passo.nome} onChange={(e) => updatePasso(i, "nome", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Aprovador</label>
                              <select className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm"
                                value={passo.tipoAprovador} onChange={(e) => updatePasso(i, "tipoAprovador", e.target.value)}>
                                {Object.entries(aprovadorLabels).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Prazo (horas)</label>
                              <input type="number" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm"
                                value={passo.prazoHoras} onChange={(e) => updatePasso(i, "prazoHoras", parseInt(e.target.value) || 48)} />
                            </div>
                            <div className="flex items-end gap-3 pb-2">
                              <label className="flex items-center gap-1 text-xs text-gray-400">
                                <input type="checkbox" className="w-3 h-3" checked={passo.podeRejeitar} onChange={(e) => updatePasso(i, "podeRejeitar", e.target.checked)} />
                                Pode Rejeitar
                              </label>
                              <label className="flex items-center gap-1 text-xs text-gray-400">
                                <input type="checkbox" className="w-3 h-3" checked={passo.podePular} onChange={(e) => updatePasso(i, "podePular", e.target.checked)} />
                                Pode Pular
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-700">
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
    </Layout>
  );
};

export default WorkflowAprovacao;
