// src/pages/Stock/Stock.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import EmpresaSelector from "../../components/EmpresaSelector";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Edit, Trash2, Search, Package, AlertTriangle, TrendingUp, 
  X, CheckCircle, AlertCircle, Loader2, 
  Calendar, DollarSign, FileText, Download,
  Target, Building2, Save, RefreshCw, Clock
} from "lucide-react";
import RelatorioStock from "../../components/RelatorioStock";

const Stock = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [recarregar, setRecarregar] = useState(false);
  
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  // Unidades de medida completas
  const unidadesMedida = [
    "Unidade", "KG", "Litro", "Metro", "Pacote", "Caixa", 
    "Palete", "Grama", "Mililitro", "Centímetro", "Par", 
    "Dúzia", "Cento", "Milheiro", "Rolo", "Fardo"
  ];

  const [formData, setFormData] = useState({
    produto: "",
    codigoBarras: "",
    codigoInterno: "",
    categoria: "Geral",
    marca: "",
    unidadeMedida: "Unidade",
    precoCompra: 0,
    precoVenda: 0,
    quantidade: 0,
    quantidadeMinima: 5,
    dataValidade: "",
    fornecedor: "",
    armazem: "Principal",
    numeroLote: "",
    observacoes: ""
  });

  // Carregar empresas (apenas gestor)
  useEffect(() => {
    carregarEmpresas();
  }, []);

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  // Quando empresa for selecionada, carregar stock
  useEffect(() => {
  if (empresaSelecionada) {
    carregarStock();
  } else {
    // 🔒 Limpar produtos quando não há empresa selecionada
    setProdutos([]);
  }
}, [empresaSelecionada, recarregar]);


  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 2000);
  };

  const carregarEmpresas = async () => {
  // Se for técnico, não precisa carregar lista de empresas
  if (isTecnico()) {
    setLoadingEmpresas(false);
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("http://localhost:5000/api/empresa", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (response.status === 403) {
      setEmpresas([]);
      mostrarMensagem("Acesso negado", "erro");
      return;
    }
    
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


  const carregarStock = async () => {
  if (!empresaSelecionada) {
    setProdutos([]);
    return;
  }
  
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`http://localhost:5000/api/stock?empresaId=${empresaSelecionada}`, {
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    // 🔒 Se for 403 (acesso negado), limpar empresa selecionada
    if (response.status === 403) {
      const data = await response.json();
      mostrarMensagem(data.mensagem || "Acesso negado a esta empresa", "erro");
      setEmpresaSelecionada("");
      setProdutos([]);
      return;
    }
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const produtosData = Array.isArray(data) ? data : (data.dados || []);
    setProdutos(produtosData);
    
  } catch (error) {
    console.error("Erro ao carregar stock:", error);
    mostrarMensagem("Erro ao carregar produtos", "erro");
    setProdutos([]);
  } finally {
    setLoading(false);
  }
};


  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!empresaSelecionada) {
    mostrarMensagem("Selecione uma empresa", "erro");
    return;
  }
  
  // 🔒 Verificar acesso antes de salvar
  const token = localStorage.getItem("token");
  const verificarResponse = await fetch(`http://localhost:5000/api/empresa/verificar-acesso/${empresaSelecionada}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!verificarResponse.ok) {
    mostrarMensagem("Acesso negado a esta empresa", "erro");
    setEmpresaSelecionada("");
    return;
  }
  
  if (!formData.produto) {
    mostrarMensagem("Nome do produto é obrigatório", "erro");
    return;
  }
  
  if (!formData.precoVenda || formData.precoVenda <= 0) {
    mostrarMensagem("Preço de venda é obrigatório", "erro");
    return;
  }


    setSalvando(true);
    
    try {
      const token = localStorage.getItem("token");
      const url = editando ? `http://localhost:5000/api/stock/${editando}` : "http://localhost:5000/api/stock";
      const method = editando ? "PUT" : "POST";
      
      const dadosEnvio = { 
        ...formData, 
        empresaId: empresaSelecionada,
        dataValidade: formData.dataValidade || null
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok) {
        mostrarMensagem(editando ? "✅ Produto atualizado com sucesso!" : "✅ Produto adicionado com sucesso!", "sucesso");
        setModalOpen(false);
        setEditando(null);
        resetForm();
        setRecarregar(!recarregar);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao salvar", "erro");
        setSalvando(false);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setSalvando(false);
    }
  };

  const excluirProduto = async (id) => {
  if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
  
  // 🔒 Verificar acesso antes de excluir
  const token = localStorage.getItem("token");
  const verificarResponse = await fetch(`http://localhost:5000/api/empresa/verificar-acesso/${empresaSelecionada}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!verificarResponse.ok) {
    mostrarMensagem("Acesso negado a esta empresa", "erro");
    setEmpresaSelecionada("");
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:5000/api/stock/${id}?empresaId=${empresaSelecionada}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (response.ok) {
      mostrarMensagem("✅ Produto excluído!", "sucesso");
      setRecarregar(!recarregar);
    } else {
      const error = await response.json();
      mostrarMensagem(error.mensagem || "Erro ao excluir", "erro");
    }
  } catch (error) {
    console.error("Erro ao excluir:", error);
    mostrarMensagem("Erro ao conectar", "erro");
  }
};

  const resetForm = () => {
    setEditando(null);
    setFormData({
      produto: "",
      codigoBarras: "",
      codigoInterno: "",
      categoria: "Geral",
      marca: "",
      unidadeMedida: "Unidade",
      precoCompra: 0,
      precoVenda: 0,
      quantidade: 0,
      quantidadeMinima: 5,
      dataValidade: "",
      fornecedor: "",
      armazem: "Principal",
      numeroLote: "",
      observacoes: ""
    });
  };

  const handleEditClick = (produto) => {
    setEditando(produto._id);
    setFormData({
      produto: produto.produto || "",
      codigoBarras: produto.codigoBarras || "",
      codigoInterno: produto.codigoInterno || "",
      categoria: produto.categoria || "Geral",
      marca: produto.marca || "",
      unidadeMedida: produto.unidadeMedida || "Unidade",
      precoCompra: produto.precoCompra || 0,
      precoVenda: produto.precoVenda || 0,
      quantidade: produto.quantidade || 0,
      quantidadeMinima: produto.quantidadeMinima || 5,
      dataValidade: produto.dataValidade ? produto.dataValidade.split('T')[0] : "",
      fornecedor: produto.fornecedor || "",
      armazem: produto.armazem || "Principal",
      numeroLote: produto.numeroLote || "",
      observacoes: produto.observacoes || ""
    });
    setModalOpen(true);
  };

  const formatarData = (data) => {
    if (!data) return "—";
    try {
      return new Date(data).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = busca === "" || 
      p.produto?.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigoBarras?.toLowerCase().includes(busca.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(busca.toLowerCase());
    
    const matchCategoria = !filtroCategoria || p.categoria === filtroCategoria;
    
    let matchStatus = true;
    if (filtroStatus === "baixo_estoque") matchStatus = (p.quantidade || 0) <= (p.quantidadeMinima || 5);
    if (filtroStatus === "esgotado") matchStatus = (p.quantidade || 0) === 0;
    if (filtroStatus === "vencido") {
      if (!p.dataValidade) matchStatus = false;
      else matchStatus = new Date(p.dataValidade) < new Date();
    }
    
    return matchBusca && matchCategoria && matchStatus;
  });

  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  // Calcular valor total do stock
  const valorTotalStock = produtos.reduce((acc, p) => {
    const qtd = p.quantidade || 0;
    const precoVenda = p.precoVenda || 0;
    return acc + (qtd * precoVenda);
  }, 0);
  
  const produtosBaixoEstoque = produtos.filter(p => (p.quantidade || 0) <= (p.quantidadeMinima || 5)).length;
  
  // Calcular margem média
  const margemMedia = produtos.length > 0 
    ? (produtos.reduce((acc, p) => {
        const compra = p.precoCompra || 0;
        const venda = p.precoVenda || 0;
        if (compra > 0) {
          return acc + ((venda - compra) / compra * 100);
        }
        return acc;
      }, 0) / produtos.length).toFixed(1)
    : 0;

  const empresaAtual = isTecnico() 
    ? { nome: userEmpresaNome, _id: userEmpresaId }
    : empresas.find(e => e._id === empresaSelecionada);

  if (loadingEmpresas) {
    return (
      <Layout title="Gestão de Stock" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gestão de Stock" showBackButton={true} backToRoute="/menu">
      {/* Toast Notification */}
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      {/* Modal de Relatório */}
      {modalRelatorio && (
        <RelatorioStock
          produtos={produtos}
          onClose={() => setModalRelatorio(false)}
          empresaId={empresaSelecionada}
        />
      )}

      <div className="space-y-6">
        {/* Seletor de Empresa */}
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarStock(); }}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">Total de Produtos</p>
                    <p className="text-3xl font-bold text-white">{produtos.length}</p>
                  </div>
                  <div className="bg-blue-600/30 p-3 rounded-full">
                    <Package className="text-blue-400" size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-5 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm">Valor em Stock</p>
                    <p className="text-xl font-bold text-green-400">
                      {valorTotalStock.toLocaleString()} Kz
                    </p>
                    <p className="text-xs text-green-300">≈ {(valorTotalStock / 1000000).toFixed(2)}M Kz</p>
                  </div>
                  <div className="bg-green-600/30 p-3 rounded-full">
                    <TrendingUp className="text-green-400" size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-5 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300 text-sm">Baixo Estoque</p>
                    <p className="text-3xl font-bold text-yellow-400">{produtosBaixoEstoque}</p>
                  </div>
                  <div className="bg-yellow-600/30 p-3 rounded-full">
                    <AlertTriangle className="text-yellow-400" size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-5 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">Margem Média</p>
                    <p className="text-3xl font-bold text-purple-400">{margemMedia}%</p>
                  </div>
                  <div className="bg-purple-600/30 p-3 rounded-full">
                    <Target className="text-purple-400" size={28} />
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de pesquisa */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código, categoria..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              
              <select
                className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Todas Categorias</option>
                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="">Todos Status</option>
                <option value="baixo_estoque">⚠️ Baixo Estoque</option>
                <option value="esgotado">❌ Esgotado</option>
                <option value="vencido">📅 Vencido</option>
              </select>

              <button
                onClick={() => setModalRelatorio(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl transition flex items-center gap-2"
              >
                <FileText size={18} /> Relatório
              </button>

              <button
                onClick={() => { resetForm(); setModalOpen(true); }}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg"
              >
                <Plus size={18} /> Novo Produto
              </button>
            </div>

            {/* Tabela de Produtos */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
                <p className="text-gray-400">Carregando produtos...</p>
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <Package className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum produto encontrado</p>
                <button
                  onClick={() => { resetForm(); setModalOpen(true); }}
                  className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
                >
                  Adicionar Primeiro Produto
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-700">
                      <tr className="text-gray-300 text-sm">
                        <th className="p-4 text-left">Produto</th>
                        <th className="p-4 text-left">Código</th>
                        <th className="p-4 text-center">Qtd</th>
                        <th className="p-4 text-right">Compra</th>
                        <th className="p-4 text-right">Venda</th>
                        <th className="p-4 text-right">Margem</th>
                        <th className="p-4 text-center">Data Registo</th>
                        <th className="p-4 text-center">Validade</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosFiltrados.map(p => {
                        const margem = p.precoCompra > 0 ? ((p.precoVenda - p.precoCompra) / p.precoCompra * 100).toFixed(1) : 0;
                        const isBaixoEstoque = (p.quantidade || 0) <= (p.quantidadeMinima || 5);
                        const isVencido = p.dataValidade && new Date(p.dataValidade) < new Date();
                        const dataRegisto = p.createdAt || p.createdAt;
                        
                        return (
                          <tr key={p._id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                            <td className="p-4">
                              <div className="font-medium text-white">{p.produto}</div>
                              <div className="text-xs text-gray-400">{p.marca || p.categoria}</div>
                            </td>
                            <td className="p-4 text-gray-300 text-sm">{p.codigoBarras || p.codigoInterno || "—"}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                                isBaixoEstoque ? 'bg-yellow-500/20 text-yellow-400' : 
                                p.quantidade === 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                              }`}>
                                {p.quantidade || 0} {p.unidadeMedida === "Unidade" ? "un" : p.unidadeMedida?.substring(0, 3)}
                              </span>
                            </td>
                            <td className="p-4 text-right text-gray-300">{p.precoCompra?.toLocaleString()} Kz</td>
                            <td className="p-4 text-right text-white font-medium">{p.precoVenda?.toLocaleString()} Kz</td>
                            <td className={`p-4 text-right font-medium ${
                              margem > 50 ? 'text-green-400' : margem > 25 ? 'text-blue-400' : margem > 10 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {margem}%
                            </td>
                            <td className="p-4 text-center text-gray-400 text-sm">
                              {formatarData(dataRegisto)}
                            </td>
                            <td className="p-4 text-center">
                              {p.dataValidade ? (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  isVencido ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {formatarData(p.dataValidade)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEditClick(p)}
                                  className="p-2 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-lg transition"
                                  title="Editar"
                                >
                                  <Edit size={16} className="text-yellow-400" />
                                </button>
                                <button
                                  onClick={() => excluirProduto(p._id)}
                                  className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} className="text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalOpen && empresaSelecionada && !redirecting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    {editando ? <Edit className="text-white" size={20} /> : <Package className="text-white" size={20} />}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {editando ? "Editar Produto" : "Novo Produto"}
                  </h2>
                </div>
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-blue-600/10 rounded-xl p-3 border border-blue-500/30">
                  <p className="text-blue-400 text-sm">Empresa: {empresaAtual?.nome}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Produto *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.produto} onChange={(e) => setFormData({...formData, produto: e.target.value})} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Código de Barras</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.codigoBarras} onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Código Interno</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.codigoInterno} onChange={(e) => setFormData({...formData, codigoInterno: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}>
                      <option value="Geral">Geral</option>
                      <option value="Alimentar">Alimentar</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Informática">Informática</option>
                      <option value="Escritório">Escritório</option>
                      <option value="Vestuário">Vestuário</option>
                      <option value="Construção">Construção</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Marca</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço Compra (Kz)</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.precoCompra} onChange={(e) => setFormData({...formData, precoCompra: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço Venda (Kz) *</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.precoVenda} onChange={(e) => setFormData({...formData, precoVenda: parseFloat(e.target.value) || 0})} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Unidade</label>
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.unidadeMedida} onChange={(e) => setFormData({...formData, unidadeMedida: e.target.value})}>
                      {unidadesMedida.map(um => <option key={um} value={um}>{um}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade Mínima</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.quantidadeMinima} onChange={(e) => setFormData({...formData, quantidadeMinima: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data de Validade</label>
                    <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.dataValidade} onChange={(e) => setFormData({...formData, dataValidade: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Fornecedor</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Armazém</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.armazem} onChange={(e) => setFormData({...formData, armazem: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nº Lote</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.numeroLote} onChange={(e) => setFormData({...formData, numeroLote: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                  <textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                    value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={salvando}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {salvando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {salvando ? "Salvando..." : (editando ? "Atualizar" : "Adicionar")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalOpen(false); resetForm(); }}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Stock;