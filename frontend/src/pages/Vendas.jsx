// src/pages/Vendas.jsx 
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  Plus, Search, Eye, Printer, TrendingUp, Trash2, 
  X, CheckCircle, AlertCircle, Loader2,
  User, CreditCard, DollarSign, FileText,
  Minus, ChevronLeft, ChevronRight, ShoppingCart, 
  Package, Filter, Barcode, Building2, RefreshCw,
  Percent
} from "lucide-react";
import { gerarFacturaProfissional } from "../services/facturaService";

const Vendas = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [busca, setBusca] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [searchCliente, setSearchCliente] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [emitindo, setEmitindo] = useState(false);
  const [codigoBarrasInput, setCodigoBarrasInput] = useState("");
  const [showFiltros, setShowFiltros] = useState(false);
  const [recarregar, setRecarregar] = useState(false);
  
  const [configFiscal, setConfigFiscal] = useState({
    incluiIVA: true,
    taxaIVA: 14,
    incluiRetencao: false,
    taxaRetencao: 7
  });

  const { 
    user, 
    isGestor, 
    isTecnico, 
    empresaId: userEmpresaId, 
    empresaNome: userEmpresaNome,
    empresaNif: userEmpresaNif,
    empresaEmail: userEmpresaEmail,
    empresaTelefone: userEmpresaTelefone,
    empresaEndereco: userEmpresaEndereco
  } = useAuth();

  const [formVenda, setFormVenda] = useState({
    cliente: "",
    clienteId: "",
    nifCliente: "",
    emailCliente: "",
    telefoneCliente: "",
    enderecoCliente: "",
    tipoFactura: "Venda",
    formaPagamento: "Dinheiro",
    contaBancaria: "",
    desconto: 0
  });

  const formatarMoedaInput = (valor) => {
    if (!valor && valor !== 0) return "";
    const numeros = valor.toString().replace(/\D/g, "");
    if (!numeros) return "";
    return new Intl.NumberFormat('pt-AO').format(parseInt(numeros));
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "0";
    return new Intl.NumberFormat('pt-AO').format(valor);
  };

  const converterParaNumero = (valorFormatado) => {
    if (!valorFormatado) return 0;
    return parseInt(valorFormatado.replace(/\D/g, "")) || 0;
  };

  // ============================================
  // useEffects
  // ============================================
  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      console.log("🏢 Carregando dados para empresa ID:", empresaSelecionada);
      carregarVendas();
      carregarClientes();
      carregarProdutos();
      carregarContasBancarias();
      carregarConfigFiscal();
    } else {
      setVendas([]);
      setClientes([]);
      setProdutos([]);
      setContasBancarias([]);
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    if (empresaSelecionada && recarregar) {
      carregarVendas();
      setRecarregar(false);
    }
  }, [empresaSelecionada, recarregar]);

  useEffect(() => {
    if (!produtos.length) return;
    
    let filtrados = produtos.filter(p => p.quantidade > 0);
    
    if (buscaProduto) {
      filtrados = filtrados.filter(p => 
        p.produto?.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        p.codigoBarras?.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        p.codigoInterno?.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        p.marca?.toLowerCase().includes(buscaProduto.toLowerCase())
      );
    }
    
    if (filtroCategoria) {
      filtrados = filtrados.filter(p => p.categoria === filtroCategoria);
    }
    
    setProdutosFiltrados(filtrados);
  }, [buscaProduto, filtroCategoria, produtos]);

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      console.log("🔧 Técnico - Definindo empresa automaticamente:", userEmpresaId);
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  // ============================================
  // Funções de Carregamento
  // ============================================
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
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarConfigFiscal = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/empresa/config-fiscal/${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const config = data.config || data;
        setConfigFiscal({
          incluiIVA: config.incluiIVA !== false,
          taxaIVA: config.taxaIVA || 14,
          incluiRetencao: config.incluiRetencao || false,
          taxaRetencao: config.taxaRetencao || 7
        });
      } else {
        console.log('Usando configuração fiscal padrão');
        setConfigFiscal({
          incluiIVA: true,
          taxaIVA: 14,
          incluiRetencao: false,
          taxaRetencao: 7
        });
      }
    } catch (error) {
      console.error("Erro ao carregar config fiscal:", error);
      setConfigFiscal({
        incluiIVA: true,
        taxaIVA: 14,
        incluiRetencao: false,
        taxaRetencao: 7
      });
    }
  };

  const carregarVendas = async () => {
    if (!empresaSelecionada) {
      setVendas([]);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/vendas/historico/${empresaSelecionada}?page=${paginaAtual}&limit=20`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setVendas([]);
        return;
      }
      
      const data = await response.json();
      if (data.sucesso) {
        setVendas(data.dados || []);
        setTotalPaginas(data.totalPaginas || 1);
      } else {
        setVendas([]);
      }
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      setVendas([]);
    } finally {
      setLoading(false);
    }
  };
  
  const carregarClientes = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/clientes/${empresaSelecionada}?limit=100`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setClientes([]);
        return;
      }
      
      const data = await response.json();
      if (data.sucesso) {
        setClientes(data.dados || []);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const carregarProdutos = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/stock?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setProdutos([]);
        setProdutosFiltrados([]);
        return;
      }
      
      const data = await response.json();
      const produtosData = Array.isArray(data) ? data : (data.dados || []);
      setProdutos(produtosData);
      setProdutosFiltrados(produtosData.filter(p => p.quantidade > 0));
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const carregarContasBancarias = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/bancos?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setContasBancarias([]);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setContasBancarias(Array.isArray(data) ? data : (data.dados || []));
      }
    } catch (error) {
      console.error("Erro ao carregar contas bancárias:", error);
    }
  };

  // ============================================
  // Funções do Carrinho e Venda
  // ============================================
  const buscarProdutoPorCodigo = async () => {
    if (!codigoBarrasInput.trim()) {
      mostrarMensagem("Digite um código de barras", "erro");
      return;
    }

    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/stock/por-codigo-barras/${codigoBarrasInput}?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const produto = data.dados || data;
        if (produto.quantidade > 0) {
          adicionarAoCarrinho(produto);
          mostrarMensagem(`Produto adicionado: ${produto.produto}`, "sucesso");
          setCodigoBarrasInput("");
        } else {
          mostrarMensagem(`Produto "${produto.produto}" sem estoque disponível`, "erro");
        }
      } else {
        mostrarMensagem("Produto não encontrado", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao buscar produto", "erro");
    }
  };

  const handleClienteSelect = (cliente) => {
    setFormVenda({
      ...formVenda,
      cliente: cliente.nome,
      clienteId: cliente._id,
      nifCliente: cliente.nif,
      emailCliente: cliente.email || "",
      telefoneCliente: cliente.telefone || "",
      enderecoCliente: cliente.endereco || ""
    });
    setSearchCliente(cliente.nome);
    setShowClienteDropdown(false);
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.nif?.includes(searchCliente)
  );

  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  const adicionarAoCarrinho = (produto) => {
    if (produto.quantidade <= 0) {
      mostrarMensagem(`Produto "${produto.produto}" sem estoque`, "erro");
      return;
    }

    const itemExistente = carrinho.find(item => item._id === produto._id);
    const quantidadeAtualNoCarrinho = itemExistente ? itemExistente.quantidade : 0;
    
    if (quantidadeAtualNoCarrinho + 1 > produto.quantidade) {
      mostrarMensagem(`Estoque insuficiente para "${produto.produto}". Disponível: ${produto.quantidade}`, "erro");
      return;
    }

    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item._id === produto._id ? { 
          ...item, 
          quantidade: item.quantidade + 1, 
          total: item.precoUnitario * (item.quantidade + 1) 
        } : item
      ));
    } else {
      setCarrinho([...carrinho, { 
        ...produto, 
        quantidade: 1,
        produtoId: produto._id,
        produtoOuServico: produto.produto,
        precoUnitario: produto.precoVenda,
        total: produto.precoVenda,
        taxaIVA: produto.taxaIVA || configFiscal.taxaIVA
      }]);
    }
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(carrinho.filter(item => item._id !== id));
  };

  const atualizarQuantidade = (id, quantidade) => {
    const produto = produtos.find(p => p._id === id);
    
    if (quantidade <= 0) {
      removerDoCarrinho(id);
    } else if (produto && quantidade > produto.quantidade) {
      mostrarMensagem(`Estoque insuficiente. Disponível: ${produto.quantidade}`, "erro");
    } else {
      setCarrinho(carrinho.map(item =>
        item._id === id ? { 
          ...item, 
          quantidade, 
          total: item.precoUnitario * quantidade 
        } : item
      ));
    }
  };

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => total + item.total, 0);
  };

  const calcularTotalIVA = () => {
    if (!configFiscal.incluiIVA) return 0;
    return carrinho.reduce((total, item) => {
      const iva = item.total * (configFiscal.taxaIVA / 100);
      return total + iva;
    }, 0);
  };

  const calcularTotalRetencao = () => {
    if (!configFiscal.incluiRetencao) return 0;
    const subtotal = calcularSubtotal();
    const desconto = converterParaNumero(formVenda.desconto);
    const subtotalComDesconto = subtotal - desconto;
    return subtotalComDesconto * (configFiscal.taxaRetencao / 100);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const desconto = converterParaNumero(formVenda.desconto);
    const subtotalComDesconto = subtotal - desconto;
    const iva = configFiscal.incluiIVA ? subtotalComDesconto * (configFiscal.taxaIVA / 100) : 0;
    const retencao = calcularTotalRetencao();
    return subtotalComDesconto + iva - retencao;
  };

  const handleDescontoChange = (e) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    setFormVenda({...formVenda, desconto: valorFormatado});
  };

  const finalizarVenda = async () => {
    console.log("=== INICIANDO FINALIZAÇÃO DA VENDA ===");

    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }

    if (carrinho.length === 0) {
      mostrarMensagem("Adicione produtos ao carrinho", "erro");
      return;
    }

    if (!formVenda.cliente || formVenda.cliente.trim() === "") {
      mostrarMensagem("Informe o nome do cliente", "erro");
      return;
    }

    if (!formVenda.formaPagamento) {
      mostrarMensagem("Selecione a forma de pagamento", "erro");
      return;
    }

    setEmitindo(true);

    const descontoNumerico = converterParaNumero(formVenda.desconto);
    const subtotal = calcularSubtotal();
    const subtotalComDesconto = subtotal - descontoNumerico;
    const totalIVA = configFiscal.incluiIVA ? subtotalComDesconto * (configFiscal.taxaIVA / 100) : 0;
    const totalRetencao = configFiscal.incluiRetencao ? subtotalComDesconto * (configFiscal.taxaRetencao / 100) : 0;
    const totalFinal = subtotalComDesconto + totalIVA - totalRetencao;

    console.log("Dados da venda:", {
      subtotal,
      desconto: descontoNumerico,
      subtotalComDesconto,
      taxaIVA: configFiscal.taxaIVA,
      totalIVA,
      incluiRetencao: configFiscal.incluiRetencao,
      taxaRetencao: configFiscal.taxaRetencao,
      totalRetencao,
      totalFinal
    });

    let empresaAtual;
    let empresaNifValue;
    
    if (isTecnico()) {
      empresaNifValue = userEmpresaNif;
      empresaAtual = { 
        nif: empresaNifValue, 
        nome: userEmpresaNome,
        email: userEmpresaEmail,
        telefone: userEmpresaTelefone,
        endereco: userEmpresaEndereco
      };
      console.log("🔧 Técnico - Usando empresa:", { nome: userEmpresaNome, nif: userEmpresaNif });
    } else {
      empresaAtual = empresas.find(e => e._id === empresaSelecionada);
      empresaNifValue = empresaAtual?.nif;
    }
    
    if (!empresaNifValue) {
      mostrarMensagem("Empresa não tem NIF cadastrado", "erro");
      setEmitindo(false);
      return;
    }
    
    const vendaData = {
      empresaId: empresaSelecionada, 
      venda: {
        cliente: formVenda.cliente,
        nifCliente: formVenda.nifCliente || "999999999",
        emailCliente: formVenda.emailCliente,
        telefoneCliente: formVenda.telefoneCliente,
        enderecoCliente: formVenda.enderecoCliente,
        tipoFactura: formVenda.tipoFactura,
        formaPagamento: formVenda.formaPagamento,
        itens: carrinho.map(item => ({
          produtoId: item.produtoId,
          produtoOuServico: item.produtoOuServico,
          codigoBarras: item.codigoBarras,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          total: item.total,
          taxaIVA: configFiscal.taxaIVA
        })),
        desconto: descontoNumerico,
        retencao: totalRetencao,
        taxaRetencao: configFiscal.taxaRetencao,
        incluiIVA: configFiscal.incluiIVA,
        incluiRetencao: configFiscal.incluiRetencao,
        taxaIVA: configFiscal.taxaIVA,
        detalhesPagamento: {
          metodo: formVenda.formaPagamento,
          conta: formVenda.contaBancaria
        }
      },
      empresaNif: empresaNifValue,
      contaBancaria: formVenda.contaBancaria
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/vendas/emitir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(vendaData)
      });

      const result = await response.json();

      if (response.ok && result.sucesso) {
        mostrarMensagem(result.mensagem || "Venda realizada com sucesso!", "sucesso");
        
        if (result.dados && result.dados.venda) {
          await gerarFacturaProfissional(result.dados.venda, user, empresaAtual, contasBancarias);
        }
        
        setModalOpen(false);
        setCarrinho([]);
        resetFormVenda();
        setRecarregar(true);
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao finalizar venda", "erro");
        setEmitindo(false);
      }
    } catch (error) {
      console.error("❌ Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setEmitindo(false);
    }
  };

  const resetFormVenda = () => {
    setFormVenda({
      cliente: "",
      clienteId: "",
      nifCliente: "",
      emailCliente: "",
      telefoneCliente: "",
      enderecoCliente: "",
      tipoFactura: "Venda",
      formaPagamento: "Dinheiro",
      contaBancaria: "",
      desconto: 0
    });
    setSearchCliente("");
    setCarrinho([]);
    setBuscaProduto("");
    setFiltroCategoria("");
    setCodigoBarrasInput("");
    setConfigFiscal({
      incluiIVA: true,
      taxaIVA: 14,
      incluiRetencao: false,
      taxaRetencao: 7
    });
  };

  const verDetalhes = (venda) => {
    setVendaSelecionada(venda);
    setModalDetalhes(true);
  };

  const imprimirFactura = async (venda) => {
    let empresaAtual;
    if (isTecnico()) {
      empresaAtual = { 
        nome: userEmpresaNome, 
        nif: userEmpresaNif,
        email: userEmpresaEmail,
        telefone: userEmpresaTelefone,
        endereco: userEmpresaEndereco
      };
    } else {
      empresaAtual = empresas.find(e => e._id === empresaSelecionada);
    }
    await gerarFacturaProfissional(venda, user, empresaAtual);
  };

  const vendasFiltradas = vendas.filter(v =>
    v.cliente?.toLowerCase().includes(busca.toLowerCase()) ||
    v.numeroFactura?.toString().includes(busca)
  );

  const empresaAtual = isTecnico() 
    ? { 
        nome: userEmpresaNome, 
        nif: userEmpresaNif,
        email: userEmpresaEmail,
        telefone: userEmpresaTelefone,
        endereco: userEmpresaEndereco
      }
    : empresas.find(e => e._id === empresaSelecionada);
    
  const descontoNumerico = converterParaNumero(formVenda.desconto);
  const subtotal = calcularSubtotal();
  const totalIVA = calcularTotalIVA();
  const totalRetencao = calcularTotalRetencao();
  const totalFinal = calcularTotal();

  if (loadingEmpresas) {
    return (
      <Layout title="Vendas" showBackButton={true} backToRoute="/menu">
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
    <Layout title="Vendas" showBackButton={true} backToRoute="/menu">
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

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { if(empresaSelecionada) { carregarVendas(); carregarProdutos(); } }}
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
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Pesquisar venda por cliente ou número da factura..." className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <button onClick={() => { resetFormVenda(); setModalOpen(true); }} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg">
                <Plus size={18} /> Nova Venda
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-blue-300 text-sm">Total de Vendas</p><p className="text-3xl font-bold text-white">{vendas.length}</p></div>
                  <div className="bg-blue-600/30 p-3 rounded-full"><ShoppingCart className="text-blue-400" size={28} /></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-5 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-green-300 text-sm">Faturamento Total</p><p className="text-xl font-bold text-green-400">{vendas.reduce((acc, v) => acc + (v.total || 0), 0).toLocaleString()} Kz</p></div>
                  <div className="bg-green-600/30 p-3 rounded-full"><TrendingUp className="text-green-400" size={28} /></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-5 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-yellow-300 text-sm">Clientes</p><p className="text-3xl font-bold text-yellow-400">{clientes.length}</p></div>
                  <div className="bg-yellow-600/30 p-3 rounded-full"><User className="text-yellow-400" size={28} /></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-5 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-purple-300 text-sm">Ticket Médio</p><p className="text-2xl font-bold text-purple-400">{vendas.length > 0 ? Math.round(vendas.reduce((acc, v) => acc + (v.total || 0), 0) / vendas.length).toLocaleString() : 0} Kz</p></div>
                  <div className="bg-purple-600/30 p-3 rounded-full"><DollarSign className="text-purple-400" size={28} /></div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} /><p className="text-gray-400">Carregando vendas...</p></div>
            ) : vendasFiltradas.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <ShoppingCart className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhuma venda encontrada</p>
                <button onClick={() => { resetFormVenda(); setModalOpen(true); }} className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition">Iniciar Primeira Venda</button>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr className="text-white">
                        <th className="p-4 text-left">Factura</th>
                        <th className="p-4 text-left">Data</th>
                        <th className="p-4 text-left">Cliente</th>
                        <th className="p-4 text-right">Total</th>
                        <th className="p-4 text-center">Pagamento</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendasFiltradas.map(v => (
                        <tr key={v._id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                          <td className="p-4 font-mono text-blue-400">FT {v.numeroFactura}</td>
                          <td className="p-4 text-gray-300">{new Date(v.data).toLocaleDateString('pt-PT')}</td>
                          <td className="p-4"><div className="font-medium text-white">{v.cliente}</div><div className="text-xs text-gray-400">NIF: {v.nifCliente}</div></td>
                          <td className="p-4 text-right text-green-400 font-bold">{v.total?.toLocaleString()} Kz</td>
                          <td className="p-4 text-center"><span className="px-2 py-1 rounded-lg text-xs bg-gray-700 text-gray-300">{v.formaPagamento}</span></td>
                          <td className="p-4 text-center"><span className="px-2 py-1 rounded-lg text-xs bg-green-600/20 text-green-400">{v.status || "Finalizada"}</span></td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => verDetalhes(v)} className="p-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg transition"><Eye size={16} className="text-blue-400" /></button>
                              <button onClick={() => imprimirFactura(v)} className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg transition"><Printer size={16} className="text-purple-400" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-700">
                    <button onClick={() => { setPaginaAtual(p => Math.max(1, p - 1)); carregarVendas(); }} disabled={paginaAtual === 1} className="p-2 bg-gray-700 rounded-lg disabled:opacity-50"><ChevronLeft size={18} /></button>
                    <span className="text-gray-400">Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => { setPaginaAtual(p => Math.min(totalPaginas, p + 1)); carregarVendas(); }} disabled={paginaAtual === totalPaginas} className="p-2 bg-gray-700 rounded-lg disabled:opacity-50"><ChevronRight size={18} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Modal de Nova Venda */}
            {modalOpen && !redirecting && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3"><div className="bg-green-600 p-2 rounded-lg"><ShoppingCart className="text-white" size={20} /></div><h2 className="text-xl font-bold text-white">Nova Venda</h2></div>
                      <button onClick={() => { setModalOpen(false); resetFormVenda(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna Esquerda */}
                      <div className="space-y-4">
                        <div className="bg-blue-600/10 rounded-xl p-3 border border-blue-500/30">
                          <p className="text-blue-400 text-sm">Empresa: {empresaAtual?.nome}</p>
                          <p className="text-gray-400 text-xs">NIF: {empresaAtual?.nif}</p>
                        </div>

                        {/* Cliente */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Dados do Cliente</h3>
                          <div className="relative mb-3">
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                                  placeholder="Digite o nome do cliente (novo ou existente)" 
                                  value={searchCliente} 
                                  onChange={(e) => { 
                                    const valor = e.target.value;
                                    setSearchCliente(valor); 
                                    setShowClienteDropdown(true);
                                    setFormVenda(prev => ({ ...prev, cliente: valor }));
                                    if (valor === "") { 
                                      setFormVenda(prev => ({ ...prev, cliente: "", clienteId: "", nifCliente: "", emailCliente: "", telefoneCliente: "", enderecoCliente: ""})); 
                                    } 
                                  }} 
                                  onFocus={() => setShowClienteDropdown(true)} 
                                />
                                {showClienteDropdown && clientesFiltrados.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-xl border border-gray-600 max-h-60 overflow-auto">
                                    <div className="p-2 border-b border-gray-600 text-xs text-gray-400">📋 Clientes cadastrados:</div>
                                    {clientesFiltrados.map(cliente => (
                                      <div key={cliente._id} className="p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-0" onClick={() => handleClienteSelect(cliente)}>
                                        <p className="text-white font-medium">{cliente.nome}</p>
                                        <p className="text-xs text-gray-400">NIF: {cliente.nif} | {cliente.telefone}</p>
                                      </div>
                                    ))}
                                    <div className="p-2 border-t border-gray-600 text-xs text-gray-400">💡 Digite um nome diferente para cliente avulso</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">💡 Pode digitar qualquer nome - cliente será cadastrado automaticamente</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">NIF (opcional)</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.nifCliente} onChange={(e) => setFormVenda({...formVenda, nifCliente: e.target.value})} /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Telefone (opcional)</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.telefoneCliente} onChange={(e) => setFormVenda({...formVenda, telefoneCliente: e.target.value})} /></div>
                          </div>
                        </div>

                        {/* Configuração Fiscal */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Percent className="w-4 h-4" /> Configuração Fiscal</h3>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={configFiscal.incluiIVA} onChange={(e) => setConfigFiscal({...configFiscal, incluiIVA: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /><span className="text-gray-300">Incluir IVA</span></label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={configFiscal.incluiRetencao} onChange={(e) => setConfigFiscal({...configFiscal, incluiRetencao: e.target.checked})} className="w-4 h-4 text-yellow-600 rounded" /><span className="text-gray-300">Incluir Retenção na Fonte</span></label>
                          </div>
                          {configFiscal.incluiIVA && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={configFiscal.taxaIVA} onChange={(e) => setConfigFiscal({...configFiscal, taxaIVA: parseFloat(e.target.value)})}><option value="14">14% - Normal</option><option value="7">7% - Reduzida</option><option value="0">0% - Isento</option></select></div>)}
                          {configFiscal.incluiRetencao && (<div className="mt-3"><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={configFiscal.taxaRetencao} onChange={(e) => setConfigFiscal({...configFiscal, taxaRetencao: parseFloat(e.target.value)})}><option value="6.5">6.5% - IRT</option><option value="7">7% - IRS</option><option value="10">10% - IRC</option><option value="15">15% - Serviços</option></select></div>)}
                        </div>

                        {/* Pagamento */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Pagamento</h3>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.formaPagamento} onChange={(e) => setFormVenda({...formVenda, formaPagamento: e.target.value})}><option value="Dinheiro">💰 Dinheiro</option><option value="Transferência Bancária">🏦 Transferência Bancária</option><option value="Cartão Crédito">💳 Cartão Crédito</option><option value="Cartão Débito">💳 Cartão Débito</option><option value="Cheque">📝 Cheque</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Factura</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.tipoFactura} onChange={(e) => setFormVenda({...formVenda, tipoFactura: e.target.value})}><option value="Venda">Venda de Produtos</option><option value="Prestação de Serviço">Prestação de Serviço</option></select></div>
                          </div>
                          {formVenda.formaPagamento !== "Dinheiro" && (<div className="mb-3"><label className="block text-sm font-medium text-gray-300 mb-2">Conta Bancária para Depósito</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.contaBancaria} onChange={(e) => setFormVenda({...formVenda, contaBancaria: e.target.value})}><option value="">Selecione uma conta</option>{contasBancarias.map(conta => (<option key={conta._id} value={conta.codNome}>{conta.nome} - {conta.codNome}</option>))}</select></div>)}
                          <div><label className="block text-sm font-medium text-gray-300 mb-2">Desconto (Kz)</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" placeholder="0" value={formVenda.desconto} onChange={handleDescontoChange} /></div>
                        </div>
                      </div>

                      {/* Coluna Direita */}
                      <div className="space-y-4">
                        {/* Busca por Código */}
                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
                          <div className="flex gap-2"><div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-2">Código de Barras</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono" placeholder="Digite ou escaneie..." value={codigoBarrasInput} onChange={(e) => setCodigoBarrasInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && buscarProdutoPorCodigo()} /></div><button onClick={buscarProdutoPorCodigo} className="mt-7 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition"><Barcode size={18} /></button></div>
                          <p className="text-xs text-gray-400 mt-2">📦 Use leitor USB ou digite manualmente. Pressione ENTER para buscar.</p>
                        </div>

                        {/* Produtos */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-4"><h3 className="text-md font-semibold text-blue-400 flex items-center gap-2"><Package className="w-4 h-4" /> Produtos em Stock</h3><button onClick={() => setShowFiltros(!showFiltros)} className="flex items-center gap-1 px-2 py-1 bg-gray-600 rounded-lg text-sm"><Filter size={14} /> Filtros</button></div>
                          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><input type="text" className="w-full pl-9 p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm" placeholder="Buscar produto..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} /></div>
                          {showFiltros && (<div className="mb-3 p-3 bg-gray-700/30 rounded-lg"><select className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}><option value="">Todas Categorias</option>{categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>)}
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {produtosFiltrados.length === 0 ? <p className="text-gray-400 text-center py-4">Nenhum produto encontrado</p> : produtosFiltrados.map(p => (<div key={p._id} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-gray-700 transition"><div className="flex-1"><p className="font-medium text-white">{p.produto}</p><div className="flex gap-3 text-xs"><span className="text-green-400">{p.precoVenda?.toLocaleString()} Kz</span><span className="text-gray-400">Estoque: {p.quantidade}</span>{p.codigoBarras && <span className="text-gray-500 font-mono">📷 {p.codigoBarras}</span>}</div></div><button onClick={() => adicionarAoCarrinho(p)} className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition" disabled={p.quantidade <= 0}><Plus size={16} /></button></div>))}
                          </div>
                        </div>

                        {/* Carrinho */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-yellow-400 mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Carrinho ({carrinho.length} itens)</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {carrinho.map(item => (<div key={item._id} className="bg-gray-700/50 rounded-lg p-3"><div className="flex justify-between items-start"><div className="flex-1"><p className="font-medium text-white">{item.produtoOuServico}</p><p className="text-xs text-gray-400">{item.precoUnitario?.toLocaleString()} Kz/un</p></div><button onClick={() => removerDoCarrinho(item._id)} className="text-red-400"><Trash2 size={16} /></button></div><div className="flex justify-between items-center mt-2"><div className="flex items-center gap-2"><button onClick={() => atualizarQuantidade(item._id, item.quantidade - 1)} className="p-1 bg-gray-600 rounded"><Minus size={14} /></button><input type="number" min="1" className="w-16 p-1 rounded bg-gray-600 text-white text-center" value={item.quantidade} onChange={(e) => atualizarQuantidade(item._id, parseInt(e.target.value) || 0)} /><button onClick={() => atualizarQuantidade(item._id, item.quantidade + 1)} className="p-1 bg-gray-600 rounded"><Plus size={14} /></button></div><p className="text-white font-medium">{item.total.toLocaleString()} Kz</p></div></div>))}
                            {carrinho.length === 0 && <p className="text-gray-400 text-center py-4">Carrinho vazio</p>}
                          </div>

                          {carrinho.length > 0 && (<div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                            <div className="flex justify-between text-gray-300"><span>Subtotal:</span><span>{formatarMoeda(subtotal)} Kz</span></div>
                            {configFiscal.incluiIVA && (<div className="flex justify-between text-gray-300"><span>IVA ({configFiscal.taxaIVA}%):</span><span>{formatarMoeda(totalIVA)} Kz</span></div>)}
                            {configFiscal.incluiRetencao && (<div className="flex justify-between text-red-400"><span>Retenção ({configFiscal.taxaRetencao}%):</span><span>- {formatarMoeda(totalRetencao)} Kz</span></div>)}
                            {descontoNumerico > 0 && (<div className="flex justify-between text-red-400"><span>Desconto:</span><span>- {formatarMoeda(descontoNumerico)} Kz</span></div>)}
                            <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-600"><span>TOTAL:</span><span className="text-green-400">{formatarMoeda(totalFinal)} Kz</span></div>
                          </div>)}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 mt-4 border-t border-gray-700">
                      <button onClick={finalizarVenda} disabled={emitindo || carrinho.length === 0} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">{emitindo ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}{emitindo ? "Processando..." : "Finalizar Venda"}</button>
                      <button onClick={() => { setModalOpen(false); resetFormVenda(); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Detalhes */}
            {modalDetalhes && vendaSelecionada && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white" size={20} /></div><h2 className="text-xl font-bold text-white">Detalhes da Venda</h2></div>
                      <button onClick={() => setModalDetalhes(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 mb-6">
                      <div className="flex justify-between items-start">
                        <div><p className="text-gray-400 text-sm">Factura Nº</p><p className="text-2xl font-bold text-white">FT {vendaSelecionada.numeroFactura}</p></div>
                        <div className="text-right"><p className="text-gray-400 text-sm">Data de Emissão</p><p className="text-white">{new Date(vendaSelecionada.data).toLocaleString('pt-PT')}</p></div>
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
                      <h3 className="text-md font-semibold text-blue-400 mb-3">Dados do Cliente</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-gray-400">Nome</p><p className="text-white">{vendaSelecionada.cliente}</p></div>
                        <div><p className="text-xs text-gray-400">NIF</p><p className="text-white">{vendaSelecionada.nifCliente}</p></div>
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
                      <h3 className="text-md font-semibold text-yellow-400 mb-3">Itens da Venda</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr className="text-white">
                              <th className="p-2 text-left">Produto</th>
                              <th className="p-2 text-center">Qtd</th>
                              <th className="p-2 text-right">Preço Unit.</th>
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendaSelecionada.itens?.map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-600">
                                <td className="p-2 text-white">{item.produtoOuServico}</td>
                                <td className="p-2 text-center text-gray-300">{item.quantidade}</td>
                                <td className="p-2 text-right text-gray-300">{item.precoUnitario?.toLocaleString()} Kz</td>
                                <td className="p-2 text-right text-white">{item.total?.toLocaleString()} Kz</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-gray-600">
                            <tr>
                              <td colSpan="3" className="p-2 text-right text-gray-300">Subtotal:</td>
                              <td className="p-2 text-right text-white">{vendaSelecionada.subtotal?.toLocaleString()} Kz</td>
                            </tr>
                            {vendaSelecionada.desconto > 0 && (
                              <tr>
                                <td colSpan="3" className="p-2 text-right text-red-400">Desconto:</td>
                                <td className="p-2 text-right text-red-400">- {vendaSelecionada.desconto?.toLocaleString()} Kz</td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan="3" className="p-2 text-right text-gray-300">IVA ({vendaSelecionada.taxaIVA || 14}%):</td>
                              <td className="p-2 text-right text-white">{vendaSelecionada.totalIva?.toLocaleString()} Kz</td>
                            </tr>
                            {vendaSelecionada.totalRetencao > 0 && (
                              <tr>
                                <td colSpan="3" className="p-2 text-right text-red-400">Retenção ({vendaSelecionada.taxaRetencao || 0}%):</td>
                                <td className="p-2 text-right text-red-400">- {vendaSelecionada.totalRetencao?.toLocaleString()} Kz</td>
                              </tr>
                            )}
                            <tr className="border-t-2 border-gray-600">
                              <td colSpan="3" className="p-2 text-right text-white font-bold">TOTAL:</td>
                              <td className="p-2 text-right text-green-400 font-bold">{vendaSelecionada.total?.toLocaleString()} Kz</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-4">
                      <h3 className="text-md font-semibold text-green-400 mb-3">Pagamento</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-gray-400">Forma</p><p className="text-white">{vendaSelecionada.formaPagamento}</p></div>
                        <div><p className="text-xs text-gray-400">Status</p><p className="text-green-400">{vendaSelecionada.status}</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Vendas;