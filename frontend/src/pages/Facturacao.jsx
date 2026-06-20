// src/pages/Facturacao.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  FileText, Printer, Eye, Search, Plus, 
  X, CheckCircle, AlertCircle, Loader2, 
  Building2, RefreshCw, User,
  Calendar, FileSignature, Receipt, FileSpreadsheet,
  FileWarning, ChevronLeft, ChevronRight,
  Package, Trash2, Minus, Filter, Percent, ShoppingCart,
  CreditCard, DollarSign, Phone, Mail, MapPin, Wrench, Briefcase
} from "lucide-react";
import { gerarDocumentoProfissional } from "../services/documentoService";

const Facturacao = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [servicosFiltrados, setServicosFiltrados] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [busca, setBusca] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipoDocumento, setFiltroTipoDocumento] = useState("");
  const [filtroTipoItem, setFiltroTipoItem] = useState("todos"); // NOVO: todos, produtos, servicos
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [searchCliente, setSearchCliente] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [emitindo, setEmitindo] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState("Factura Proforma");
  const [modalPagamento, setModalPagamento] = useState(false);
  const [facturaParaPagamento, setFacturaParaPagamento] = useState(null);
  const [valorPago, setValorPago] = useState("");
  const [formaPagamentoRecibo, setFormaPagamentoRecibo] = useState("Dinheiro");
  const [recarregar, setRecarregar] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState(false);
  
  // NOVO: Estado para agendamento de serviços
  const [showServicoForm, setShowServicoForm] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [servicoAgendamento, setServicoAgendamento] = useState({
    dataInicio: "",
    dataFim: "",
    duracaoEstimada: "",
    enderecoServico: "",
    observacoes: "",
    tecnicoResponsavel: ""
  });
  
  const [configFiscal, setConfigFiscal] = useState({
    incluiIVA: true,
    taxaIVA: 14,
    incluiRetencao: false,
    taxaRetencao: 7
  });
  
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome, empresaNif: userEmpresaNif } = useAuth();

  const tiposDocumento = [
    { value: "Orcamento", label: "📄 Orçamento", icon: FileText, cor: "blue", endpoint: "/orcamento" },
    { value: "Factura Proforma", label: "📋 Factura Proforma", icon: FileSpreadsheet, cor: "purple", endpoint: "/proforma" }
  ];

  const [formDocumento, setFormDocumento] = useState({
    cliente: "",
    clienteId: "",
    nifCliente: "",
    emailCliente: "",
    telefoneCliente: "",
    enderecoCliente: "",
    tipoActividade: "Venda",
    formaPagamento: "Dinheiro",
    contaBancaria: "",
    desconto: 0,
    observacoes: "",
    dataVencimento: "",
    valorPago: 0,
    motivo: ""
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

  const abrirModalPagamento = (factura) => {
    setFacturaParaPagamento(factura);
    setValorPago(Math.abs(factura.total || 0).toString());
    setFormaPagamentoRecibo("Dinheiro");
    setModalPagamento(true);
  };

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarDocumentos();
      carregarClientes();
      carregarProdutos();
      carregarContasBancarias();
      carregarConfigFiscal();
    } else {
      setDocumentos([]);
      setClientes([]);
      setProdutos([]);
      setProdutosFiltrados([]);
      setServicosFiltrados([]);
      setContasBancarias([]);
    }
  }, [empresaSelecionada, filtroTipoDocumento, paginaAtual]);

  useEffect(() => {
    if (empresaSelecionada && recarregar) {
      carregarDocumentos();
      setRecarregar(false);
    }
  }, [empresaSelecionada, recarregar]);

  // 🔧 CORREÇÃO: Filtrar produtos e serviços separadamente
  useEffect(() => {
    if (!produtos.length) return;
    
    // Filtrar produtos (com estoque)
    let produtosFiltradosList = produtos.filter(p => p.tipo === 'produto' && p.quantidade > 0);
    // Filtrar serviços (sempre disponíveis)
    let servicosFiltradosList = produtos.filter(p => p.tipo === 'servico');
    
    if (buscaProduto) {
      produtosFiltradosList = produtosFiltradosList.filter(p => 
        p.produto?.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(buscaProduto.toLowerCase()))
      );
      servicosFiltradosList = servicosFiltradosList.filter(p => 
        p.produto?.toLowerCase().includes(buscaProduto.toLowerCase())
      );
    }
    
    if (filtroCategoria) {
      produtosFiltradosList = produtosFiltradosList.filter(p => p.categoria === filtroCategoria);
      servicosFiltradosList = servicosFiltradosList.filter(p => p.categoria === filtroCategoria);
    }
    
    setProdutosFiltrados(produtosFiltradosList);
    setServicosFiltrados(servicosFiltradosList);
  }, [buscaProduto, filtroCategoria, produtos]);

  useEffect(() => {
    if (vendaFinalizada) {
      const timer = setTimeout(() => setVendaFinalizada(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [vendaFinalizada]);

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

  const carregarConfigFiscal = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/config-fiscal/${empresaSelecionada}`, {
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
      }
    } catch (error) {
      console.error("Erro ao carregar config fiscal:", error);
    }
  };

  const carregarDocumentos = async () => {
    if (!empresaSelecionada) {
      setDocumentos([]);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `https://sirexa-api.onrender.com/api/facturas/listar?empresaId=${empresaSelecionada}&page=${paginaAtual}&limit=20${filtroTipoDocumento ? `&tipo=${filtroTipoDocumento}` : ''}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setDocumentos([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.sucesso) {
        setDocumentos(data.dados || []);
        setTotalPaginas(data.totalPaginas || 1);
      } else {
        setDocumentos([]);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar documentos:", error);
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/clientes/${empresaSelecionada}?limit=100`, {
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
      const response = await fetch(`https://sirexa-api.onrender.com/api/stock?empresaId=${empresaSelecionada}&ativo=true`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setProdutos([]);
        setProdutosFiltrados([]);
        setServicosFiltrados([]);
        return;
      }
      
      const data = await response.json();
      const produtosData = Array.isArray(data) ? data : (data.dados || []);
      setProdutos(produtosData);
      
      // Separar produtos e serviços
      setProdutosFiltrados(produtosData.filter(p => p.tipo === 'produto' && p.quantidade > 0));
      setServicosFiltrados(produtosData.filter(p => p.tipo === 'servico'));
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const carregarContasBancarias = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/bancos?empresaId=${empresaSelecionada}`, {
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

  const handleClienteSelect = (cliente) => {
    setFormDocumento({
      ...formDocumento,
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
    (c.nif && c.nif.includes(searchCliente))
  );

  const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];

  // 🔧 FUNÇÃO PARA ADICIONAR SERVIÇO COM AGENDAMENTO
  const adicionarServicoComAgendamento = () => {
    if (!servicoSelecionado) return;
    if (!servicoAgendamento.dataInicio) {
      mostrarMensagem("Informe a data de início do serviço", "erro");
      return;
    }
    
    const itemExistente = carrinho.find(item => item._id === servicoSelecionado._id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item._id === servicoSelecionado._id ? { 
          ...item, 
          quantidade: item.quantidade + 1,
          total: item.precoUnitario * (item.quantidade + 1),
          agendamento: { ...servicoAgendamento }
        } : item
      ));
    } else {
      setCarrinho([...carrinho, { 
        ...servicoSelecionado, 
        quantidade: 1,
        produtoId: servicoSelecionado._id,
        produtoOuServico: servicoSelecionado.produto,
        precoUnitario: servicoSelecionado.precoVenda,
        total: servicoSelecionado.precoVenda,
        taxaIVA: servicoSelecionado.taxaIVA || configFiscal.taxaIVA,
        tipo: 'servico',
        agendamento: { ...servicoAgendamento }
      }]);
    }
    
    setShowServicoForm(false);
    setServicoSelecionado(null);
    setServicoAgendamento({
      dataInicio: "",
      dataFim: "",
      duracaoEstimada: "",
      enderecoServico: "",
      observacoes: "",
      tecnicoResponsavel: ""
    });
    mostrarMensagem(`Serviço "${servicoSelecionado.produto}" agendado com sucesso!`, "sucesso");
  };

  const adicionarAoCarrinho = (item) => {
    // Verificar se é serviço
    if (item.tipo === 'servico') {
      setServicoSelecionado(item);
      setShowServicoForm(true);
      return;
    }
    
    // Para produtos, verificar estoque
    if (item.quantidade <= 0) {
      mostrarMensagem(`Produto "${item.produto}" sem estoque`, "erro");
      return;
    }
    
    const itemExistente = carrinho.find(cartItem => cartItem._id === item._id);
    if (itemExistente) {
      if (itemExistente.quantidade + 1 > item.quantidade) {
        mostrarMensagem(`Estoque insuficiente para "${item.produto}"`, "erro");
        return;
      }
      setCarrinho(carrinho.map(cartItem =>
        cartItem._id === item._id ? { 
          ...cartItem, 
          quantidade: cartItem.quantidade + 1, 
          total: cartItem.precoUnitario * (cartItem.quantidade + 1) 
        } : cartItem
      ));
    } else {
      setCarrinho([...carrinho, { 
        ...item, 
        quantidade: 1,
        produtoId: item._id,
        produtoOuServico: item.produto,
        precoUnitario: item.precoVenda,
        total: item.precoVenda,
        taxaIVA: item.taxaIVA || configFiscal.taxaIVA,
        codigoBarras: item.codigoBarras,
        tipo: item.tipo || 'produto'
      }]);
    }
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(carrinho.filter(item => item._id !== id));
  };

  const atualizarQuantidade = (id, quantidade) => {
    const itemOriginal = produtos.find(p => p._id === id);
    if (quantidade <= 0) {
      removerDoCarrinho(id);
    } else if (itemOriginal && itemOriginal.tipo !== 'servico' && quantidade > itemOriginal.quantidade) {
      mostrarMensagem(`Estoque insuficiente. Disponível: ${itemOriginal.quantidade}`, "erro");
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
    const subtotal = calcularSubtotal();
    const desconto = converterParaNumero(formDocumento.desconto);
    const subtotalComDesconto = subtotal - desconto;
    return subtotalComDesconto * (configFiscal.taxaIVA / 100);
  };

  const calcularTotalRetencao = () => {
    if (!configFiscal.incluiRetencao) return 0;
    const subtotal = calcularSubtotal();
    const desconto = converterParaNumero(formDocumento.desconto);
    const subtotalComDesconto = subtotal - desconto;
    return subtotalComDesconto * (configFiscal.taxaRetencao / 100);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const desconto = converterParaNumero(formDocumento.desconto);
    const subtotalComDesconto = subtotal - desconto;
    const iva = calcularTotalIVA();
    const retencao = calcularTotalRetencao();
    return subtotalComDesconto + iva - retencao;
  };

  const handleDescontoChange = (e) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    setFormDocumento({...formDocumento, desconto: valorFormatado});
  };

  const emitirDocumento = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }

    if (carrinho.length === 0) {
      mostrarMensagem("Adicione itens ao carrinho", "erro");
      return;
    }

    if (!formDocumento.cliente || formDocumento.cliente.trim() === "") {
      mostrarMensagem("Informe o nome do cliente", "erro");
      return;
    }

    // Validar conta bancária se pagamento não for dinheiro
    if (formDocumento.formaPagamento !== "Dinheiro" && !formDocumento.contaBancaria) {
      mostrarMensagem("Selecione a conta bancária para depósito", "erro");
      return;
    }

    setEmitindo(true);

    const descontoNumerico = converterParaNumero(formDocumento.desconto);
    const subtotal = calcularSubtotal();
    const totalIVA = calcularTotalIVA();
    const totalRetencao = calcularTotalRetencao();
    const totalFinal = calcularTotal();

    let empresaAtual;
    let empresaNifValue;
    
    if (isTecnico()) {
      empresaNifValue = userEmpresaNif;
      empresaAtual = { nif: empresaNifValue, nome: userEmpresaNome };
    } else {
      empresaAtual = empresas.find(e => e._id === empresaSelecionada);
      empresaNifValue = empresaAtual?.nif;
    }
    
    const dadosEnvio = {
      dados: {
        cliente: formDocumento.cliente,
        clienteId: formDocumento.clienteId,
        nifCliente: formDocumento.nifCliente || "999999999",
        emailCliente: formDocumento.emailCliente,
        telefoneCliente: formDocumento.telefoneCliente,
        enderecoCliente: formDocumento.enderecoCliente,
        tipoActividade: formDocumento.tipoActividade,
        formaPagamento: formDocumento.formaPagamento,
        contaBancaria: formDocumento.contaBancaria,
        itens: carrinho.map(item => ({
          produtoId: item.produtoId,
          produtoOuServico: item.produtoOuServico,
          codigoBarras: item.codigoBarras,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          total: item.total,
          taxaIVA: configFiscal.taxaIVA,
          tipo: item.tipo || 'produto',
          ...(item.agendamento && { agendamento: item.agendamento })
        })),
        desconto: descontoNumerico,
        retencao: totalRetencao,
        taxaRetencao: configFiscal.taxaRetencao,
        incluiIVA: configFiscal.incluiIVA,
        incluiRetencao: configFiscal.incluiRetencao,
        observacoes: formDocumento.observacoes,
        dataVencimento: formDocumento.dataVencimento || null
      },
      empresaNif: empresaNifValue
    };

    try {
      const token = localStorage.getItem("token");
      const tipoInfo = tiposDocumento.find(t => t.value === tipoDocumento);
      const endpoint = tipoInfo?.endpoint || "/proforma";
      
      const response = await fetch(`https://sirexa-api.onrender.com/api/facturas${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok && result.sucesso) {
        mostrarMensagem(result.mensagem || `${tipoDocumento} emitido com sucesso!`, "sucesso");
        
        await carregarDocumentos();
        
        if (result.dados) {
          await gerarDocumentoProfissional(result.dados, user, empresaAtual, contasBancarias);
        }
        
        setModalOpen(false);
        setCarrinho([]);
        resetForm();
        setRecarregar(true);
        setVendaFinalizada(true);
        
      } else {
        mostrarMensagem(result.mensagem || "Erro ao emitir documento", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setEmitindo(false);
    }
  };

  const gerarRecibo = async () => {
    if (!facturaParaPagamento) return;
    
    const valorPagoNumerico = parseFloat(valorPago.replace(/\D/g, "")) || 0;
    const totalFactura = Math.abs(facturaParaPagamento.total || 0);
    
    if (valorPagoNumerico <= 0) {
      mostrarMensagem("Informe um valor válido", "erro");
      return;
    }
    
    if (valorPagoNumerico > totalFactura) {
      mostrarMensagem(`Valor pago não pode ser maior que o total da factura (${totalFactura.toLocaleString()} Kz)`, "erro");
      return;
    }

    setEmitindo(true);

    try {
      const token = localStorage.getItem("token");
      let empresaAtual;
      
      if (isTecnico()) {
        empresaAtual = { nome: userEmpresaNome, nif: userEmpresaNif };
      } else {
        empresaAtual = empresas.find(e => e._id === empresaSelecionada);
      }
      
      const response = await fetch(`https://sirexa-api.onrender.com/api/facturas/recibo/${facturaParaPagamento._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          dados: {
            formaPagamento: formaPagamentoRecibo,
            dataPagamento: new Date().toISOString(),
            valorPago: valorPagoNumerico,
            troco: valorPagoNumerico - totalFactura,
            contaBancaria: facturaParaPagamento.contaBancaria || ""
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.sucesso) {
        mostrarMensagem("Recibo gerado com sucesso!", "sucesso");
        setModalPagamento(false);
        setFacturaParaPagamento(null);
        await carregarDocumentos();
        
        if (result.dados) {
          await gerarDocumentoProfissional(result.dados, user, empresaAtual, contasBancarias);
        }
      } else {
        mostrarMensagem(result.mensagem || "Erro ao gerar recibo", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setEmitindo(false);
    }
  };

  const gerarNotaCredito = async (facturaId, motivo) => {
    setEmitindo(true);
    
    try {
      const token = localStorage.getItem("token");
      let empresaAtual;
      
      if (isTecnico()) {
        empresaAtual = { nome: userEmpresaNome, nif: userEmpresaNif };
      } else {
        empresaAtual = empresas.find(e => e._id === empresaSelecionada);
      }
      
      const response = await fetch(`https://sirexa-api.onrender.com/api/facturas/nota-credito/${facturaId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          motivo: motivo || "Devolução de mercadoria",
          observacoes: `Nota de crédito referente à factura`
        })
      });

      const result = await response.json();
      if (response.ok && result.sucesso) {
        mostrarMensagem("Nota de Crédito gerada com sucesso!", "sucesso");
        await carregarDocumentos();
        if (result.dados) {
          await gerarDocumentoProfissional(result.dados, user, empresaAtual, contasBancarias);
        }
      } else {
        mostrarMensagem(result.mensagem || "Erro ao gerar nota de crédito", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setEmitindo(false);
    }
  };

  const resetForm = () => {
    setFormDocumento({
      cliente: "",
      clienteId: "",
      nifCliente: "",
      emailCliente: "",
      telefoneCliente: "",
      enderecoCliente: "",
      tipoActividade: "Venda",
      formaPagamento: "Dinheiro",
      contaBancaria: "",
      desconto: 0,
      observacoes: "",
      dataVencimento: "",
      valorPago: 0,
      motivo: ""
    });
    setSearchCliente("");
    setCarrinho([]);
    setBuscaProduto("");
    setFiltroCategoria("");
    setFiltroTipoItem("todos");
    setTipoDocumento("Factura Proforma");
    setConfigFiscal({
      incluiIVA: true,
      taxaIVA: 14,
      incluiRetencao: false,
      taxaRetencao: 7
    });
  };

  const verDetalhes = (doc) => {
    setDocumentoSelecionado(doc);
    setModalDetalhes(true);
  };

  const imprimirDocumento = async (doc) => {
    let empresaAtual;
    if (isTecnico()) {
      empresaAtual = { nome: userEmpresaNome, nif: userEmpresaNif };
    } else {
      empresaAtual = empresas.find(e => e._id === empresaSelecionada);
    }
    await gerarDocumentoProfissional(doc, user, empresaAtual, contasBancarias);
  };

  const exportarSAFT = async () => {
    if (!empresaSelecionada && !userEmpresaNif) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }
    
    const empresaNifValue = isTecnico() ? userEmpresaNif : empresas.find(e => e._id === empresaSelecionada)?.nif;
    if (!empresaNifValue) {
      mostrarMensagem("NIF da empresa não encontrado", "erro");
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/vendas/exportar-saft/${empresaNifValue}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        mostrarMensagem(`Erro ao exportar SAF-T: ${errorText}`, "erro");
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saft_${empresaNifValue}_${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      mostrarMensagem("✅ SAF-T exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao exportar SAF-T:", error);
      mostrarMensagem("Erro ao exportar SAF-T", "erro");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const cores = {
      "emitido": "bg-green-600/20 text-green-400",
      "emitida": "bg-green-600/20 text-green-400",
      "pago": "bg-blue-600/20 text-blue-400",
      "cancelado": "bg-red-600/20 text-red-400",
      "convertido": "bg-yellow-600/20 text-yellow-400",
      "rascunho": "bg-gray-600/20 text-gray-400"
    };
    return cores[status] || "bg-gray-600/20 text-gray-400";
  };

  const getNumeroDocumento = (doc) => {
    if (!doc) return "---";
    if (doc.tipo === "Factura") return `FT ${doc.numeroFactura || "---"}`;
    if (doc.tipo === "Factura Proforma") return `FP ${doc.numeroFactura || doc.numeroDocumento || "---"}`;
    if (doc.tipo === "Orcamento") return `ORC ${doc.numeroDocumento || "---"}`;
    if (doc.tipo === "Recibo") return `RC ${doc.numeroFactura || doc.numeroDocumento || "---"}`;
    if (doc.tipo === "Nota Credito") return `NC ${doc.numeroFactura || doc.numeroDocumento || "---"}`;
    return `${doc.tipo} ${doc.numeroDocumento || doc.numeroFactura || "---"}`;
  };

  const getTipoIcon = (tipo) => {
    const tipoInfo = tiposDocumento.find(t => t.value === tipo);
    if (tipoInfo) {
      const Icon = tipoInfo.icon;
      return <Icon size={18} className="text-gray-400" />;
    }
    if (tipo === "Recibo") return <Receipt size={18} className="text-yellow-400" />;
    if (tipo === "Nota Credito") return <FileWarning size={18} className="text-red-400" />;
    return <FileText size={18} className="text-gray-400" />;
  };

  const documentosFiltrados = documentos.filter(d =>
    d.cliente?.toLowerCase().includes(busca.toLowerCase()) ||
    String(d.numeroFactura || d.numeroDocumento || '').includes(busca)
  );

  const empresaAtual = isTecnico() 
    ? { nome: userEmpresaNome, nif: userEmpresaNif }
    : empresas.find(e => e._id === empresaSelecionada);
    
  const subtotal = calcularSubtotal();
  const totalIVA = calcularTotalIVA();
  const totalRetencao = calcularTotalRetencao();
  const descontoNumerico = converterParaNumero(formDocumento.desconto);
  const subtotalComDesconto = subtotal - descontoNumerico;
  const totalFinal = calcularTotal();

  if (loadingEmpresas) {
    return (
      <Layout title="Facturação" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
            <p className="text-gray-400">Carregando empresas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Facturação" showBackButton={true} backToRoute="/menu">
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

      {vendaFinalizada && (
        <div className="fixed bottom-20 right-4 z-50 animate-fade-in-out">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <CheckCircle size={20} /> Documento emitido com sucesso!
          </div>
        </div>
      )}

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarDocumentos(); }}
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
            {/* Barra de pesquisa e botão Novo */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Pesquisar por cliente, número..." className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <select className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white" value={filtroTipoDocumento} onChange={(e) => setFiltroTipoDocumento(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  <option value="Orcamento">Orçamento</option>
                  <option value="Factura Proforma">Factura Proforma</option>
                  <option value="Recibo">Recibo</option>
                  <option value="Nota Credito">Nota de Crédito</option>
                </select>
                <button onClick={exportarSAFT} disabled={loading} className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg">
                  <FileText size={18} /> SAF-T
                </button>
                <button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg">
                  <Plus size={18} /> Novo Documento
                </button>
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-blue-300 text-sm">Total Documentos</p><p className="text-3xl font-bold text-white">{documentos.length}</p></div>
                  <div className="bg-blue-600/30 p-3 rounded-full"><FileText className="text-blue-400" size={28} /></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-5 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-green-300 text-sm">Valor Total</p><p className="text-xl font-bold text-green-400">{documentos.reduce((acc, d) => acc + (d.total || 0), 0).toLocaleString()} Kz</p></div>
                  <div className="bg-green-600/30 p-3 rounded-full"><DollarSign className="text-green-400" size={28} /></div>
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
                  <div><p className="text-purple-300 text-sm">Ticket Médio</p><p className="text-2xl font-bold text-purple-400">{documentos.length > 0 ? Math.round(documentos.reduce((acc, d) => acc + (d.total || 0), 0) / documentos.length).toLocaleString() : 0} Kz</p></div>
                  <div className="bg-purple-600/30 p-3 rounded-full"><Receipt className="text-purple-400" size={28} /></div>
                </div>
              </div>
            </div>

            {/* Informação importante */}
            <div className="bg-blue-600/10 rounded-xl p-4 border border-blue-500/30">
              <p className="text-blue-400 text-sm flex items-center gap-2 flex-wrap">
                <FileSignature size={16} />
                📌 As <strong>Facturas</strong> são geradas automaticamente pelo módulo de <strong>VENDAS</strong>. 
                Este módulo é para documentos complementares: <strong>Orçamentos, Proformas, Recibos e Notas de Crédito</strong>.
              </p>
            </div>

            {/* Lista de Documentos */}
            {loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto mb-4 text-blue-400" size={40} /><p className="text-gray-400">Carregando documentos...</p></div>
            ) : documentosFiltrados.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum documento encontrado</p>
                <button onClick={() => { resetForm(); setModalOpen(true); }} className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition">Criar Primeiro Documento</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentosFiltrados.map(doc => (
                  <div key={doc._id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {getNumeroDocumento(doc)}
                        </h3>
                        <p className="text-sm text-gray-400">{new Date(doc.dataEmissao).toLocaleDateString('pt-PT')}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs ${getStatusColor(doc.status)}`}>{doc.status}</span>
                    </div>
                    <p className="text-white"><span className="text-gray-400">Cliente:</span> {doc.cliente}</p>
                    <p className="text-green-400 font-bold mt-2">{Math.abs(doc.total || 0).toLocaleString()} Kz</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => verDetalhes(doc)} className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 py-2 rounded-lg transition flex items-center justify-center gap-2">
                        <Eye size={16} /> Ver
                      </button>
                      <button onClick={() => imprimirDocumento(doc)} className="flex-1 bg-purple-600/20 hover:bg-purple-600/40 py-2 rounded-lg transition flex items-center justify-center gap-2">
                        <Printer size={16} /> Imprimir
                      </button>
                      {doc.tipo === "Factura" && doc.status !== "pago" && (
                        <button onClick={() => abrirModalPagamento(doc)} className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/40 py-2 rounded-lg transition flex items-center justify-center gap-2">
                          <Receipt size={16} /> Recibo
                        </button>
                      )}
                      {doc.tipo === "Factura" && doc.status !== "estornado" && (
                        <button onClick={() => gerarNotaCredito(doc._id, "Devolução")} className="flex-1 bg-red-600/20 hover:bg-red-600/40 py-2 rounded-lg transition flex items-center justify-center gap-2">
                          <FileWarning size={16} /> NC
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPaginas > 1 && (
              <div className="flex justify-center items-center gap-2 p-4">
                <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="p-2 bg-gray-700 rounded-lg disabled:opacity-50"><ChevronLeft size={18} /></button>
                <span className="text-gray-400">Página {paginaAtual} de {totalPaginas}</span>
                <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="p-2 bg-gray-700 rounded-lg disabled:opacity-50"><ChevronRight size={18} /></button>
              </div>
            )}

            {/* MODAL DE NOVO DOCUMENTO - COM FILTRO DE PRODUTOS/SERVIÇOS */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-600 p-2 rounded-lg"><FileText className="text-white" size={20} /></div>
                        <h2 className="text-xl font-bold text-white">Novo Documento</h2>
                      </div>
                      <button onClick={() => { setModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna Esquerda - Dados do Documento */}
                      <div className="space-y-4">
                        <div className="bg-blue-600/10 rounded-xl p-3 border border-blue-500/30">
                          <p className="text-blue-400 text-sm">Empresa: {empresaAtual?.nome}</p>
                          <p className="text-gray-400 text-xs">NIF: {empresaAtual?.nif}</p>
                        </div>

                        {/* Tipo de Documento */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><FileSignature className="w-4 h-4" /> Tipo de Documento</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {tiposDocumento.map(tipo => {
                              const Icon = tipo.icon;
                              return (
                                <button
                                  key={tipo.value}
                                  onClick={() => { setTipoDocumento(tipo.value); setCarrinho([]); }}
                                  className={`p-3 rounded-xl transition-all flex items-center gap-2 justify-center ${
                                    tipoDocumento === tipo.value 
                                      ? `bg-${tipo.cor}-600/30 border border-${tipo.cor}-500 text-${tipo.cor}-400`
                                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                  }`}
                                >
                                  <Icon size={16} />
                                  <span className="text-sm">{tipo.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cliente */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Dados do Cliente</h3>
                          <div className="relative mb-3">
                            <input 
                              type="text" 
                              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                              placeholder="Digite o nome do cliente..." 
                              value={searchCliente} 
                              onChange={(e) => { 
                                setSearchCliente(e.target.value); 
                                setShowClienteDropdown(true);
                                setFormDocumento(prev => ({ ...prev, cliente: e.target.value }));
                              }} 
                              onFocus={() => setShowClienteDropdown(true)} 
                            />
                            {showClienteDropdown && clientesFiltrados.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-xl border border-gray-600 max-h-60 overflow-auto">
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
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">NIF</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formDocumento.nifCliente} onChange={(e) => setFormDocumento({...formDocumento, nifCliente: e.target.value})} /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formDocumento.telefoneCliente} onChange={(e) => setFormDocumento({...formDocumento, telefoneCliente: e.target.value})} /></div>
                            <div className="col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Email</label><input type="email" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formDocumento.emailCliente} onChange={(e) => setFormDocumento({...formDocumento, emailCliente: e.target.value})} /></div>
                          </div>
                        </div>

                        {/* Configuração Fiscal */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Percent className="w-4 h-4" /> Configuração Fiscal</h3>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={configFiscal.incluiIVA} onChange={(e) => setConfigFiscal({...configFiscal, incluiIVA: e.target.checked})} /> Incluir IVA</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={configFiscal.incluiRetencao} onChange={(e) => setConfigFiscal({...configFiscal, incluiRetencao: e.target.checked})} /> Incluir Retenção</label>
                          </div>
                          {configFiscal.incluiIVA && (<div className="mb-3"><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={configFiscal.taxaIVA} onChange={(e) => setConfigFiscal({...configFiscal, taxaIVA: parseFloat(e.target.value)})}><option value="14">14% - Normal</option><option value="7">7% - Reduzida</option><option value="0">0% - Isento</option></select></div>)}
                          {configFiscal.incluiRetencao && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={configFiscal.taxaRetencao} onChange={(e) => setConfigFiscal({...configFiscal, taxaRetencao: parseFloat(e.target.value)})}><option value="6.5">6.5% - IRT</option><option value="7">7% - IRS</option><option value="10">10% - IRC</option><option value="15">15% - Serviços</option></select></div>)}
                        </div>

                        {/* Configurações Gerais */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Configurações</h3>
                          <div className="space-y-3">
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Data Vencimento</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formDocumento.dataVencimento} onChange={(e) => setFormDocumento({...formDocumento, dataVencimento: e.target.value})} /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formDocumento.formaPagamento} onChange={(e) => setFormDocumento({...formDocumento, formaPagamento: e.target.value})}><option value="Dinheiro">💰 Dinheiro</option><option value="Transferência Bancária">🏦 Transferência Bancária</option><option value="Cartão Crédito">💳 Cartão Crédito</option><option value="Cartão Débito">💳 Cartão Débito</option><option value="Cheque">📝 Cheque</option></select></div>
                            {formDocumento.formaPagamento !== "Dinheiro" && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Conta Bancária</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formDocumento.contaBancaria} onChange={(e) => setFormDocumento({...formDocumento, contaBancaria: e.target.value})}><option value="">Selecione uma conta</option>{contasBancarias.map(conta => (<option key={conta._id} value={conta.codNome || conta._id}>{conta.nome} - {conta.codNome}</option>))}</select><p className="text-xs text-gray-400 mt-1">⚠️ O cliente deve depositar o valor nesta conta</p></div>)}
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Desconto (Kz)</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" placeholder="0" value={formDocumento.desconto} onChange={handleDescontoChange} /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Observações</label><textarea rows="3" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" placeholder="Observações adicionais..." value={formDocumento.observacoes} onChange={(e) => setFormDocumento({...formDocumento, observacoes: e.target.value})} /></div>
                          </div>
                        </div>
                      </div>

                      {/* Coluna Direita - Produtos e Serviços com Filtro */}
                      <div className="space-y-4">
                        {/* Filtro de Tipo (Produtos/Serviços) */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-3 border border-blue-500/30">
                          <div className="flex gap-2">
                            <button onClick={() => setFiltroTipoItem("todos")} className={`flex-1 py-2 rounded-lg text-sm transition ${filtroTipoItem === "todos" ? "bg-blue-600 text-white" : "bg-gray-700/50 text-gray-400"}`}>📦 Todos</button>
                            <button onClick={() => setFiltroTipoItem("produtos")} className={`flex-1 py-2 rounded-lg text-sm transition ${filtroTipoItem === "produtos" ? "bg-green-600 text-white" : "bg-gray-700/50 text-gray-400"}`}>📦 Produtos</button>
                            <button onClick={() => setFiltroTipoItem("servicos")} className={`flex-1 py-2 rounded-lg text-sm transition ${filtroTipoItem === "servicos" ? "bg-purple-600 text-white" : "bg-gray-700/50 text-gray-400"}`}>🛠️ Serviços</button>
                          </div>
                        </div>

                        {/* Produtos Disponíveis */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-semibold text-blue-400 flex items-center gap-2">
                              {filtroTipoItem === "servicos" ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                              {filtroTipoItem === "servicos" ? "Serviços Disponíveis" : "Produtos Disponíveis"}
                            </h3>
                            <button onClick={() => setShowFiltros(!showFiltros)} className="flex items-center gap-1 px-2 py-1 bg-gray-600 rounded-lg text-sm"><Filter size={14} /> Filtros</button>
                          </div>
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" className="w-full pl-9 p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm" placeholder={`Buscar ${filtroTipoItem === "servicos" ? "serviço" : "produto"}...`} value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} />
                          </div>
                          {showFiltros && (
                            <div className="mb-3 p-3 bg-gray-700/30 rounded-lg">
                              <select className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                                <option value="">Todas Categorias</option>
                                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>
                          )}
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {filtroTipoItem === "servicos" ? (
                              servicosFiltrados.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">Nenhum serviço encontrado</p>
                              ) : (
                                servicosFiltrados.map(s => (
                                  <div key={s._id} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-gray-700 transition">
                                    <div className="flex-1">
                                      <p className="font-medium text-white flex items-center gap-2">
                                        <Wrench size={14} className="text-purple-400" />
                                        {s.produto}
                                        <span className="text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">Serviço</span>
                                      </p>
                                      <div className="flex gap-3 text-xs">
                                        <span className="text-green-400">{s.precoVenda?.toLocaleString()} Kz</span>
                                        <span className="text-purple-400">🛠️ Prestação de Serviço</span>
                                      </div>
                                    </div>
                                    <button onClick={() => adicionarAoCarrinho(s)} className="bg-purple-600 hover:bg-purple-700 p-2 rounded-lg transition"><Plus size={16} /></button>
                                  </div>
                                ))
                              )
                            ) : (
                              produtosFiltrados.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">Nenhum produto encontrado</p>
                              ) : (
                                produtosFiltrados.map(p => (
                                  <div key={p._id} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-gray-700 transition">
                                    <div className="flex-1">
                                      <p className="font-medium text-white">{p.produto}</p>
                                      <div className="flex gap-3 text-xs">
                                        <span className="text-green-400">{p.precoVenda?.toLocaleString()} Kz</span>
                                        <span className="text-gray-400">Estoque: {p.quantidade}</span>
                                      </div>
                                      {p.codigoBarras && <p className="text-xs text-gray-500 font-mono">📷 {p.codigoBarras}</p>}
                                    </div>
                                    <button onClick={() => adicionarAoCarrinho(p)} className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition"><Plus size={16} /></button>
                                  </div>
                                ))
                              )
                            )}
                          </div>
                        </div>

                        {/* Carrinho com Totais Detalhados */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-yellow-400 mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Carrinho ({carrinho.length} itens)</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {carrinho.map(item => (
                              <div key={item._id} className="bg-gray-700/50 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-white flex items-center gap-2">
                                      {item.produtoOuServico}
                                      {item.tipo === 'servico' && <span className="text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">Serviço</span>}
                                    </p>
                                    <p className="text-xs text-gray-400">{item.precoUnitario?.toLocaleString()} Kz/un</p>
                                    {item.agendamento && (
                                      <div className="text-xs text-purple-400 mt-1">
                                        📅 {new Date(item.agendamento.dataInicio).toLocaleString()}
                                        {item.agendamento.enderecoServico && <span className="ml-2">📍 {item.agendamento.enderecoServico}</span>}
                                      </div>
                                    )}
                                  </div>
                                  <button onClick={() => removerDoCarrinho(item._id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => atualizarQuantidade(item._id, item.quantidade - 1)} className="p-1 bg-gray-600 rounded hover:bg-gray-500"><Minus size={14} /></button>
                                    <input type="number" min="1" className="w-16 p-1 rounded bg-gray-600 text-white text-center" value={item.quantidade} onChange={(e) => atualizarQuantidade(item._id, parseInt(e.target.value) || 0)} />
                                    <button onClick={() => atualizarQuantidade(item._id, item.quantidade + 1)} className="p-1 bg-gray-600 rounded hover:bg-gray-500"><Plus size={14} /></button>
                                  </div>
                                  <p className="text-white font-medium">{item.total.toLocaleString()} Kz</p>
                                </div>
                              </div>
                            ))}
                            {carrinho.length === 0 && <p className="text-gray-400 text-center py-4">Carrinho vazio</p>}
                          </div>

                          {/* Totais Detalhados */}
                          {carrinho.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                              <div className="flex justify-between text-gray-300"><span>Subtotal:</span><span>{formatarMoeda(subtotal)} Kz</span></div>
                              {descontoNumerico > 0 && (<div className="flex justify-between text-red-400"><span>Desconto:</span><span>- {formatarMoeda(descontoNumerico)} Kz</span></div>)}
                              <div className="flex justify-between text-gray-300"><span>Subtotal c/ Desconto:</span><span>{formatarMoeda(subtotalComDesconto)} Kz</span></div>
                              {configFiscal.incluiIVA && (<div className="flex justify-between text-gray-300"><span>IVA ({configFiscal.taxaIVA}%):</span><span>{formatarMoeda(totalIVA)} Kz</span></div>)}
                              {configFiscal.incluiRetencao && totalRetencao > 0 && (<div className="flex justify-between text-red-400"><span>Retenção ({configFiscal.taxaRetencao}%):</span><span>- {formatarMoeda(totalRetencao)} Kz</span></div>)}
                              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-600"><span>TOTAL:</span><span className="text-green-400">{formatarMoeda(totalFinal)} Kz</span></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-6 mt-4 border-t border-gray-700">
                      <button onClick={emitirDocumento} disabled={emitindo || carrinho.length === 0} className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {emitindo ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        {emitindo ? "Processando..." : `Emitir ${tipoDocumento}`}
                      </button>
                      <button onClick={() => { setModalOpen(false); resetForm(); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE AGENDAMENTO DE SERVIÇO */}
            {showServicoForm && servicoSelecionado && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-600 p-2 rounded-lg"><Wrench className="text-white" size={20} /></div>
                        <h2 className="text-xl font-bold text-white">Agendar Serviço</h2>
                      </div>
                      <button onClick={() => { setShowServicoForm(false); setServicoSelecionado(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="bg-purple-600/20 rounded-lg p-3">
                      <p className="text-purple-400 font-medium">{servicoSelecionado.produto}</p>
                      <p className="text-gray-400 text-sm">Valor: {formatarMoeda(servicoSelecionado.precoVenda)} Kz</p>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Data de Início *</label><input type="datetime-local" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={servicoAgendamento.dataInicio} onChange={(e) => setServicoAgendamento({...servicoAgendamento, dataInicio: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Previsão de Término</label><input type="datetime-local" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" value={servicoAgendamento.dataFim} onChange={(e) => setServicoAgendamento({...servicoAgendamento, dataFim: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Técnico Responsável</label><input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" placeholder="Nome do técnico" value={servicoAgendamento.tecnicoResponsavel} onChange={(e) => setServicoAgendamento({...servicoAgendamento, tecnicoResponsavel: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Endereço do Serviço</label><input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" placeholder="Local onde será prestado o serviço" value={servicoAgendamento.enderecoServico} onChange={(e) => setServicoAgendamento({...servicoAgendamento, enderecoServico: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-300 mb-1">Observações</label><textarea rows="3" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" placeholder="Informações adicionais..." value={servicoAgendamento.observacoes} onChange={(e) => setServicoAgendamento({...servicoAgendamento, observacoes: e.target.value})} /></div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={adicionarServicoComAgendamento} className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-xl transition">Adicionar ao Carrinho</button>
                      <button onClick={() => { setShowServicoForm(false); setServicoSelecionado(null); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Pagamento para Recibo */}
            {modalPagamento && facturaParaPagamento && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2"><Receipt className="text-yellow-400" size={24} /><h2 className="text-xl font-bold text-white">Registar Pagamento</h2></div><button onClick={() => setModalPagamento(false)} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
                  <div className="space-y-4">
                    <div className="bg-gray-700/30 rounded-lg p-3"><p className="text-gray-400 text-sm">Factura: {getNumeroDocumento(facturaParaPagamento)}</p><p className="text-green-400 font-bold text-xl">{facturaParaPagamento.total?.toLocaleString()} Kz</p></div>
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formaPagamentoRecibo} onChange={(e) => setFormaPagamentoRecibo(e.target.value)}><option value="Dinheiro">💰 Dinheiro</option><option value="Transferência Bancária">🏦 Transferência Bancária</option><option value="Cartão Crédito">💳 Cartão Crédito</option><option value="Cartão Débito">💳 Cartão Débito</option><option value="Multicaixa Express">📱 Multicaixa Express</option></select>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" placeholder="Valor Pago" value={valorPago} onChange={(e) => { const numeros = e.target.value.replace(/\D/g, ""); setValorPago(numeros ? parseInt(numeros).toLocaleString() : ""); }} />
                    <div className="flex gap-3"><button onClick={gerarRecibo} className="flex-1 bg-green-600 py-2 rounded-xl">Gerar Recibo</button><button onClick={() => setModalPagamento(false)} className="flex-1 bg-gray-700 py-2 rounded-xl">Cancelar</button></div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Detalhes do Documento */}
            {modalDetalhes && documentoSelecionado && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white" size={20} /></div><h2 className="text-xl font-bold text-white">Detalhes do Documento</h2></div><button onClick={() => setModalDetalhes(false)} className="text-gray-400 hover:text-white"><X size={24} /></button></div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6"><div className="flex justify-between items-start"><div><p className="text-gray-400 text-sm">Documento</p><p className="text-2xl font-bold text-white">{getNumeroDocumento(documentoSelecionado)}</p></div><div className="text-right"><p className="text-gray-400 text-sm">Data de Emissão</p><p className="text-white">{new Date(documentoSelecionado.dataEmissao).toLocaleString('pt-PT')}</p></div></div></div>
                    <div className="bg-gray-700/30 rounded-xl p-4"><h3 className="text-md font-semibold text-blue-400 mb-3">Dados do Cliente</h3><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-gray-400">Nome</p><p className="text-white">{documentoSelecionado.cliente}</p></div><div><p className="text-xs text-gray-400">NIF</p><p className="text-white">{documentoSelecionado.nifCliente || "---"}</p></div></div></div>
                    <div className="bg-gray-700/30 rounded-xl p-4"><h3 className="text-md font-semibold text-yellow-400 mb-3">Itens</h3><div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-700"><tr><th className="p-2 text-left">Item</th><th className="p-2 text-center">Qtd</th><th className="p-2 text-right">Preço Unit.</th><th className="p-2 text-right">Total</th></tr></thead><tbody>{documentoSelecionado.itens?.map((item, idx) => (<tr key={idx} className="border-t border-gray-600"><td className="p-2 text-white">{item.produtoOuServico}{item.tipo === 'servico' && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1 rounded">Serviço</span>}</td><td className="p-2 text-center text-gray-300">{item.quantidade}</td><td className="p-2 text-right text-gray-300">{item.precoUnitario?.toLocaleString()} Kz</td><td className="p-2 text-right text-white">{item.total?.toLocaleString()} Kz</td></tr>))}</tbody><tfoot className="border-t border-gray-600"><tr><td colSpan="3" className="p-2 text-right">Subtotal:</td><td className="p-2 text-right">{Math.abs(documentoSelecionado.subtotal || 0).toLocaleString()} Kz</td></tr>{documentoSelecionado.incluiIVA !== false && documentoSelecionado.totalIva > 0 && <tr><td colSpan="3" className="p-2 text-right">IVA ({documentoSelecionado.taxaIVA || 14}%):</td><td className="p-2 text-right">{Math.abs(documentoSelecionado.totalIva || 0).toLocaleString()} Kz</td></tr>}<tr className="font-bold"><td colSpan="3" className="p-2 text-right">TOTAL:</td><td className="p-2 text-right text-green-400">{Math.abs(documentoSelecionado.total || 0).toLocaleString()} Kz</td></tr></tfoot></table></div></div>
                    <button onClick={() => imprimirDocumento(documentoSelecionado)} className="w-full bg-blue-600 py-2 rounded-lg flex items-center justify-center gap-2"><Printer size={18} /> Imprimir Documento</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default Facturacao;