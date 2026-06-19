import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import EmpresaSelector from "../../components/EmpresaSelector";
import { Plus, Edit, Trash2, Search, Loader2, CheckCircle, AlertCircle, X, Building2 } from "lucide-react";
import API_URL from "../../config/api";

const RHListPage = ({ title, endpoint, columns, formFields, emptyMessage }) => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({});
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargos, setCargos] = useState([]);

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
      carregarFuncionarios();
      carregarCargos();
    } else {
      setItems([]);
      setFuncionarios([]);
      setCargos([]);
      setLoading(false);
    }
  }, [empresaSelecionada]);

  const carregarFuncionarios = async () => {
    if (!empresaSelecionada) { setFuncionarios([]); return; }
    try {
      const response = await fetch(`${API_URL}/funcionarios?empresaId=${empresaSelecionada}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 403) { setFuncionarios([]); return; }
      const data = await response.json();
      setFuncionarios(Array.isArray(data) ? data : (data.dados || []));
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setFuncionarios([]);
    }
  };

  const carregarCargos = async () => {
    if (!empresaSelecionada) { setCargos([]); return; }
    try {
      const response = await fetch(`${API_URL}/rh/cargos?empresaId=${empresaSelecionada}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setCargos(data.dados || []);
    } catch (error) {
      console.error("Erro ao carregar cargos:", error);
      setCargos([]);
    }
  };

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
      const response = await fetch(`${API_URL}/rh/${endpoint}?empresaId=${empresaSelecionada}`, {
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
    const payload = { ...formData, empresaId: empresaSelecionada };
    Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === null || payload[k] === undefined) delete payload[k]; });
    try {
      const method = editando ? "PUT" : "POST";
      const url = editando ? `${API_URL}/rh/${endpoint}/${editando}` : `${API_URL}/rh/${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
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
      const response = await fetch(`${API_URL}/rh/${endpoint}/${id}`, {
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
    columns.some(col =>
      String(item[col.key] || "").toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loadingEmpresas) {
    return (
      <Layout title={title} showBackButton backToRoute="/rh">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title} showBackButton backToRoute="/rh">
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
                onClick={() => { setEditando(null); setFormData({}); setModalOpen(true); }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Plus size={18} /> Novo
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
            ) : filtered.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <p className="text-gray-400 text-lg">{emptyMessage || "Nenhum registo encontrado"}</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-700">
                      <tr className="text-gray-300 text-sm">
                        {columns.map(col => (
                          <th key={col.key} className={`p-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>{col.label}</th>
                        ))}
                        <th className="p-4 text-center">Acções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(item => (
                        <tr key={item._id} className="border-t border-gray-700 hover:bg-gray-750">
                          {columns.map(col => (
                            <td key={col.key} className={`p-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} text-white`}>
                              {col.render ? col.render(item) : item[col.key] || "—"}
                            </td>
                          ))}
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => { setEditando(item._id); setFormData({ ...item, funcionarioId: item.funcionarioId?._id || item.funcionarioId || "" }); setModalOpen(true); }} className="p-2 bg-yellow-600/20 rounded-lg">
                                <Edit size={16} className="text-yellow-400" />
                              </button>
                              <button onClick={() => excluir(item._id)} className="p-2 bg-red-600/20 rounded-lg">
                                <Trash2 size={16} className="text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {modalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">{editando ? "Editar" : "Novo"}</h2>
                  <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formFields.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                        {field.key === 'funcionarioId' ? (
                          <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData[field.key] || ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              const func = funcionarios.find(f => f._id === id);
                              const extras = {};
                              if (func) {
                                extras.funcionarioNome = func.nome || '';
                                extras.funcionarioId = id;
                                const keys = formFields.map(f => f.key);
                                if (keys.some(k => k === 'cargoAnterior' || k === 'cargoNovo')) {
                                  extras.cargoAnterior = func.cargo || func.funcao || '';
                                }
                                if (keys.some(k => k.startsWith('salario'))) {
                                  extras.salarioAnterior = func.salarioBase || 0;
                                }
                                if (keys.includes('departamento')) {
                                  extras.departamento = func.departamento || '';
                                }
                              } else {
                                extras.funcionarioId = id;
                              }
                              setFormData({ ...formData, ...extras });
                            }}
                          >
                            <option value="">Seleccione um funcionário...</option>
                            {funcionarios.map(f => (
                              <option key={f._id} value={f._id}>{f.nome} - {f.cargo || f.funcao || 'Sem cargo'}</option>
                            ))}
                          </select>
                        ) : field.key === 'cargoNovo' || field.key === 'cargoAnterior' ? (
                          <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData[field.key] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const cargo = cargos.find(c => c.nome === val);
                              const extras = { [field.key]: val };
                              if (cargo && field.key === 'cargoNovo' && !formData.salarioNovo) {
                                extras.salarioNovo = cargo.salarioMin || 0;
                              }
                              setFormData({ ...formData, ...extras });
                            }}
                          >
                            <option value="">Seleccione um cargo...</option>
                            {cargos.map(c => (
                              <option key={c._id} value={c.nome}>{c.nome} (Nível {c.nivel}) {c.salarioMin ? `- ${c.salarioMin.toLocaleString()} Kz` : ''}</option>
                            ))}
                          </select>
                        ) : field.type === 'select' ? (
                          <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          >
                            <option value="">Seleccione...</option>
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea rows={3} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          />
                        ) : field.type === 'number' ? (
                          <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value ? parseFloat(e.target.value) : "" })}
                          />
                        ) : field.type === 'date' || field.key.startsWith('data') ? (
                          <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          />
                        ) : (
                          <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          />
                        )}
                      </div>
                    ))}
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

export default RHListPage;
