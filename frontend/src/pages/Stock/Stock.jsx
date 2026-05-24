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
  Target, Building2, Save, RefreshCw, Clock, Wrench, Server,
  ShoppingCart, Truck
} from "lucide-react";
import RelatorioStock from "../../components/RelatorioStock";

const Stock = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRelatorio, setModalRelatorio] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [recarregar, setRecarregar] = useState(false);
  
  // Estados para compra com fornecedor
  const [fornecedores, setFornecedores] = useState([]);
  const [modalCompra, setModalCompra] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState("");
  const [quantidadeCompra, setQuantidadeCompra] = useState(1);
  const [precoUnitarioCompra, setPrecoUnitarioCompra] = useState(0);
  const [numeroFacturaCompra, setNumeroFacturaCompra] = useState("");
  
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  // Unidades de medida completas
  const unidadesMedida = [
    "Unidade", "KG", "Litro", "Metro", "Pacote", "Caixa", 
    "Palete", "Grama", "Mililitro", "Centímetro", "Par", 
    "Dúzia", "Cento", "Milheiro", "Rolo", "Fardo", "Hora", "Dia", "Mês", "Serviço"
  ];

  const [formData, setFormData] = useState({
    tipo: "produto",
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
    observacoes: "",
    taxaIVA: 14,
    duracaoEstimada: 0,
    unidadeTempo: "horas",
    precoHora: 0,
    executadoPor: "",
    requerAgendamento: false,
    localExecucao: "",
    recursosNecessarios: "",
    instrucoes: ""
  });

  // Carregar empresas
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
      carregarFornecedores();
    } else {
      setItens([]);
      setFornecedores([]);
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

  const carregarStock = async () => {
    if (!empresaSelecionada) {
      setItens([]);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `https://sirexa-api.onrender.com/api/stock?empresaId=${empresaSelecionada}`;
      if (filtroTipo) {
        url += `&tipo=${filtroTipo}`;
      }
      
      const response = await fetch(url, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (response.status === 403) {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setItens([]);
        return;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const itensData = Array.isArray(data) ? data : (data.dados || []);
      setItens(itensData);
      
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      mostrarMensagem("Erro ao carregar itens", "erro");
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarFornecedores = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/fornecedores?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const fornecedoresList = Array.isArray(data) ? data : (data.dados || []);
        setFornecedores(fornecedoresList);
      }
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
    }
  };

  const registrarCompraComFornecedor = async () => {
    if (!produtoSelecionado) return;
    
    if (!fornecedorSelecionado) {
      mostrarMensagem("Selecione um fornecedor", "erro");
      return;
    }
    
    if (quantidadeCompra <= 0) {
      mostrarMensagem("Quantidade inválida", "erro");
      return;
    }
    
    const precoUnitario = precoUnitarioCompra > 0 ? precoUnitarioCompra : produtoSelecionado.precoCompra;
    
    setSalvando(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/stock/${produtoSelecionado._id}/compra-fornecedor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          empresaId: empresaSelecionada,
          quantidade: quantidadeCompra,
          precoUnitario: precoUnitario,
          fornecedorId: fornecedorSelecionado,
          numeroFactura: numeroFacturaCompra
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        mostrarMensagem(result.mensagem || `Compra registrada com sucesso!`, "sucesso");
        setModalCompra(false);
        setRecarregar(!recarregar);
        resetCompraModal();
      } else {
        mostrarMensagem(result.mensagem || "Erro ao registrar compra", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const resetCompraModal = () => {
    setProdutoSelecionado(null);
    setFornecedorSelecionado("");
    setQuantidadeCompra(1);
    setPrecoUnitarioCompra(0);
    setNumeroFacturaCompra("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }
    
    if (!formData.produto) {
      mostrarMensagem("Nome do item é obrigatório", "erro");
      return;
    }
    
    if (!formData.precoVenda || formData.precoVenda <= 0) {
      mostrarMensagem("Preço de venda é obrigatório", "erro");
      return;
    }

    if (formData.tipo === "produto") {
      if (!formData.precoCompra || formData.precoCompra <= 0) {
        mostrarMensagem("Preço de compra é obrigatório para produtos", "erro");
        return;
      }
      if (formData.precoVenda < formData.precoCompra) {
        mostrarMensagem("Preço de venda não pode ser menor que o preço de compra", "erro");
        return;
      }
      if (!formData.dataValidade) {
        mostrarMensagem("Data de validade é obrigatória para produtos", "erro");
        return;
      }
    }

    setSalvando(true);
    
    try {
      const token = localStorage.getItem("token");
      const url = editando ? `https://sirexa-api.onrender.com/api/stock/${editando}` : "https://sirexa-api.onrender.com/api/stock";
      const method = editando ? "PUT" : "POST";
      
      let dadosEnvio = { 
        ...formData, 
        empresaId: empresaSelecionada
      };
      
      if (formData.tipo === "servico") {
        delete dadosEnvio.precoCompra;
        delete dadosEnvio.quantidade;
        delete dadosEnvio.quantidadeMinima;
        delete dadosEnvio.quantidadeMaxima;
        delete dadosEnvio.dataValidade;
        delete dadosEnvio.armazem;
        delete dadosEnvio.fornecedor;
        delete dadosEnvio.numeroLote;
      }

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
        const msg = editando 
          ? (formData.tipo === "produto" ? "✅ Produto atualizado com sucesso!" : "✅ Serviço atualizado com sucesso!")
          : (formData.tipo === "produto" ? "✅ Produto adicionado com sucesso!" : "✅ Serviço adicionado com sucesso!");
        mostrarMensagem(msg, "sucesso");
        setModalOpen(false);
        setEditando(null);
        resetForm();
        setRecarregar(!recarregar);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao salvar", "erro");
        console.error('Erro detalhado:', result);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const excluirItem = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este item?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/stock/${id}?empresaId=${empresaSelecionada}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Item excluído com sucesso!", "sucesso");
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
      tipo: "produto",
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
      observacoes: "",
      taxaIVA: 14,
      duracaoEstimada: 0,
      unidadeTempo: "horas",
      precoHora: 0,
      executadoPor: "",
      requerAgendamento: false,
      localExecucao: "",
      recursosNecessarios: "",
      instrucoes: ""
    });
  };

  const handleTipoChange = (novoTipo) => {
    setFormData(prev => ({
      ...prev,
      tipo: novoTipo,
      ...(novoTipo === "produto" ? {
        duracaoEstimada: 0,
        unidadeTempo: "horas",
        precoHora: 0,
        executadoPor: "",
        requerAgendamento: false,
        localExecucao: "",
        recursosNecessarios: "",
        instrucoes: ""
      } : {
        precoCompra: 0,
        quantidade: 0,
        quantidadeMinima: 5,
        dataValidade: "",
        fornecedor: "",
        armazem: "Principal",
        numeroLote: ""
      })
    }));
  };

  const handleEditClick = (item) => {
    setEditando(item._id);
    setFormData({
      tipo: item.tipo || "produto",
      produto: item.produto || "",
      codigoBarras: item.codigoBarras || "",
      codigoInterno: item.codigoInterno || "",
      categoria: item.categoria || "Geral",
      marca: item.marca || "",
      unidadeMedida: item.unidadeMedida || "Unidade",
      precoCompra: item.precoCompra || 0,
      precoVenda: item.precoVenda || 0,
      quantidade: item.quantidade || 0,
      quantidadeMinima: item.quantidadeMinima || 5,
      dataValidade: item.dataValidade ? item.dataValidade.split('T')[0] : "",
      fornecedor: item.fornecedor || "",
      armazem: item.armazem || "Principal",
      numeroLote: item.numeroLote || "",
      observacoes: item.observacoes || "",
      taxaIVA: item.taxaIVA || 14,
      duracaoEstimada: item.duracaoEstimada || 0,
      unidadeTempo: item.unidadeTempo || "horas",
      precoHora: item.precoHora || 0,
      executadoPor: item.executadoPor || "",
      requerAgendamento: item.requerAgendamento || false,
      localExecucao: item.localExecucao || "",
      recursosNecessarios: item.recursosNecessarios || "",
      instrucoes: item.instrucoes || ""
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

  const itensFiltrados = itens.filter(item => {
    const matchBusca = busca === "" || 
      item.produto?.toLowerCase().includes(busca.toLowerCase()) ||
      item.codigoBarras?.toLowerCase().includes(busca.toLowerCase()) ||
      item.codigoInterno?.toLowerCase().includes(busca.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(busca.toLowerCase());
    
    const matchCategoria = !filtroCategoria || item.categoria === filtroCategoria;
    const matchTipo = !filtroTipo || item.tipo === filtroTipo;
    
    let matchStatus = true;
    if (item.tipo === "produto") {
      if (filtroStatus === "baixo_estoque") matchStatus = (item.quantidade || 0) <= (item.quantidadeMinima || 5);
      if (filtroStatus === "esgotado") matchStatus = (item.quantidade || 0) === 0;
      if (filtroStatus === "vencido") {
        if (!item.dataValidade) matchStatus = false;
        else matchStatus = new Date(item.dataValidade) < new Date();
      }
    } else {
      if (filtroStatus === "baixo_estoque" || filtroStatus === "esgotado" || filtroStatus === "vencido") {
        matchStatus = false;
      }
    }
    
    return matchBusca && matchCategoria && matchTipo && matchStatus;
  });

  const categorias = [...new Set(itens.map(item => item.categoria).filter(Boolean))];

  const valorTotalStock = itens.filter(item => item.tipo === "produto").reduce((acc, p) => {
    const qtd = p.quantidade || 0;
    const precoVenda = p.precoVenda || 0;
    return acc + (qtd * precoVenda);
  }, 0);
  
  const produtosBaixoEstoque = itens.filter(item => 
    item.tipo === "produto" && (item.quantidade || 0) <= (item.quantidadeMinima || 5)
  ).length;
  
  const produtosList = itens.filter(item => item.tipo === "produto");
  const margemMedia = produtosList.length > 0 
    ? (produtosList.reduce((acc, p) => {
        const compra = p.precoCompra || 0;
        const venda = p.precoVenda || 0;
        if (compra > 0) {
          return acc + ((venda - compra) / compra * 100);
        }
        return acc;
      }, 0) / produtosList.length).toFixed(1)
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
          produtos={itens.filter(i => i.tipo === "produto")}
          servicos={itens.filter(i => i.tipo === "servico")}
          onClose={() => setModalRelatorio(false)}
          empresaId={empresaSelecionada}
        />
      )}

      <div className="space-y-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">Total de Itens</p>
                    <p className="text-3xl font-bold text-white">{itens.length}</p>
                    <div className="text-xs text-blue-300 mt-1">
                      <span className="inline-block mr-2">📦 {itens.filter(i => i.tipo === "produto").length} produtos</span>
                      <span>🛠️ {itens.filter(i => i.tipo === "servico").length} serviços</span>
                    </div>
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
                value={filtroTipo}
                onChange={(e) => { setFiltroTipo(e.target.value); carregarStock(); }}
              >
                <option value="">Todos os Tipos</option>
                <option value="produto">📦 Produtos</option>
                <option value="servico">🛠️ Serviços</option>
              </select>

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
                <Plus size={18} /> Novo Item
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
                <p className="text-gray-400">Carregando itens...</p>
              </div>
            ) : itensFiltrados.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <Package className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum item encontrado</p>
                <button
                  onClick={() => { resetForm(); setModalOpen(true); }}
                  className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
                >
                  Adicionar Primeiro Item
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
  <table className="w-full min-w-[900px]">
    <thead className="bg-gray-700">
      <tr className="text-gray-300 text-sm">
        <th className="p-4 text-left">Item</th>
        <th className="p-4 text-left">Código</th>
        <th className="p-4 text-center">Tipo</th>
        <th className="p-4 text-center">Qtd</th>
        <th className="p-4 text-right">Compra</th>
        <th className="p-4 text-right">Venda</th>
        <th className="p-4 text-right">Margem</th>
        <th className="p-4 text-center">Validade</th>
        <th className="p-4 text-center">Ações</th>
       </tr>
    </thead>
    <tbody>
      {itensFiltrados.map(item => {
        const margem = item.tipo === "produto" && item.precoCompra > 0 
          ? ((item.precoVenda - item.precoCompra) / item.precoCompra * 100).toFixed(1) 
          : 0;
        const isBaixoEstoque = item.tipo === "produto" && (item.quantidade || 0) <= (item.quantidadeMinima || 5);
        const isVencido = item.tipo === "produto" && item.dataValidade && new Date(item.dataValidade) < new Date();
        
        return (
          <tr key={item._id} className="border-t border-gray-700 hover:bg-gray-750 transition">
            <td className="p-4">
              <div className="font-medium text-white flex items-center gap-2">
                {item.tipo === "servico" ? (
                  <Wrench size={16} className="text-purple-400" />
                ) : (
                  <Package size={16} className="text-blue-400" />
                )}
                {item.produto}
              </div>
              <div className="text-xs text-gray-400">{item.marca || item.categoria}</div>
            </td>
            <td className="p-4 text-gray-300 text-sm">{item.codigoBarras || item.codigoInterno || "—"}</td>
            <td className="p-4 text-center">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                item.tipo === "servico" 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {item.tipo === "servico" ? "Serviço" : "Produto"}
              </span>
            </td>
            <td className="p-4 text-center">
              {item.tipo === "produto" ? (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  isBaixoEstoque ? 'bg-yellow-500/20 text-yellow-400' : 
                  item.quantidade === 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {item.quantidade || 0} {item.unidadeMedida === "Unidade" ? "un" : item.unidadeMedida?.substring(0, 3)}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">—</span>
              )}
            </td>
            <td className="p-4 text-right text-gray-300">
              {item.tipo === "produto" ? `${item.precoCompra?.toLocaleString()} Kz` : "—"}
            </td>
            <td className="p-4 text-right text-white font-medium">{item.precoVenda?.toLocaleString()} Kz</td>
            <td className={`p-4 text-right font-medium ${
              item.tipo === "produto" ? (
                margem > 50 ? 'text-green-400' : margem > 25 ? 'text-blue-400' : margem > 10 ? 'text-yellow-400' : 'text-red-400'
              ) : 'text-gray-500'
            }`}>
              {item.tipo === "produto" ? `${margem}%` : "—"}
            </td>
            <td className="p-4 text-center">
              {item.tipo === "produto" && item.dataValidade ? (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isVencido ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {formatarData(item.dataValidade)}
                </span>
              ) : (
                <span className="text-xs text-gray-500">—</span>
              )}
            </td>
            <td className="p-4">
              <div className="flex justify-center gap-2">
                {item.tipo === "produto" && (
                  <button
                    onClick={() => { 
                      setProdutoSelecionado(item);
                      setPrecoUnitarioCompra(item.precoCompra || 0);
                      setModalCompra(true);
                    }}
                    className="p-2 bg-green-600/20 hover:bg-green-600/40 rounded-lg transition"
                    title="Registar Compra"
                  >
                    <ShoppingCart size={16} className="text-green-400" />
                  </button>
                )}
                <button
                  onClick={() => handleEditClick(item)}
                  className="p-2 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-lg transition"
                  title="Editar"
                >
                  <Edit size={16} className="text-yellow-400" />
                </button>
                <button
                  onClick={() => excluirItem(item._id)}
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
      {modalOpen && empresaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    {editando ? <Edit className="text-white" size={20} /> : <Plus className="text-white" size={20} />}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {editando ? (formData.tipo === "produto" ? "Editar Produto" : "Editar Serviço") : (formData.tipo === "produto" ? "Novo Produto" : "Novo Serviço")}
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo"
                        value="produto"
                        checked={formData.tipo === "produto"}
                        onChange={(e) => handleTipoChange(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-white">📦 Produto Físico</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo"
                        value="servico"
                        checked={formData.tipo === "servico"}
                        onChange={(e) => handleTipoChange(e.target.value)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-white">🛠️ Serviço</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome *</label>
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
                      <option value="Consultoria">Consultoria</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Transporte">Transporte</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">IVA (%)</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={formData.taxaIVA || 14} onChange={(e) => setFormData({...formData, taxaIVA: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>

                {formData.tipo === "produto" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Preço Compra (Kz) *</label>
                        <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.precoCompra} onChange={(e) => setFormData({...formData, precoCompra: parseFloat(e.target.value) || 0})} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Data de Validade *</label>
                        <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.dataValidade} onChange={(e) => setFormData({...formData, dataValidade: e.target.value})} required />
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
                        <label className="block text-sm font-medium text-gray-300 mb-2">Fornecedor</label>
                        <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Armazém</label>
                        <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.armazem} onChange={(e) => setFormData({...formData, armazem: e.target.value})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Nº Lote</label>
                        <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.numeroLote} onChange={(e) => setFormData({...formData, numeroLote: e.target.value})} />
                      </div>
                    </div>
                  </>
                )}

                {formData.tipo === "servico" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Duração Estimada</label>
                        <div className="flex gap-2">
                          <input type="number" className="flex-1 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData.duracaoEstimada} onChange={(e) => setFormData({...formData, duracaoEstimada: parseInt(e.target.value) || 0})} />
                          <select className="w-24 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                            value={formData.unidadeTempo} onChange={(e) => setFormData({...formData, unidadeTempo: e.target.value})}>
                            <option value="minutos">Minutos</option>
                            <option value="horas">Horas</option>
                            <option value="dias">Dias</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Preço / Hora (Kz)</label>
                        <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.precoHora} onChange={(e) => setFormData({...formData, precoHora: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Executado Por</label>
                        <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.executadoPor} onChange={(e) => setFormData({...formData, executadoPor: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Local de Execução</label>
                        <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                          value={formData.localExecucao} onChange={(e) => setFormData({...formData, localExecucao: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Recursos Necessários</label>
                      <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                        value={formData.recursosNecessarios} onChange={(e) => setFormData({...formData, recursosNecessarios: e.target.value})} />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.requerAgendamento}
                          onChange={(e) => setFormData({...formData, requerAgendamento: e.target.checked})}
                          className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">Requer agendamento prévio</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Instruções Especiais</label>
                      <textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                        value={formData.instrucoes} onChange={(e) => setFormData({...formData, instrucoes: e.target.value})} />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações Gerais</label>
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

      {/* Modal de Registro de Compra com Fornecedor */}
      {modalCompra && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <ShoppingCart className="text-white" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white">Registar Compra</h2>
                </div>
                <button onClick={() => { setModalCompra(false); resetCompraModal(); }} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Produto</p>
                <p className="text-white font-medium">{produtoSelecionado.produto}</p>
                <p className="text-gray-400 text-sm mt-2">Preço Atual</p>
                <p className="text-green-400 font-bold">{produtoSelecionado.precoVenda?.toLocaleString()} Kz</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fornecedor *
                </label>
                <select 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                  value={fornecedorSelecionado}
                  onChange={(e) => setFornecedorSelecionado(e.target.value)}
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map(f => (
                    <option key={f._id} value={f._id}>{f.nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantidade *
                  </label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={quantidadeCompra}
                    onChange={(e) => setQuantidadeCompra(parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preço Unitário (Kz)
                  </label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={precoUnitarioCompra}
                    onChange={(e) => setPrecoUnitarioCompra(parseFloat(e.target.value) || 0)}
                    placeholder={produtoSelecionado.precoCompra}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Deixe em branco para usar o preço atual
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nº Factura
                </label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                  value={numeroFacturaCompra}
                  onChange={(e) => setNumeroFacturaCompra(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              
              <div className="bg-blue-600/10 rounded-lg p-3">
                <p className="text-blue-400 text-sm">Resumo da Compra</p>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-green-400 font-bold">
                    {(quantidadeCompra * (precoUnitarioCompra > 0 ? precoUnitarioCompra : produtoSelecionado.precoCompra)).toLocaleString()} Kz
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={registrarCompraComFornecedor}
                  disabled={salvando}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {salvando ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  {salvando ? "Processando..." : "Confirmar Compra"}
                </button>
                <button
                  onClick={() => { setModalCompra(false); resetCompraModal(); }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition"
                >
                  Cancelar
                </button>
              </div>
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
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Stock;