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
  Percent, Wrench, Calendar, Clock, Receipt, Banknote,
  CalendarDays, MapPin, Phone, Mail, Wallet, Landmark,
  Edit, Copy, FileSpreadsheet, Download
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
  const [vendaFinalizada, setVendaFinalizada] = useState(false);
  
  // States para vendas a prazo
  const [modalParcelas, setModalParcelas] = useState(false);
  const [parcelas, setParcelas] = useState([]);
  const [modalPagamentoParcela, setModalPagamentoParcela] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);
  
  // States para prestação de serviços
  const [servicoAgendamento, setServicoAgendamento] = useState({
    dataInicio: "",
    dataFim: "",
    duracaoEstimada: "",
    enderecoServico: "",
    observacoes: "",
    tecnicoResponsavel: ""
  });
  const [showServicoForm, setShowServicoForm] = useState(false);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  
  // States para controle de pagamento
  const [troco, setTroco] = useState(0);
  const [valorPago, setValorPago] = useState("");

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
    desconto: 0,
    tipoVenda: "avista",
    numeroParcelas: 1,
    dataVencimento: "",
    entrada: 0,
    jurosMensal: 0,
    observacoes: ""
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

  // Calcular troco quando valor pago é alterado
  useEffect(() => {
    const valorPagoNum = converterParaNumero(valorPago);
    const total = calcularTotal();
    setTroco(Math.max(0, valorPagoNum - total));
  }, [valorPago, carrinho, formVenda.desconto, configFiscal]);

  // ============================================
  // useEffects
  // ============================================
  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarVendas();
      carregarClientes();
      carregarProdutos();
      carregarContasBancarias();
      carregarConfigFiscal();
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
    
    let filtrados = produtos.filter(p => p.tipo === 'servico' || (p.quantidade > 0 && p.tipo === 'produto'));
    
    if (buscaProduto) {
      filtrados = filtrados.filter(p => 
        p.produto?.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(buscaProduto.toLowerCase())) ||
        (p.codigoInterno && p.codigoInterno.toLowerCase().includes(buscaProduto.toLowerCase()))
      );
    }
    
    if (filtroCategoria) {
      filtrados = filtrados.filter(p => p.categoria === filtroCategoria);
    }
    
    setProdutosFiltrados(filtrados);
  }, [buscaProduto, filtroCategoria, produtos]);

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
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

  const carregarVendas = async () => {
    if (!empresaSelecionada) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/vendas/historico/${empresaSelecionada}?page=${paginaAtual}&limit=20`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.sucesso) {
        setVendas(data.dados || []);
        setTotalPaginas(data.totalPaginas || 1);
      }
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
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
      const data = await response.json();
      const produtosData = Array.isArray(data) ? data : (data.dados || []);
      setProdutos(produtosData);
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
      if (response.ok) {
        const data = await response.json();
        setContasBancarias(Array.isArray(data) ? data : (data.dados || []));
      }
    } catch (error) {
      console.error("Erro ao carregar contas bancárias:", error);
    }
  };

  // ============================================
  // Funções do Carrinho
  // ============================================
  const buscarProdutoPorCodigo = async () => {
    if (!codigoBarrasInput.trim()) {
      mostrarMensagem("Digite um código de barras", "erro");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/stock/por-codigo-barras/${codigoBarrasInput}?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const item = data.dados || data;
        adicionarAoCarrinho(item);
        mostrarMensagem(`${item.tipo === 'servico' ? 'Serviço' : 'Produto'} adicionado!`, "sucesso");
        setCodigoBarrasInput("");
      } else {
        mostrarMensagem("Item não encontrado", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao buscar item", "erro");
    }
  };

  const handleClienteSelect = (cliente) => {
    setFormVenda({
      ...formVenda,
      cliente: cliente.nome,
      clienteId: cliente._id,
      nifCliente: cliente.nif || "",
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

  const adicionarAoCarrinho = (item) => {
    if (item.tipo === 'servico') {
      setServicoSelecionado(item);
      setShowServicoForm(true);
      return;
    }
    
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
        tipo: item.tipo || 'produto'
      }]);
    }
  };

  const adicionarServicoComAgendamento = () => {
    if (!servicoSelecionado) return;
    if (!servicoAgendamento.dataInicio) {
      mostrarMensagem("Informe a data de início do serviço", "erro");
      return;
    }
    
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
    mostrarMensagem(`Serviço agendado com sucesso!`, "sucesso");
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

  const gerarParcelas = () => {
    const total = calcularTotal();
    const entrada = converterParaNumero(formVenda.entrada);
    const saldoRestante = total - entrada;
    const numeroParcelas = formVenda.numeroParcelas;
    const jurosMensal = formVenda.jurosMensal / 100;
    
    let parcelasArray = [];
    let valorParcela = saldoRestante / numeroParcelas;
    
    if (jurosMensal > 0 && numeroParcelas > 1) {
      valorParcela = (saldoRestante * jurosMensal * Math.pow(1 + jurosMensal, numeroParcelas)) / 
                     (Math.pow(1 + jurosMensal, numeroParcelas) - 1);
    }
    
    const dataBase = formVenda.dataVencimento ? new Date(formVenda.dataVencimento) : new Date();
    
    for (let i = 0; i < numeroParcelas; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataBase.getMonth() + i);
      
      parcelasArray.push({
        numero: i + 1,
        valor: Math.round(valorParcela),
        dataVencimento: dataVencimento.toISOString().split('T')[0],
        status: "pendente",
        valorPago: 0,
        dataPagamento: null
      });
    }
    
    setParcelas(parcelasArray);
    setModalParcelas(true);
  };

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => total + item.total, 0);
  };

  const calcularTotalIVA = () => {
    if (!configFiscal.incluiIVA) return 0;
    const subtotal = calcularSubtotal();
    const desconto = converterParaNumero(formVenda.desconto);
    const subtotalComDesconto = subtotal - desconto;
    return subtotalComDesconto * (configFiscal.taxaIVA / 100);
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
    const iva = calcularTotalIVA();
    const retencao = calcularTotalRetencao();
    return subtotalComDesconto + iva - retencao;
  };

  const handleDescontoChange = (e) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    setFormVenda({...formVenda, desconto: valorFormatado});
  };

  const processarVenda = async (parcelasData = null) => {
    setEmitindo(true);
    const descontoNumerico = converterParaNumero(formVenda.desconto);
    const subtotal = calcularSubtotal();
    const subtotalComDesconto = subtotal - descontoNumerico;
    const totalIVA = calcularTotalIVA();
    const totalRetencao = calcularTotalRetencao();
    const totalFinal = calcularTotal();
    const valorPagoNum = converterParaNumero(valorPago);
    const trocoCalculado = valorPagoNum - totalFinal;

    const empresaAtual = isTecnico() 
      ? { nif: userEmpresaNif, nome: userEmpresaNome, email: userEmpresaEmail, telefone: userEmpresaTelefone, endereco: userEmpresaEndereco }
      : empresas.find(e => e._id === empresaSelecionada);
    
    const vendaData = {
      empresaId: empresaSelecionada, 
      venda: {
        cliente: formVenda.cliente,
        clienteId: formVenda.clienteId,
        nifCliente: formVenda.nifCliente || "999999999",
        emailCliente: formVenda.emailCliente,
        telefoneCliente: formVenda.telefoneCliente,
        enderecoCliente: formVenda.enderecoCliente,
        tipoFactura: formVenda.tipoFactura,
        formaPagamento: formVenda.formaPagamento,
        tipoVenda: formVenda.tipoVenda,
        itens: carrinho.map(item => ({
          produtoId: item.produtoId,
          produtoOuServico: item.produtoOuServico,
          codigoBarras: item.codigoBarras,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          total: item.total,
          taxaIVA: item.taxaIVA || configFiscal.taxaIVA,
          tipo: item.tipo,
          ...(item.agendamento && { agendamento: item.agendamento })
        })),
        desconto: descontoNumerico,
        retencao: totalRetencao,
        taxaRetencao: configFiscal.taxaRetencao,
        incluiIVA: configFiscal.incluiIVA,
        incluiRetencao: configFiscal.incluiRetencao,
        taxaIVA: configFiscal.taxaIVA,
        detalhesPagamento: {
          metodo: formVenda.formaPagamento,
          conta: formVenda.contaBancaria,
          valorPago: valorPagoNum,
          troco: trocoCalculado > 0 ? trocoCalculado : 0
        },
        observacoes: formVenda.observacoes,
        ...(formVenda.tipoVenda === "prazo" && {
          parcelas: parcelasData,
          entrada: converterParaNumero(formVenda.entrada),
          jurosMensal: formVenda.jurosMensal,
          dataPrimeiraParcela: formVenda.dataVencimento
        })
      },
      empresaNif: empresaAtual?.nif,
      contaBancaria: formVenda.contaBancaria
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/vendas/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(vendaData)
      });
      const result = await response.json();
      if (response.ok && result.sucesso) {
        mostrarMensagem("Venda realizada com sucesso!", "sucesso");
        if (result.dados?.venda) {
          await gerarFacturaProfissional(result.dados.venda, user, empresaAtual, contasBancarias);
        }
        setModalOpen(false);
        setModalParcelas(false);
        setCarrinho([]);
        resetFormVenda();
        setRecarregar(true);
        setVendaFinalizada(true);
        setTimeout(() => setVendaFinalizada(false), 3000);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao finalizar venda", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setEmitindo(false);
    }
  };

  const finalizarVenda = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }
    if (carrinho.length === 0) {
      mostrarMensagem("Adicione itens ao carrinho", "erro");
      return;
    }
    if (!formVenda.cliente?.trim()) {
      mostrarMensagem("Informe o nome do cliente", "erro");
      return;
    }
    
    // Validar conta bancária se pagamento não for dinheiro
    if (formVenda.formaPagamento !== "Dinheiro" && !formVenda.contaBancaria) {
      mostrarMensagem("Selecione a conta bancária para depósito", "erro");
      return;
    }
    
    if (formVenda.tipoVenda === "prazo" && formVenda.numeroParcelas > 1) {
      gerarParcelas();
      return;
    }
    await processarVenda();
  };

  const resetFormVenda = () => {
    setFormVenda({
      cliente: "", clienteId: "", nifCliente: "", emailCliente: "", telefoneCliente: "", enderecoCliente: "",
      tipoFactura: "Venda", formaPagamento: "Dinheiro", contaBancaria: "", desconto: 0,
      tipoVenda: "avista", numeroParcelas: 1, dataVencimento: "", entrada: 0, jurosMensal: 0, observacoes: ""
    });
    setSearchCliente("");
    setCarrinho([]);
    setBuscaProduto("");
    setFiltroCategoria("");
    setCodigoBarrasInput("");
    setParcelas([]);
    setValorPago("");
    setTroco(0);
  };

  const verDetalhes = (venda) => {
    setVendaSelecionada(venda);
    setModalDetalhes(true);
  };

  const imprimirFactura = async (venda) => {
    const empresaAtual = isTecnico() 
      ? { nome: userEmpresaNome, nif: userEmpresaNif, email: userEmpresaEmail, telefone: userEmpresaTelefone, endereco: userEmpresaEndereco }
      : empresas.find(e => e._id === empresaSelecionada);
    await gerarFacturaProfissional(venda, user, empresaAtual, contasBancarias);
  };

  const cancelarVenda = async (venda) => {
    if (!window.confirm(`Tem certeza que deseja cancelar a venda FT ${venda.numeroFactura}? Esta ação irá reverter o lançamento contabilístico.`)) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/vendas/${venda._id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        mostrarMensagem(data.mensagem || "Venda cancelada com sucesso!", "sucesso");
        carregarVendas();
      } else {
        mostrarMensagem(data.mensagem || "Erro ao cancelar venda", "erro");
      }
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const handlePagamentoParcela = (parcela) => {
    setParcelaSelecionada(parcela);
    setModalPagamentoParcela(true);
  };

  const processarPagamentoParcela = async () => {
    if (!parcelaSelecionada || !vendaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/vendas/${vendaSelecionada._id}/pagar-parcela`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          parcelaNumero: parcelaSelecionada.numero,
          valorPago: parcelaSelecionada.valor,
          dataPagamento: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        mostrarMensagem(`Parcela ${parcelaSelecionada.numero} paga com sucesso!`, "sucesso");
        setModalPagamentoParcela(false);
        carregarVendas();
      } else {
        mostrarMensagem("Erro ao processar pagamento", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const vendasFiltradas = vendas.filter(v =>
    v.cliente?.toLowerCase().includes(busca.toLowerCase()) ||
    v.numeroFactura?.toString().includes(busca)
  );

  const subtotal = calcularSubtotal();
  const totalIVA = calcularTotalIVA();
  const totalRetencao = calcularTotalRetencao();
  const totalFinal = calcularTotal();

  if (loadingEmpresas) {
    return (
      <Layout title="Vendas" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Vendas" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      {vendaFinalizada && (
        <div className="fixed bottom-20 right-4 z-50 animate-fade-in-out">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <CheckCircle size={20} /> Venda finalizada com sucesso!
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
            <p className="text-gray-400">Selecione uma empresa para começar</p>
          </div>
        ) : (
          <>
            {/* Header com botão */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Pesquisar venda..." className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <button onClick={() => { resetFormVenda(); setModalOpen(true); }} className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl transition flex items-center gap-2">
                <Plus size={18} /> Nova Venda
              </button>
            </div>

            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                <p className="text-blue-300 text-sm">Total de Vendas</p>
                <p className="text-3xl font-bold text-white">{vendas.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-5 border border-green-500/30">
                <p className="text-green-300 text-sm">Faturamento Total</p>
                <p className="text-xl font-bold text-green-400">{vendas.reduce((acc, v) => acc + (v.total || 0), 0).toLocaleString()} Kz</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-5 border border-yellow-500/30">
                <p className="text-yellow-300 text-sm">Clientes</p>
                <p className="text-3xl font-bold text-yellow-400">{clientes.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-5 border border-purple-500/30">
                <p className="text-purple-300 text-sm">Ticket Médio</p>
                <p className="text-2xl font-bold text-purple-400">{vendas.length > 0 ? Math.round(vendas.reduce((acc, v) => acc + (v.total || 0), 0) / vendas.length).toLocaleString() : 0} Kz</p>
              </div>
            </div>

            {/* Tabela de vendas */}
            {loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
            ) : vendasFiltradas.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <ShoppingCart className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400">Nenhuma venda encontrada</p>
                <button onClick={() => { resetFormVenda(); setModalOpen(true); }} className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg">Iniciar Primeira Venda</button>
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
                        <th className="p-4 text-center">Tipo</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendasFiltradas.map(v => (
                        <tr key={v._id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="p-4 font-mono text-blue-400">FT {v.numeroFactura}</td>
                          <td className="p-4 text-gray-300">{new Date(v.data).toLocaleDateString('pt-PT')}</td>
                          <td className="p-4 text-white">{v.cliente}</td>
                          <td className="p-4 text-right text-green-400 font-bold">{v.total?.toLocaleString()} Kz</td>
                          <td className="p-4 text-center"><span className="px-2 py-1 rounded-lg text-xs bg-gray-700 text-gray-300">{v.formaPagamento}</span></td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-lg text-xs ${v.tipoVenda === 'prazo' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-green-600/20 text-green-400'}`}>
                              {v.tipoVenda === 'prazo' ? '📅 A Prazo' : '💰 À Vista'}
                            </span>
                          </td>
                          <td className="p-4 text-center"><span className="px-2 py-1 rounded-lg text-xs bg-green-600/20 text-green-400">{v.status || "Finalizada"}</span></td>
                           <td className="p-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => verDetalhes(v)} className="p-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg"><Eye size={16} className="text-blue-400" /></button>
                              <button onClick={() => imprimirFactura(v)} className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-lg"><Printer size={16} className="text-purple-400" /></button>
                              {v.status !== 'cancelada' && (
                                <button onClick={() => cancelarVenda(v)} className="p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg"><Trash2 size={16} className="text-red-400" /></button>
                              )}
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

            {/* MODAL DE NOVA VENDA COMPLETO */}
            {modalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-600 p-2 rounded-lg"><ShoppingCart className="text-white" size={20} /></div>
                        <h2 className="text-xl font-bold text-white">Nova Venda / Serviço</h2>
                      </div>
                      <button onClick={() => { setModalOpen(false); resetFormVenda(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna Esquerda - Dados da Venda */}
                      <div className="space-y-4">
                        <div className="bg-blue-600/10 rounded-xl p-3 border border-blue-500/30">
                          <p className="text-blue-400 text-sm">Empresa: {isTecnico() ? userEmpresaNome : empresas.find(e => e._id === empresaSelecionada)?.nome}</p>
                          <p className="text-gray-400 text-xs">NIF: {isTecnico() ? userEmpresaNif : empresas.find(e => e._id === empresaSelecionada)?.nif}</p>
                        </div>

                        {/* Cliente */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><User size={16} /> Dados do Cliente</h3>
                          <div className="relative mb-3">
                            <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                              placeholder="Nome do cliente" value={searchCliente} 
                              onChange={(e) => { setSearchCliente(e.target.value); setShowClienteDropdown(true); setFormVenda(prev => ({ ...prev, cliente: e.target.value })); }} 
                              onFocus={() => setShowClienteDropdown(true)} />
                            {showClienteDropdown && clientesFiltrados.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-xl border border-gray-600 max-h-60 overflow-auto">
                                {clientesFiltrados.map(cliente => (
                                  <div key={cliente._id} className="p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600" onClick={() => handleClienteSelect(cliente)}>
                                    <p className="text-white font-medium">{cliente.nome}</p>
                                    <p className="text-xs text-gray-400">NIF: {cliente.nif} | {cliente.telefone}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="NIF" className="p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.nifCliente} onChange={(e) => setFormVenda({...formVenda, nifCliente: e.target.value})} />
                            <input type="text" placeholder="Telefone" className="p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formVenda.telefoneCliente} onChange={(e) => setFormVenda({...formVenda, telefoneCliente: e.target.value})} />
                            <input type="email" placeholder="Email" className="p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white col-span-2" value={formVenda.emailCliente} onChange={(e) => setFormVenda({...formVenda, emailCliente: e.target.value})} />
                          </div>
                        </div>

                        {/* Tipo de Venda */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Receipt size={16} /> Tipo de Venda</h3>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => setFormVenda({...formVenda, tipoVenda: "avista"})} 
                              className={`p-3 rounded-xl transition flex items-center justify-center gap-2 ${formVenda.tipoVenda === "avista" ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                              <Banknote size={18} /> À Vista
                            </button>
                            <button onClick={() => setFormVenda({...formVenda, tipoVenda: "prazo"})} 
                              className={`p-3 rounded-xl transition flex items-center justify-center gap-2 ${formVenda.tipoVenda === "prazo" ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-400"}`}>
                              <CalendarDays size={18} /> A Prazo
                            </button>
                          </div>
                          {formVenda.tipoVenda === "prazo" && (
                            <div className="space-y-3 mt-3 pt-3 border-t border-gray-600">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">Valor de Entrada (Kz)</label>
                                  <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-right" 
                                    placeholder="0" value={formVenda.entrada} onChange={(e) => setFormVenda({...formVenda, entrada: formatarMoedaInput(e.target.value)})} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">Número de Parcelas</label>
                                  <select className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                                    value={formVenda.numeroParcelas} onChange={(e) => setFormVenda({...formVenda, numeroParcelas: parseInt(e.target.value)})}>
                                    {[1,2,3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">Juros Mensais (%)</label>
                                  <input type="number" step="0.5" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                                    value={formVenda.jurosMensal} onChange={(e) => setFormVenda({...formVenda, jurosMensal: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">Data da 1ª Parcela</label>
                                  <input type="date" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                                    value={formVenda.dataVencimento} onChange={(e) => setFormVenda({...formVenda, dataVencimento: e.target.value})} />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Configuração Fiscal */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Percent size={16} /> Configuração Fiscal</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={configFiscal.incluiIVA} onChange={(e) => setConfigFiscal({...configFiscal, incluiIVA: e.target.checked})} /> Incluir IVA</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={configFiscal.incluiRetencao} onChange={(e) => setConfigFiscal({...configFiscal, incluiRetencao: e.target.checked})} /> Incluir Retenção</label>
                          </div>
                          {configFiscal.incluiIVA && (
                            <select className="w-full mt-2 p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                              value={configFiscal.taxaIVA} onChange={(e) => setConfigFiscal({...configFiscal, taxaIVA: parseFloat(e.target.value)})}>
                              <option value="14">14% - Normal</option><option value="7">7% - Reduzida</option><option value="0">0% - Isento</option>
                            </select>
                          )}
                          {configFiscal.incluiRetencao && (
                            <select className="w-full mt-2 p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                              value={configFiscal.taxaRetencao} onChange={(e) => setConfigFiscal({...configFiscal, taxaRetencao: parseFloat(e.target.value)})}>
                              <option value="6.5">6.5% - RF</option><option value="7">7% - IRS</option><option value="10">10% - IRC</option>
                            </select>
                          )}
                        </div>

                        {/* Pagamento */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><CreditCard size={16} /> Pagamento</h3>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Forma de Pagamento</label>
                              <select className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                                value={formVenda.formaPagamento} onChange={(e) => setFormVenda({...formVenda, formaPagamento: e.target.value})}>
                                <option value="Dinheiro">💰 Dinheiro</option>
                                <option value="Transferência Bancária">🏦 Transferência Bancária</option>
                                <option value="Cartão Crédito">💳 Cartão Crédito</option>
                                <option value="Cartão Débito">💳 Cartão Débito</option>
                                <option value="Cheque">📝 Cheque</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Factura</label>
                              <select className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                                value={formVenda.tipoFactura} onChange={(e) => setFormVenda({...formVenda, tipoFactura: e.target.value})}>
                                <option value="Venda">Venda de Produtos</option>
                                <option value="Prestação de Serviço">Prestação de Serviço</option>
                              </select>
                            </div>
                          </div>
                          
                          {/* Conta Bancária - aparece quando pagamento não é dinheiro */}
                          {formVenda.formaPagamento !== "Dinheiro" && (
                            <div className="mb-3">
                              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2"><Landmark size={14} /> Conta Bancária para Depósito</label>
                              <select className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                                value={formVenda.contaBancaria} onChange={(e) => setFormVenda({...formVenda, contaBancaria: e.target.value})}>
                                <option value="">Selecione uma conta</option>
                                {contasBancarias.map(conta => (
                                  <option key={conta._id} value={conta.codNome || conta._id}>
                                    {conta.nome} - {conta.codNome} ({conta.moeda || 'AOA'})
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-400 mt-1">⚠️ O cliente deve depositar o valor nesta conta</p>
                            </div>
                          )}

                          {/* Valor Pago e Troco - apenas para dinheiro */}
                          {formVenda.formaPagamento === "Dinheiro" && (
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Valor Pago (Kz)</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-right" 
                                  placeholder="0" value={valorPago} onChange={(e) => setValorPago(formatarMoedaInput(e.target.value))} />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Troco (Kz)</label>
                                <input type="text" className="w-full p-2 rounded-lg bg-green-600/20 border border-green-500/50 text-green-400 text-right font-bold" 
                                  readOnly value={formatarMoeda(troco)} />
                              </div>
                            </div>
                          )}

                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Desconto (Kz)</label>
                            <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-right" 
                              placeholder="0" value={formVenda.desconto} onChange={handleDescontoChange} />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
                            <textarea rows="2" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white text-sm" 
                              placeholder="Observações sobre a venda..." value={formVenda.observacoes} onChange={(e) => setFormVenda({...formVenda, observacoes: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      {/* Coluna Direita - Produtos e Carrinho */}
                      <div className="space-y-4">
                        {/* Busca por Código */}
                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-300 mb-2">Código de Barras</label>
                              <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono text-lg" 
                                placeholder="Digite ou escaneie..." value={codigoBarrasInput} onChange={(e) => setCodigoBarrasInput(e.target.value)} 
                                onKeyPress={(e) => e.key === 'Enter' && buscarProdutoPorCodigo()} autoFocus />
                            </div>
                            <button onClick={buscarProdutoPorCodigo} className="mt-7 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition">
                              <Barcode size={18} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">📦 Use leitor USB ou digite manualmente. Pressione ENTER para buscar.</p>
                        </div>

                        {/* Produtos e Serviços */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-semibold text-blue-400 flex items-center gap-2"><Package size={16} /> Produtos e Serviços</h3>
                            <button onClick={() => setShowFiltros(!showFiltros)} className="flex items-center gap-1 px-2 py-1 bg-gray-600 rounded-lg text-sm">
                              <Filter size={14} /> Filtros
                            </button>
                          </div>
                          <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white mb-2" 
                            placeholder="Buscar produto ou serviço..." value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} />
                          {showFiltros && (
                            <select className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white mb-2" 
                              value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                              <option value="">Todas Categorias</option>
                              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          )}
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {produtosFiltrados.length === 0 ? (
                              <p className="text-gray-400 text-center py-4">Nenhum item encontrado</p>
                            ) : (
                              produtosFiltrados.map(p => (
                                <div key={p._id} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center hover:bg-gray-700 transition">
                                  <div className="flex-1">
                                    <p className="font-medium text-white">
                                      {p.produto}
                                      {p.tipo === 'servico' && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">Serviço</span>}
                                    </p>
                                    <div className="flex gap-3 text-xs mt-1">
                                      <span className="text-green-400 font-bold">{p.precoVenda?.toLocaleString()} Kz</span>
                                      {p.tipo !== 'servico' ? (
                                        <span className="text-gray-400">Estoque: {p.quantidade}</span>
                                      ) : (
                                        <span className="text-purple-400">🛠️ Serviço Técnico</span>
                                      )}
                                    </div>
                                    {p.codigoBarras && <p className="text-xs text-gray-500 font-mono mt-1">📷 {p.codigoBarras}</p>}
                                  </div>
                                  <button onClick={() => adicionarAoCarrinho(p)} className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition">
                                    <Plus size={16} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Carrinho de Compras */}
                        <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-md font-semibold text-yellow-400 mb-4 flex items-center gap-2"><ShoppingCart size={16} /> Carrinho ({carrinho.length} itens)</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {carrinho.length === 0 ? (
                              <p className="text-gray-400 text-center py-4">Carrinho vazio</p>
                            ) : (
                              carrinho.map(item => (
                                <div key={item._id} className="bg-gray-700/50 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="font-medium text-white">
                                        {item.produtoOuServico}
                                        {item.tipo === 'servico' && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">Serviço</span>}
                                      </p>
                                      <p className="text-xs text-gray-400">{item.precoUnitario?.toLocaleString()} Kz/un</p>
                                      {item.agendamento && (
                                        <div className="text-xs text-purple-400 mt-1 space-y-0.5">
                                          <p>📅 {new Date(item.agendamento.dataInicio).toLocaleString()}</p>
                                          {item.agendamento.enderecoServico && <p>📍 {item.agendamento.enderecoServico}</p>}
                                        </div>
                                      )}
                                    </div>
                                    <button onClick={() => removerDoCarrinho(item._id)} className="text-red-400 hover:text-red-300">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => atualizarQuantidade(item._id, item.quantidade - 1)} className="p-1 bg-gray-600 rounded hover:bg-gray-500">
                                        <Minus size={12} />
                                      </button>
                                      <input type="number" min="1" className="w-16 p-1 rounded bg-gray-600 text-white text-center" 
                                        value={item.quantidade} onChange={(e) => atualizarQuantidade(item._id, parseInt(e.target.value) || 0)} />
                                      <button onClick={() => atualizarQuantidade(item._id, item.quantidade + 1)} className="p-1 bg-gray-600 rounded hover:bg-gray-500">
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                    <p className="text-white font-bold">{item.total.toLocaleString()} Kz</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {carrinho.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-600">
                              <div className="flex justify-between text-gray-300 py-1"><span>Subtotal:</span><span>{formatarMoeda(subtotal)} Kz</span></div>
                              {configFiscal.incluiIVA && <div className="flex justify-between text-gray-300 py-1"><span>IVA ({configFiscal.taxaIVA}%):</span><span>{formatarMoeda(totalIVA)} Kz</span></div>}
                              {configFiscal.incluiRetencao && <div className="flex justify-between text-red-400 py-1"><span>Retenção ({configFiscal.taxaRetencao}%):</span><span>- {formatarMoeda(totalRetencao)} Kz</span></div>}
                              {converterParaNumero(formVenda.desconto) > 0 && <div className="flex justify-between text-red-400 py-1"><span>Desconto:</span><span>- {formatarMoeda(converterParaNumero(formVenda.desconto))} Kz</span></div>}
                              {formVenda.tipoVenda === "prazo" && converterParaNumero(formVenda.entrada) > 0 && (
                                <div className="flex justify-between text-blue-400 py-1"><span>Entrada:</span><span>{formatarMoeda(converterParaNumero(formVenda.entrada))} Kz</span></div>
                              )}
                              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-600">
                                <span>TOTAL:</span>
                                <span className="text-green-400">{formatarMoeda(totalFinal)} Kz</span>
                              </div>
                              {formVenda.formaPagamento === "Dinheiro" && converterParaNumero(valorPago) > 0 && (
                                <div className="flex justify-between text-green-400 py-1 text-sm">
                                  <span>Troco:</span>
                                  <span>{formatarMoeda(troco)} Kz</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 mt-4 border-t border-gray-700">
                      <button onClick={finalizarVenda} disabled={emitindo || carrinho.length === 0} 
                        className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {emitindo ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        {emitindo ? "Processando..." : (formVenda.tipoVenda === "prazo" && formVenda.numeroParcelas > 1 ? "Gerar Plano de Pagamento" : "Finalizar Venda")}
                      </button>
                      <button onClick={() => { setModalOpen(false); resetFormVenda(); }} 
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE PARCELAS */}
            {modalParcelas && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-600 p-2 rounded-lg"><Receipt className="text-white" size={20} /></div>
                        <h2 className="text-xl font-bold text-white">Plano de Pagamento</h2>
                      </div>
                      <button onClick={() => setModalParcelas(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="bg-blue-600/20 rounded-xl p-4 mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-300">Total da Venda:</span>
                        <span className="text-white font-bold">{formatarMoeda(totalFinal)} Kz</span>
                      </div>
                      {converterParaNumero(formVenda.entrada) > 0 && (
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-300">Entrada:</span>
                          <span className="text-green-400 font-bold">{formatarMoeda(converterParaNumero(formVenda.entrada))} Kz</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-blue-600/30">
                        <span className="text-gray-300">Saldo a prazo:</span>
                        <span className="text-yellow-400 font-bold">{formatarMoeda(totalFinal - converterParaNumero(formVenda.entrada))} Kz</span>
                      </div>
                      {formVenda.jurosMensal > 0 && (
                        <div className="flex justify-between text-orange-400 text-sm mt-2">
                          <span>Juros aplicados:</span>
                          <span>{formVenda.jurosMensal}% ao mês</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2 p-2 bg-gray-700 rounded-lg text-sm font-bold text-gray-300">
                        <span>Parcela</span><span>Valor</span><span>Vencimento</span><span>Status</span>
                      </div>
                      {parcelas.map((parcela, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2 p-3 bg-gray-700/50 rounded-lg items-center">
                          <span className="font-bold text-white">{parcela.numero}ª</span>
                          <span className="text-green-400 font-bold">{formatarMoeda(parcela.valor)} Kz</span>
                          <span className="text-gray-300 text-sm">{new Date(parcela.dataVencimento).toLocaleDateString('pt-PT')}</span>
                          <span className="text-yellow-400 text-sm">⏳ Pendente</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
                      <button onClick={() => processarVenda(parcelas)} 
                        className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl transition flex items-center justify-center gap-2">
                        <CheckCircle size={20} /> Confirmar Venda a Prazo
                      </button>
                      <button onClick={() => setModalParcelas(false)} 
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">
                        Cancelar
                      </button>
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Data de Início *</label>
                      <input type="datetime-local" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                        value={servicoAgendamento.dataInicio} onChange={(e) => setServicoAgendamento({...servicoAgendamento, dataInicio: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Previsão de Término</label>
                      <input type="datetime-local" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                        value={servicoAgendamento.dataFim} onChange={(e) => setServicoAgendamento({...servicoAgendamento, dataFim: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Técnico Responsável</label>
                      <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                        placeholder="Nome do técnico" value={servicoAgendamento.tecnicoResponsavel} 
                        onChange={(e) => setServicoAgendamento({...servicoAgendamento, tecnicoResponsavel: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Endereço do Serviço</label>
                      <input type="text" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                        placeholder="Local onde será prestado o serviço" value={servicoAgendamento.enderecoServico} 
                        onChange={(e) => setServicoAgendamento({...servicoAgendamento, enderecoServico: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
                      <textarea rows="3" className="w-full p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white" 
                        placeholder="Informações adicionais sobre o serviço..." value={servicoAgendamento.observacoes} 
                        onChange={(e) => setServicoAgendamento({...servicoAgendamento, observacoes: e.target.value})} />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={adicionarServicoComAgendamento} className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-xl transition">
                        Adicionar ao Carrinho
                      </button>
                      <button onClick={() => { setShowServicoForm(false); setServicoSelecionado(null); }} 
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE DETALHES DA VENDA */}
            {modalDetalhes && vendaSelecionada && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white" size={20} /></div>
                        <h2 className="text-xl font-bold text-white">Detalhes da Venda</h2>
                      </div>
                      <button onClick={() => setModalDetalhes(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <div className="p-6">
                    {/* Cabeçalho */}
                    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-gray-400 text-sm">Factura Nº</p>
                          <p className="text-2xl font-bold text-white">FT {vendaSelecionada.numeroFactura}</p>
                          {vendaSelecionada.tipoVenda === 'prazo' && (
                            <span className="inline-block mt-2 px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded-lg text-xs">📅 Venda a Prazo</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Data de Emissão</p>
                          <p className="text-white">{new Date(vendaSelecionada.data).toLocaleString('pt-PT')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cliente */}
                    <div className="bg-gray-700/30 rounded-xl p-4 mb-4">
                      <h3 className="text-md font-semibold text-blue-400 mb-3">Dados do Cliente</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-gray-400">Nome</p><p className="text-white">{vendaSelecionada.cliente}</p></div>
                        <div><p className="text-xs text-gray-400">NIF</p><p className="text-white">{vendaSelecionada.nifCliente || "---"}</p></div>
                        {vendaSelecionada.telefoneCliente && <div><p className="text-xs text-gray-400">Telefone</p><p className="text-white">{vendaSelecionada.telefoneCliente}</p></div>}
                        {vendaSelecionada.emailCliente && <div><p className="text-xs text-gray-400">Email</p><p className="text-white">{vendaSelecionada.emailCliente}</p></div>}
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="bg-gray-700/30 rounded-xl p-4 mb-4">
                      <h3 className="text-md font-semibold text-yellow-400 mb-3">Itens da Venda</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr className="text-white">
                              <th className="p-2 text-left">Item</th>
                              <th className="p-2 text-center">Qtd</th>
                              <th className="p-2 text-right">Preço Unit.</th>
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendaSelecionada.itens?.map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-600">
                                <td className="p-2 text-white">
                                  {item.produtoOuServico}
                                  {item.tipo === 'servico' && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">Serviço</span>}
                                  {item.agendamento && (
                                    <div className="text-xs text-purple-400 mt-1">
                                      📅 {new Date(item.agendamento.dataInicio).toLocaleString()}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 text-center text-gray-300">{item.quantidade}</td>
                                <td className="p-2 text-right text-gray-300">{item.precoUnitario?.toLocaleString()} Kz</td>
                                <td className="p-2 text-right text-white">{item.total?.toLocaleString()} Kz</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-gray-600">
                            <tr><td colSpan="3" className="p-2 text-right text-gray-300">Subtotal:</td><td className="p-2 text-right text-white">{vendaSelecionada.subtotal?.toLocaleString()} Kz</td></tr>
                            {vendaSelecionada.desconto > 0 && <tr><td colSpan="3" className="p-2 text-right text-red-400">Desconto:</td><td className="p-2 text-right text-red-400">- {vendaSelecionada.desconto?.toLocaleString()} Kz</td></tr>}
                            {vendaSelecionada.totalIva > 0 && <tr><td colSpan="3" className="p-2 text-right text-gray-300">IVA ({vendaSelecionada.taxaIVA || 14}%):</td><td className="p-2 text-right text-white">{vendaSelecionada.totalIva?.toLocaleString()} Kz</td></tr>}
                            {vendaSelecionada.totalRetencao > 0 && <tr><td colSpan="3" className="p-2 text-right text-red-400">Retenção ({vendaSelecionada.taxaRetencao || 0}%):</td><td className="p-2 text-right text-red-400">- {vendaSelecionada.totalRetencao?.toLocaleString()} Kz</td></tr>}
                            <tr className="border-t-2 border-gray-600"><td colSpan="3" className="p-2 text-right text-white font-bold">TOTAL:</td><td className="p-2 text-right text-green-400 font-bold">{vendaSelecionada.total?.toLocaleString()} Kz</td></tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Pagamento */}
                    <div className="bg-gray-700/30 rounded-xl p-4">
                      <h3 className="text-md font-semibold text-green-400 mb-3">Pagamento</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-gray-400">Forma</p><p className="text-white">{vendaSelecionada.formaPagamento}</p></div>
                        <div><p className="text-xs text-gray-400">Status</p><p className="text-green-400">{vendaSelecionada.status}</p></div>
                        {vendaSelecionada.detalhesPagamento?.conta && (
                          <div className="col-span-2"><p className="text-xs text-gray-400">Conta Bancária</p><p className="text-white">{vendaSelecionada.detalhesPagamento.conta}</p></div>
                        )}
                      </div>
                    </div>

                    {/* Parcelas - se for venda a prazo */}
                    {vendaSelecionada.parcelas && vendaSelecionada.parcelas.length > 0 && (
                      <div className="bg-gray-700/30 rounded-xl p-4 mt-4">
                        <h3 className="text-md font-semibold text-yellow-400 mb-3">Plano de Pagamento</h3>
                        <div className="space-y-2">
                          {vendaSelecionada.parcelas.map((parcela, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-gray-700/50 rounded-lg">
                              <div>
                                <span className="font-medium text-white">{parcela.numero}ª parcela</span>
                                <p className="text-xs text-gray-400">Vence: {new Date(parcela.dataVencimento).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-bold">{parcela.valor.toLocaleString()} Kz</p>
                                <p className={`text-xs ${parcela.status === 'pago' ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {parcela.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                                </p>
                              </div>
                              {parcela.status !== 'pago' && (
                                <button onClick={() => handlePagamentoParcela(parcela)} className="px-3 py-1 bg-green-600 rounded-lg text-sm hover:bg-green-700">
                                  Pagar
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {vendaSelecionada.observacoes && (
                      <div className="bg-gray-700/30 rounded-xl p-4 mt-4">
                        <h3 className="text-md font-semibold text-gray-400 mb-2">Observações</h3>
                        <p className="text-gray-300">{vendaSelecionada.observacoes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE PAGAMENTO DE PARCELA */}
            {modalPagamentoParcela && parcelaSelecionada && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Pagamento de Parcela</h2>
                    <div className="space-y-4">
                      <div className="bg-gray-700 rounded-lg p-3">
                        <p className="text-gray-400">Parcela {parcelaSelecionada.numero}</p>
                        <p className="text-2xl font-bold text-green-400">{parcelaSelecionada.valor.toLocaleString()} Kz</p>
                        <p className="text-gray-400 text-sm">Vencimento: {new Date(parcelaSelecionada.dataVencimento).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={processarPagamentoParcela} className="flex-1 bg-green-600 py-2 rounded-xl">Confirmar Pagamento</button>
                        <button onClick={() => setModalPagamentoParcela(false)} className="flex-1 bg-gray-700 py-2 rounded-xl">Cancelar</button>
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
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Vendas;