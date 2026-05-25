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
  Target, Building2, Save, RefreshCw, Wrench, Users, Boxes
} from "lucide-react";
import RelatorioStock from "../../components/RelatorioStock";

const Stock = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [editando, setEditando] = useState(null);
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("servicos");
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [recarregar, setRecarregar] = useState(false);
  
  const { user, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  // Formulário para SERVIÇO (cadastro/edição)
  const [formData, setFormData] = useState({
    produto: "",
    categoria: "Serviços",
    precoVenda: 0,
    duracaoEstimada: 0,
    unidadeTempo: "horas",
    precoHora: 0,
    executadoPor: "",
    requerAgendamento: false,
    localExecucao: "",
    recursosNecessarios: "",
    instrucoes: "",
    observacoes: "",
    taxaIVA: 14
  });

  // Formulário para PRODUTO (apenas edição) - COM _id
  const [produtoEditData, setProdutoEditData] = useState({
    _id: "",
    produto: "",
    codigoBarras: "",
    codigoInterno: "",
    categoria: "",
    marca: "",
    unidadeMedida: "Unidade",
    precoCompra: 0,
    precoVenda: 0,
    quantidade: 0,
    quantidadeMinima: 5,
    dataValidade: "",
    armazem: "Principal",
    numeroLote: "",
    taxaIVA: 14,
    observacoes: "",
    fornecedorId: ""
  });

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "0 Kz";
    return new Intl.NumberFormat('pt-AO').format(valor) + " Kz";
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarProdutos();
      carregarServicos();
      carregarFuncionarios();
    } else {
      setProdutos([]);
      setServicos([]);
      setFuncionarios([]);
    }
  }, [empresaSelecionada, recarregar]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
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
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarProdutos = async () => {
    if (!empresaSelecionada) {
      setProdutos([]);
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const url = `https://sirexa-api.onrender.com/api/stock?empresaId=${empresaSelecionada}&tipo=produto&ativo=true`;
      
      const response = await fetch(url, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const produtosData = Array.isArray(data) ? data : (data.dados || []);
      setProdutos(produtosData);
      
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setProdutos([]);
    }
  };

  const carregarServicos = async () => {
    if (!empresaSelecionada) {
      setServicos([]);
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const url = `https://sirexa-api.onrender.com/api/stock?empresaId=${empresaSelecionada}&tipo=servico&ativo=true`;
      
      const response = await fetch(url, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const servicosData = Array.isArray(data) ? data : (data.dados || []);
      setServicos(servicosData);
      
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      setServicos([]);
    }
  };

  const carregarFuncionarios = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/gestor?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const funcionariosList = Array.isArray(data) ? data : (data.dados || []);
        setFuncionarios(funcionariosList);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  // CRUD de SERVIÇOS
  const handleSubmitServico = async (e) => {
    e.preventDefault();
    
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }
    
    if (!formData.produto) {
      mostrarMensagem("Nome do serviço é obrigatório", "erro");
      return;
    }
    
    if (!formData.precoVenda || formData.precoVenda <= 0) {
      mostrarMensagem("Preço de venda é obrigatório", "erro");
      return;
    }

    setSalvando(true);
    
    try {
      const token = localStorage.getItem("token");
      const url = editando ? `https://sirexa-api.onrender.com/api/stock/${editando}` : "https://sirexa-api.onrender.com/api/stock";
      const method = editando ? "PUT" : "POST";
      
      const dadosEnvio = { 
        ...formData, 
        empresaId: empresaSelecionada,
        tipo: "servico"
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
        mostrarMensagem(editando ? "✅ Serviço atualizado com sucesso!" : "✅ Serviço adicionado com sucesso!", "sucesso");
        setModalOpen(false);
        setEditando(null);
        resetForm();
        setRecarregar(!recarregar);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao salvar", "erro");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setSalvando(false);
    }
  };

  // Edição de PRODUTO - apenas campos permitidos
  const handleSubmitProdutoEdit = async (e) => {
    e.preventDefault();
    
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }

    setSalvando(true);
    
    try {
      const token = localStorage.getItem("token");
      // Envia apenas os campos que podem ser editados
      const dadosParaEnviar = {
        precoVenda: produtoEditData.precoVenda,
        armazem: produtoEditData.armazem,
        numeroLote: produtoEditData.numeroLote,
        taxaIVA: produtoEditData.taxaIVA,
        observacoes: produtoEditData.observacoes,
        empresaId: empresaSelecionada,
        tipo: "produto"
      };

      const response = await fetch(`https://sirexa-api.onrender.com/api/stock/${produtoEditData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosParaEnviar)
      });

      const result = await response.json();

      if (response.ok) {
        mostrarMensagem("✅ Produto atualizado com sucesso!", "sucesso");
        setModalOpen(false);
        setEditando(null);
        setRecarregar(!recarregar);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao atualizar", "erro");
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const excluirItem = async (id, tipo) => {
    if (!window.confirm(`Tem certeza que deseja excluir este ${tipo === "produto" ? "produto" : "serviço"}?`)) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/stock/${id}?empresaId=${empresaSelecionada}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        mostrarMensagem(`✅ ${tipo === "produto" ? "Produto" : "Serviço"} excluído com sucesso!`, "sucesso");
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
      categoria: "Serviços",
      precoVenda: 0,
      duracaoEstimada: 0,
      unidadeTempo: "horas",
      precoHora: 0,
      executadoPor: "",
      requerAgendamento: false,
      localExecucao: "",
      recursosNecessarios: "",
      instrucoes: "",
      observacoes: "",
      taxaIVA: 14
    });
  };

  const openEditServico = (item) => {
    setEditando(item._id);
    setEditandoTipo("servico");
    setFormData({
      produto: item.produto || "",
      categoria: item.categoria || "Serviços",
      precoVenda: item.precoVenda || 0,
      duracaoEstimada: item.duracaoEstimada || 0,
      unidadeTempo: item.unidadeTempo || "horas",
      precoHora: item.precoHora || 0,
      executadoPor: item.executadoPor || "",
      requerAgendamento: item.requerAgendamento || false,
      localExecucao: item.localExecucao || "",
      recursosNecessarios: item.recursosNecessarios || "",
      instrucoes: item.instrucoes || "",
      observacoes: item.observacoes || "",
      taxaIVA: item.taxaIVA || 14
    });
    setModalOpen(true);
  };

  const openEditProduto = (item) => {
    setEditando(item._id);
    setEditandoTipo("produto");
    setProdutoEditData({
      _id: item._id || "",
      produto: item.produto || "",
      codigoBarras: item.codigoBarras || "",
      codigoInterno: item.codigoInterno || "",
      categoria: item.categoria || "",
      marca: item.marca || "",
      unidadeMedida: item.unidadeMedida || "Unidade",
      precoCompra: item.precoCompra || 0,
      precoVenda: item.precoVenda || 0,
      quantidade: item.quantidade || 0,
      quantidadeMinima: item.quantidadeMinima || 5,
      dataValidade: item.dataValidade ? item.dataValidade.split('T')[0] : "",
      armazem: item.armazem || "Principal",
      numeroLote: item.numeroLote || "",
      taxaIVA: item.taxaIVA || 14,
      observacoes: item.observacoes || "",
      fornecedorId: item.fornecedorId || ""
    });
    setModalOpen(true);
  };

  const formatarData = (data) => {
    if (!data) return "—";
    try {
      return new Date(data).toLocaleDateString('pt-PT');
    } catch {
      return "—";
    }
  };

  const itensFiltrados = (itens, tipo) => {
    let filtrados = [...itens];
    
    if (busca) {
      filtrados = filtrados.filter(item =>
        item.produto?.toLowerCase().includes(busca.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(busca.toLowerCase())
      );
    }
    
    if (filtroCategoria && tipo === "servicos") {
      filtrados = filtrados.filter(item => item.categoria === filtroCategoria);
    }
    
    if (filtroStatus === "agendamento" && tipo === "servicos") {
      filtrados = filtrados.filter(item => item.requerAgendamento === true);
    }
    
    if (filtroStatus === "baixo_estoque" && tipo === "produtos") {
      filtrados = filtrados.filter(item => (item.quantidade || 0) <= (item.quantidadeMinima || 5));
    }
    
    return filtrados;
  };

  const categoriasServicos = [...new Set(servicos.map(item => item.categoria).filter(Boolean))];

  const valorTotalServicos = servicos.reduce((acc, s) => acc + (s.precoVenda || 0), 0);
  const valorTotalProdutos = produtos.reduce((acc, p) => acc + ((p.quantidade || 0) * (p.precoVenda || 0)), 0);
  const servicosComAgendamento = servicos.filter(s => s.requerAgendamento).length;
  const produtosBaixoEstoque = produtos.filter(p => (p.quantidade || 0) <= (p.quantidadeMinima || 5)).length;

  const empresaAtual = isTecnico() 
    ? { nome: userEmpresaNome, _id: userEmpresaId }
    : empresas.find(e => e._id === empresaSelecionada);

  if (loadingEmpresas) {
    return (
      <Layout title="Gestão de Stock" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gestão de Stock" showBackButton={true} backToRoute="/menu">
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

      {modalRelatorio && (
        <RelatorioStock
          produtos={produtos}
          servicos={servicos}
          onClose={() => setModalRelatorio(false)}
          empresaId={empresaSelecionada}
        />
      )}

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarProdutos(); carregarServicos(); }}
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
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">Produtos em Stock</p>
                    <p className="text-3xl font-bold text-white">{produtos.length}</p>
                    <p className="text-xs text-red-300 mt-1">⚠️ {produtosBaixoEstoque} com baixo estoque</p>
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
                      {valorTotalProdutos.toLocaleString()} Kz
                    </p>
                  </div>
                  <div className="bg-green-600/30 p-3 rounded-full">
                    <TrendingUp className="text-green-400" size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-5 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">Serviços</p>
                    <p className="text-3xl font-bold text-white">{servicos.length}</p>
                    <p className="text-xs text-yellow-300 mt-1">📅 {servicosComAgendamento} com agendamento</p>
                  </div>
                  <div className="bg-purple-600/30 p-3 rounded-full">
                    <Wrench className="text-purple-400" size={28} />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-5 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300 text-sm">Faturamento Serviços</p>
                    <p className="text-xl font-bold text-yellow-400">
                      {valorTotalServicos.toLocaleString()} Kz
                    </p>
                  </div>
                  <div className="bg-yellow-600/30 p-3 rounded-full">
                    <Target className="text-yellow-400" size={28} />
                  </div>
                </div>
              </div>
            </div>

            {/* Abas */}
            <div className="border-b border-gray-700">
              <div className="flex gap-4">
                <button
                  onClick={() => { setAbaAtiva("servicos"); setBusca(""); setFiltroCategoria(""); setFiltroStatus(""); }}
                  className={`px-6 py-3 font-medium transition-all duration-200 ${abaAtiva === "servicos" ? "text-purple-400 border-b-2 border-purple-400" : "text-gray-400 hover:text-gray-300"}`}
                >
                  🛠️ Serviços
                </button>
                <button
                  onClick={() => { setAbaAtiva("produtos"); setBusca(""); setFiltroCategoria(""); setFiltroStatus(""); }}
                  className={`px-6 py-3 font-medium transition-all duration-200 ${abaAtiva === "produtos" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"}`}
                >
                  📦 Produtos
                </button>
              </div>
            </div>

            {/* Barra de ferramentas */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={abaAtiva === "servicos" ? "Pesquisar serviço..." : "Pesquisar produto..."}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              
              {abaAtiva === "servicos" && (
                <>
                  <select
                    className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  >
                    <option value="">Todas Categorias</option>
                    {categoriasServicos.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  <select
                    className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="agendamento">Requer Agendamento</option>
                  </select>
                </>
              )}

              {abaAtiva === "produtos" && (
                <select
                  className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="">Todos os Produtos</option>
                  <option value="baixo_estoque">⚠️ Baixo Estoque</option>
                </select>
              )}

              <button
                onClick={() => setModalRelatorio(true)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl transition flex items-center gap-2"
              >
                <FileText size={18} /> Relatório
              </button>

              {abaAtiva === "servicos" && (
                <button
                  onClick={() => { resetForm(); setEditando(null); setEditandoTipo("servico"); setModalOpen(true); }}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg"
                >
                  <Plus size={18} /> Novo Serviço
                </button>
              )}
            </div>

            {/* Tabela de SERVIÇOS */}
            {abaAtiva === "servicos" && (
              loading ? (
                <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
              ) : itensFiltrados(servicos, "servicos").length === 0 ? (
                <div className="bg-gray-800 rounded-2xl p-12 text-center">
                  <Wrench className="mx-auto mb-4 text-gray-500" size={48} />
                  <p className="text-gray-400 text-lg">Nenhum serviço encontrado</p>
                  <button onClick={() => { resetForm(); setEditando(null); setModalOpen(true); }} className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg">
                    Adicionar Primeiro Serviço
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-700">
                        <tr className="text-gray-300 text-sm">
                          <th className="p-4 text-left">Serviço</th>
                          <th className="p-4 text-left">Categoria</th>
                          <th className="p-4 text-center">Duração</th>
                          <th className="p-4 text-right">Preço</th>
                          <th className="p-4 text-center">Agendamento</th>
                          <th className="p-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensFiltrados(servicos, "servicos").map(item => (
                          <tr key={item._id} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="p-4">
                              <div className="font-medium text-white">{item.produto}</div>
                              {item.executadoPor && <div className="text-xs text-gray-400 mt-1"><Users size={12} className="inline mr-1" /> {item.executadoPor}</div>}
                            </td>
                            <td className="p-4 text-gray-300">{item.categoria || "Serviços"}</td>
                            <td className="p-4 text-center text-gray-300">{item.duracaoEstimada > 0 ? `${item.duracaoEstimada} ${item.unidadeTempo}` : "—"}</td>
                            <td className="p-4 text-right text-white font-medium">{item.precoVenda?.toLocaleString()} Kz</td>
                            <td className="p-4 text-center">{item.requerAgendamento ? <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">📅 Sim</span> : <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-400 rounded-full">Não</span>}</td>
                            <td className="p-4"><div className="flex justify-center gap-2"><button onClick={() => openEditServico(item)} className="p-2 bg-yellow-600/20 rounded-lg"><Edit size={16} className="text-yellow-400" /></button><button onClick={() => excluirItem(item._id, "servico")} className="p-2 bg-red-600/20 rounded-lg"><Trash2 size={16} className="text-red-400" /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {/* Tabela de PRODUTOS */}
            {abaAtiva === "produtos" && (
              loading ? (
                <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
              ) : itensFiltrados(produtos, "produtos").length === 0 ? (
                <div className="bg-gray-800 rounded-2xl p-12 text-center">
                  <Package className="mx-auto mb-4 text-gray-500" size={48} />
                  <p className="text-gray-400 text-lg">Nenhum produto encontrado</p>
                  <p className="text-gray-500 text-sm mt-2">Os produtos são criados automaticamente ao cadastrar fornecedores do tipo "Mercadoria"</p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                      <thead className="bg-gray-700">
                        <tr className="text-gray-300 text-sm">
                          <th className="p-4 text-left">Produto</th>
                          <th className="p-4 text-left">Categoria</th>
                          <th className="p-4 text-center">Qtd</th>
                          <th className="p-4 text-right">Compra</th>
                          <th className="p-4 text-right">Venda</th>
                          <th className="p-4 text-center">Validade</th>
                          <th className="p-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensFiltrados(produtos, "produtos").map(item => {
                          const isBaixoEstoque = (item.quantidade || 0) <= (item.quantidadeMinima || 5);
                          return (
                            <tr key={item._id} className="border-t border-gray-700 hover:bg-gray-750">
                              <td className="p-4">
                                <div className="font-medium text-white">{item.produto}</div>
                                <div className="text-xs text-gray-400">{item.marca || item.categoria}</div>
                              </td>
                              <td className="p-4 text-gray-300">{item.categoria || "Geral"}</td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-sm ${isBaixoEstoque ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                  {item.quantidade || 0} {item.unidadeMedida}
                                </span>
                              </td>
                              <td className="p-4 text-right text-gray-300">{item.precoCompra?.toLocaleString()} Kz</td>
                              <td className="p-4 text-right text-white font-medium">{item.precoVenda?.toLocaleString()} Kz</td>
                              <td className="p-4 text-center">{item.dataValidade ? formatarData(item.dataValidade) : "—"}</td>
                              <td className="p-4"><div className="flex justify-center gap-2"><button onClick={() => openEditProduto(item)} className="p-2 bg-yellow-600/20 rounded-lg"><Edit size={16} className="text-yellow-400" /></button><button onClick={() => excluirItem(item._id, "produto")} className="p-2 bg-red-600/20 rounded-lg"><Trash2 size={16} className="text-red-400" /></button></div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Modal de Edição de PRODUTO - APENAS CAMPOS PERMITIDOS */}
      {modalOpen && editandoTipo === "produto" && produtoEditData._id && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg"><Edit className="text-white" size={20} /></div>
                  <h2 className="text-xl font-bold text-white">Editar Produto</h2>
                </div>
                <button onClick={() => { setModalOpen(false); setEditando(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Aviso importante */}
              <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-3 mb-4">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Apenas preço de venda, armazém, lote, taxa IVA e observações podem ser editados.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Para alterar quantidade, preço de compra ou validade, registre uma nova compra no fornecedor.
                </p>
              </div>
              
              {/* Informação do produto (SOMENTE LEITURA) */}
              <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                <p className="text-gray-400 text-sm">Produto</p>
                <p className="text-white font-medium">{produtoEditData.produto}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-gray-400">Código Barras</p>
                    <p className="text-gray-300">{produtoEditData.codigoBarras || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Código Interno</p>
                    <p className="text-gray-300">{produtoEditData.codigoInterno || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Categoria</p>
                    <p className="text-gray-300">{produtoEditData.categoria || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Marca</p>
                    <p className="text-gray-300">{produtoEditData.marca || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Preço Compra</p>
                    <p className="text-green-400">{formatarMoeda(produtoEditData.precoCompra)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Quantidade</p>
                    <p className="text-white">{produtoEditData.quantidade} {produtoEditData.unidadeMedida}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Quantidade Mínima</p>
                    <p className="text-white">{produtoEditData.quantidadeMinima} {produtoEditData.unidadeMedida}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Data Validade</p>
                    <p className="text-white">{formatarData(produtoEditData.dataValidade)}</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmitProdutoEdit} className="space-y-4">
                {/* Preço de Venda - EDITÁVEL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preço de Venda (Kz) *
                  </label>
                  <input 
                    type="number" 
                    step="1"
                    className="w-full p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-white font-bold"
                    value={produtoEditData.precoVenda || 0} 
                    onChange={(e) => setProdutoEditData({...produtoEditData, precoVenda: parseFloat(e.target.value) || 0})} 
                    required 
                  />
                </div>
                
                {/* Armazém - EDITÁVEL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Armazém</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={produtoEditData.armazem || ""} onChange={(e) => setProdutoEditData({...produtoEditData, armazem: e.target.value})} />
                </div>
                
                {/* Nº Lote - EDITÁVEL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nº Lote</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={produtoEditData.numeroLote || ""} onChange={(e) => setProdutoEditData({...produtoEditData, numeroLote: e.target.value})} />
                </div>
                
                {/* Taxa de IVA - EDITÁVEL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label>
                  <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={produtoEditData.taxaIVA || 14} onChange={(e) => setProdutoEditData({...produtoEditData, taxaIVA: parseFloat(e.target.value) || 14})} />
                </div>
                
                {/* Observações - EDITÁVEL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                  <textarea rows="3" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={produtoEditData.observacoes || ""} onChange={(e) => setProdutoEditData({...produtoEditData, observacoes: e.target.value})} />
                </div>
                
                {/* Botão para criar nova compra */}
                <div className="border-t border-gray-700 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      if (produtoEditData.fornecedorId) {
                        navigate(`/fornecedores/editar/${produtoEditData.fornecedorId}`);
                      } else {
                        mostrarMensagem("Fornecedor não associado a este produto", "erro");
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg transition flex items-center justify-center gap-2 text-white"
                  >
                    <Plus size={16} /> Registrar Nova Entrada no Fornecedor
                  </button>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={salvando} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-2 rounded-lg text-white">
                    {salvando ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Salvar Alterações"}
                  </button>
                  <button type="button" onClick={() => { setModalOpen(false); setEditando(null); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição de SERVIÇO */}
      {modalOpen && editandoTipo === "servico" && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3"><div className="bg-purple-600 p-2 rounded-lg">{editando ? <Edit className="text-white" size={20} /> : <Plus className="text-white" size={20} />}</div><h2 className="text-xl font-bold text-white">{editando ? "Editar Serviço" : "Novo Serviço"}</h2></div>
                <button onClick={() => { setModalOpen(false); resetForm(); setEditando(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitServico} className="space-y-4">
                <div className="bg-purple-600/10 rounded-xl p-3"><p className="text-purple-400 text-sm">Empresa: {empresaAtual?.nome}</p></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Nome do Serviço *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.produto} onChange={(e) => setFormData({...formData, produto: e.target.value})} required /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})}><option value="Serviços">Serviços</option><option value="Consultoria">Consultoria</option><option value="Manutenção">Manutenção</option><option value="Limpeza">Limpeza</option><option value="Transporte">Transporte</option><option value="Informática">Informática</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label><input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.taxaIVA} onChange={(e) => setFormData({...formData, taxaIVA: parseFloat(e.target.value) || 14})} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Preço de Venda (Kz) *</label><input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.precoVenda} onChange={(e) => setFormData({...formData, precoVenda: parseFloat(e.target.value) || 0})} required /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Preço por Hora (Kz)</label><input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.precoHora} onChange={(e) => setFormData({...formData, precoHora: parseFloat(e.target.value) || 0})} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Duração Estimada</label><div className="flex gap-2"><input type="number" className="flex-1 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.duracaoEstimada} onChange={(e) => setFormData({...formData, duracaoEstimada: parseInt(e.target.value) || 0})} /><select className="w-24 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.unidadeTempo} onChange={(e) => setFormData({...formData, unidadeTempo: e.target.value})}><option value="minutos">Minutos</option><option value="horas">Horas</option><option value="dias">Dias</option></select></div></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">Executado Por</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.executadoPor} onChange={(e) => setFormData({...formData, executadoPor: e.target.value})}><option value="">Selecione um funcionário</option>{funcionarios.map(f => (<option key={f._id} value={f.nome}>{f.nome}</option>))}</select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Local de Execução</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.localExecucao} onChange={(e) => setFormData({...formData, localExecucao: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Recursos Necessários</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.recursosNecessarios} onChange={(e) => setFormData({...formData, recursosNecessarios: e.target.value})} /></div>
                <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.requerAgendamento} onChange={(e) => setFormData({...formData, requerAgendamento: e.target.checked})} className="w-4 h-4 rounded border-gray-600 text-purple-600" /><span className="text-sm text-gray-300">Requer agendamento prévio</span></label></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Instruções Especiais</label><textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={formData.instrucoes} onChange={(e) => setFormData({...formData, instrucoes: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Observações Gerais</label><textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} /></div>
                <div className="flex gap-3 pt-4"><button type="submit" disabled={salvando} className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-3 rounded-xl">{salvando ? <Loader2 className="animate-spin mx-auto" /> : <><Save size={20} className="inline mr-2" /> {editando ? "Atualizar" : "Adicionar"}</>}</button><button type="button" onClick={() => { setModalOpen(false); resetForm(); setEditando(null); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancelar</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Stock;