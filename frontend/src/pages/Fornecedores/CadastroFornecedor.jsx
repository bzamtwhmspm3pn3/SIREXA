// src/pages/Fornecedores/CadastroFornecedor.jsx - VERSÃO COMPLETA CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { 
  Save, ArrowLeft, Truck, Building2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Hash, CheckCircle, AlertCircle, 
  Loader2, Plus, X, Calendar, DollarSign, FileText,
  Package, Percent, Wallet, Wrench, Fuel, 
  Computer, Globe, Trash2, Edit, Info, Calculator,
  Settings, ClipboardList, Receipt, Landmark, Clock, AlertTriangle,
  TrendingUp, ShoppingCart, Home, Building, Key, Zap, Shield, 
  HardDrive, Server, Wifi, Box, Layers, Tag, Scale, Gauge,
  CalendarDays, Timer, BadgePercent, Handshake, FileCheck, Award,
  Zap as Lightning, Thermometer, Droplets, Wind, Cog, Monitor,
  Printer, Truck as Delivery, Map, Navigation, Volume2, Users
} from "lucide-react";

const CadastroFornecedor = () => {
  const { isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  
  const [tipoFornecedor, setTipoFornecedor] = useState("");
  
  // ============================================
  // ITENS (diferente por tipo)
  // ============================================
  const [itens, setItens] = useState([]);
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [novoItem, setNovoItem] = useState({});
  
  // ============================================
  // ESTADOS PARA CONTRATOS
  // ============================================
  const [contratos, setContratos] = useState([]);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [editandoContrato, setEditandoContrato] = useState(null);
  const [novoContrato, setNovoContrato] = useState({
    descricao: "",
    valor: "",
    dataInicio: "",
    dataFim: "",
    modalidadePagamento: "Mensal",
    diaVencimento: 5,
    diaPagamento: 15,
    avisoAntecedencia: 5,
    observacoes: ""
  });

  // ============================================
  // DADOS PRINCIPAIS
  // ============================================
  const [formData, setFormData] = useState({
    empresaId: "",
    nome: "",
    nif: "",
    telefone: "",
    email: "",
    endereco: "",
    contato: "",
    regimeTributacao: "",
    fiscal: {
      suportaIVA: true,
      taxaIVA: 14,
      retencaoFonte: false,
      tipoRetencao: "",
      taxaRetencao: 0
    },
    pagamento: {
      banco: "",
      iban: "",
      swift: "",
      formaPagamento: "Transferência"
    },
    status: "Ativo",
    observacoes: ""
  });

  // ============================================
  // CONFIGURAÇÕES DOS TIPOS DE FORNECEDOR COM FORMULÁRIOS INTELIGENTES
  // ============================================
  const tiposFornecedorConfig = [
    // 1. MERCADORIA (Produtos Físicos)
    { 
      value: "mercadoria", 
      label: "📦 Mercadoria/Produto", 
      icon: Package, 
      cor: "blue", 
      modulo: "Stock",
      descricao: "Produtos físicos para revenda ou consumo",
      natureza: "Produto Físico",
      camposItem: [
        { name: "produto", label: "Nome do Produto", type: "text", required: true, placeholder: "Ex: Arroz Integral 1kg" },
        { name: "codigoBarras", label: "Código de Barras/EAN", type: "text", required: false, placeholder: "7891234567890" },
        { name: "categoria", label: "Categoria", type: "select", options: ["Alimentar", "Bebidas", "Limpeza", "Higiene", "Informática", "Escritório", "Vestuário", "Construção"], required: true },
        { name: "marca", label: "Marca/Fabricante", type: "text", required: false, placeholder: "Ex: Nestlé, Dell, Sony" },
        { name: "quantidade", label: "Quantidade", type: "number", required: true, min: 1, placeholder: "Número de unidades" },
        { name: "unidadeMedida", label: "Unidade de Medida", type: "select", options: ["Unidade", "KG", "Litro", "Metro", "Caixa", "Pacote", "Dúzia", "Par"], required: true },
        { name: "precoCompra", label: "Preço de Compra (Kz)", type: "number", required: true, min: 0, placeholder: "Preço unitário de compra" },
        { name: "precoVenda", label: "Preço de Venda (Kz)", type: "number", required: true, min: 0, placeholder: "Preço de venda sugerido" },
        { name: "descontoCompra", label: "Desconto na Compra (%)", type: "number", required: false, min: 0, max: 100, placeholder: "Desconto negociado" },
        { name: "taxaIVA", label: "Taxa de IVA (%)", type: "select", options: [0, 5, 7, 14, 23], required: true },
        { name: "dataValidade", label: "Data de Validade", type: "date", required: false, placeholder: "Se aplicável" },
        { name: "lote", label: "Número do Lote", type: "text", required: false, placeholder: "Identificação do lote" },
        { name: "armazem", label: "Armazém/Localização", type: "text", required: false, placeholder: "Ex: Armazém Central, Prateleira A3" },
        { name: "estoqueMinimo", label: "Estoque Mínimo (alerta)", type: "number", required: false, min: 0, placeholder: "Quantidade para alerta" },
        { name: "prazoEntrega", label: "Prazo de Entrega (dias)", type: "number", required: false, min: 0, placeholder: "Tempo até receber o produto" }
      ]
    },
    // 2. RENDA (Aluguer de Imóveis, Equipamentos)
    { 
      value: "renda", 
      label: "🏠 Renda (Aluguer)", 
      icon: Home, 
      cor: "green", 
      modulo: "Contratos",
      descricao: "Fornecedor de serviços de arrendamento",
      natureza: "Serviço Recorrente",
      camposItem: [
        { name: "tipoImovel", label: "Tipo de Imóvel", type: "select", options: ["Comercial", "Residencial", "Industrial", "Terreno", "Armazém", "Escritório"], required: true },
        { name: "localizacao", label: "Localização", type: "text", required: true, placeholder: "Endereço completo do imóvel" },
        { name: "area", label: "Área (m²)", type: "number", required: true, min: 0, placeholder: "Metros quadrados" },
        { name: "valorMensal", label: "Valor da Renda (Kz/mês)", type: "number", required: true, min: 0, placeholder: "Valor mensal do aluguer" },
        { name: "valorCondominio", label: "Condomínio (Kz/mês)", type: "number", required: false, min: 0, placeholder: "Se aplicável" },
        { name: "caução", label: "Caução (Kz)", type: "number", required: false, min: 0, placeholder: "Valor da garantia" },
        { name: "dataInicioContrato", label: "Data Início do Contrato", type: "date", required: true },
        { name: "dataFimContrato", label: "Data Fim do Contrato", type: "date", required: true },
        { name: "reajuste", label: "Percentual de Reajuste Anual (%)", type: "number", required: false, min: 0, placeholder: "Ex: 5.5% para inflação" },
        { name: "periodoReajuste", label: "Período do Reajuste", type: "select", options: ["Anual", "Semestral", "Trimestral"], required: false },
        { name: "indexador", label: "Índice de Reajuste", type: "select", options: ["IPC", "IPCA", "IGP-M", "INPC", "Contratual"], required: false },
        { name: "impostoRenda", label: "Taxa de Retenção (IRS)", type: "select", options: [0, 10, 15, 20, 25], required: true, description: "Retenção na fonte sobre rendas" },
        { name: "impostoSelo", label: "Imposto de Selo (%)", type: "number", required: false, min: 0, max: 10, placeholder: "Aplicável a contratos" },
        { name: "utilidadesIncluidas", label: "Utilidades Incluídas", type: "multiselect", options: ["Água", "Luz", "Gás", "Internet", "Segurança"], required: false },
        { name: "garantias", label: "Garantias Exigidas", type: "textarea", required: false, placeholder: "Fiador, seguro, etc" },
        { name: "clausulasEspeciais", label: "Cláusulas Especiais", type: "textarea", required: false, placeholder: "Condições específicas do contrato" }
      ]
    },
    // 3. SERVIÇOS PROFISSIONAIS (Consultoria, Advocacia, Contabilidade)
    { 
      value: "servicoProfissional", 
      label: "👔 Serviço Profissional", 
      icon: Briefcase, 
      cor: "indigo", 
      modulo: "Pagamentos",
      descricao: "Consultoria, advocacia, contabilidade, engenharia",
      natureza: "Serviço por Hora/Projeto",
      camposItem: [
        { name: "tipoServico", label: "Tipo de Serviço", type: "select", options: ["Consultoria", "Assessoria Jurídica", "Contabilidade", "Engenharia", "Arquitetura", "Marketing", "TI", "Recursos Humanos", "Treinamento"], required: true },
        { name: "descricao", label: "Descrição do Serviço", type: "textarea", required: true, placeholder: "Detalhar o escopo do serviço" },
        { name: "modalidade", label: "Modalidade de Cobrança", type: "select", options: ["Por Hora", "Por Projeto", "Mensal", "Trimestral", "Por Entrega"], required: true },
        { name: "valorHora", label: "Valor/Hora (Kz)", type: "number", required: false, min: 0, placeholder: "Se cobrança por hora" },
        { name: "valorProjeto", label: "Valor do Projeto (Kz)", type: "number", required: false, min: 0, placeholder: "Se projeto fechado" },
        { name: "horasEstimadas", label: "Horas Estimadas", type: "number", required: false, min: 0, placeholder: "Duração prevista" },
        { name: "prazoExecucao", label: "Prazo de Execução (dias)", type: "number", required: true, min: 1, placeholder: "Dias para conclusão" },
        { name: "entregaveis", label: "Entregáveis", type: "textarea", required: false, placeholder: "Lista de entregas esperadas" },
        { name: "retencaoFonte", label: "Retenção na Fonte (%)", type: "select", options: [0, 6.5, 7, 10, 15], required: true, description: "Serviços: 6.5%, Renda: 15%" },
        { name: "relatoriosPeriodicos", label: "Relatórios Periódicos", type: "select", options: ["Mensal", "Trimestral", "Semestral", "Sob Demanda"], required: false },
        { name: "reunioes", label: "Reuniões Incluídas", type: "number", required: false, min: 0, placeholder: "Quantidade mensal" }
      ]
    },
    // 4. INTERNET/TELECOM
    { 
      value: "internet", 
      label: "🌐 Internet/Telecom", 
      icon: Globe, 
      cor: "cyan", 
      modulo: "Pagamentos",
      descricao: "Serviços de comunicação",
      natureza: "Serviço Recorrente",
      camposItem: [
        { name: "operadora", label: "Operadora", type: "text", required: true, placeholder: "Ex: Unitel, Africell, Mundo Net" },
        { name: "tipoServico", label: "Tipo de Serviço", type: "select", options: ["Internet Fixa", "Internet Móvel", "Telefone Fixo", "TV por Assinatura", "Fibra Óptica", "Rádio Enlace"], required: true },
        { name: "plano", label: "Plano", type: "text", required: true, placeholder: "Nome do plano contratado" },
        { name: "velocidade", label: "Velocidade (Mbps)", type: "text", required: false, placeholder: "Ex: 100 Mbps" },
        { name: "franquia", label: "Franquia de Dados", type: "text", required: false, placeholder: "Ex: Ilimitado, 500GB" },
        { name: "valorMensal", label: "Valor Mensal (Kz)", type: "number", required: true, min: 0 },
        { name: "dataInstalacao", label: "Data de Instalação", type: "date", required: false },
        { name: "periodoFidelizacao", label: "Período de Fidelização (meses)", type: "number", required: false, min: 0, placeholder: "Meses de contrato" },
        { name: "multaRescisao", label: "Multa de Rescisão (Kz)", type: "number", required: false, min: 0, placeholder: "Valor da multa" },
        { name: "equipamentos", label: "Equipamentos Fornecidos", type: "textarea", required: false, placeholder: "Router, ONT, decodificador, etc" },
        { name: "ipPublico", label: "IP Público", type: "boolean", required: false, description: "Inclui IP público fixo" },
        { name: "suporte24h", label: "Suporte 24/7", type: "boolean", required: false, description: "Suporte técnico 24 horas" }
      ]
    },
    // 5. MANUTENÇÃO
    { 
      value: "manutencao", 
      label: "🔧 Manutenção", 
      icon: Wrench, 
      cor: "orange", 
      modulo: "Manutencoes",
      descricao: "Serviços de manutenção",
      natureza: "Serviço por Execução",
      camposItem: [
        { name: "tipoManutencao", label: "Tipo de Manutenção", type: "select", options: ["Preventiva", "Corretiva", "Preditiva", "Urgente", "Emergencial"], required: true },
        { name: "equipamento", label: "Equipamento/Viatura", type: "text", required: true, placeholder: "Modelo e identificação" },
        { name: "descricao", label: "Descrição do Serviço", type: "textarea", required: true, placeholder: "Detalhar o serviço a executar" },
        { name: "valor", label: "Valor (Kz)", type: "number", required: true, min: 0 },
        { name: "pecasUtilizadas", label: "Peças Utilizadas", type: "textarea", required: false, placeholder: "Lista de peças e quantidades" },
        { name: "maoDeObra", label: "Mão de Obra (Kz)", type: "number", required: false, min: 0 },
        { name: "garantia", label: "Garantia do Serviço (dias)", type: "number", required: false, min: 0, placeholder: "Dias de garantia" },
        { name: "dataAgendamento", label: "Data do Agendamento", type: "date", required: true },
        { name: "horaAgendamento", label: "Hora do Agendamento", type: "time", required: false },
        { name: "duracaoEstimada", label: "Duração Estimada (horas)", type: "number", required: false, min: 0 },
        { name: "tecnicoResponsavel", label: "Técnico Responsável", type: "text", required: false, placeholder: "Nome do técnico" },
        { name: "kmAtual", label: "Quilometragem Atual", type: "number", required: false, min: 0, placeholder: "Para viaturas" },
        { name: "proximaManutencao", label: "Próxima Manutenção (km)", type: "number", required: false, min: 0, placeholder: "Sugestão de próxima revisão" }
      ]
    },
    // 6. ABASTECIMENTO (Combustível)
    { 
      value: "abastecimento", 
      label: "⛽ Abastecimento", 
      icon: Fuel, 
      cor: "yellow", 
      modulo: "Abastecimentos",
      descricao: "Combustível e lubrificantes",
      natureza: "Produto por Unidade",
      camposItem: [
        { name: "tipoCombustivel", label: "Tipo de Combustível", type: "select", options: ["Gasolina 95", "Gasolina 98", "Diesel", "GPL", "Etanol", "AdBlue"], required: true },
        { name: "quantidade", label: "Quantidade (Litros)", type: "number", required: true, min: 1 },
        { name: "precoLitro", label: "Preço por Litro (Kz)", type: "number", required: true, min: 0 },
        { name: "valorTotal", label: "Valor Total (Kz)", type: "number", required: true, min: 0, disabled: true, calculated: "quantidade * precoLitro" },
        { name: "viatura", label: "Viatura", type: "text", required: true, placeholder: "Matrícula ou identificação" },
        { name: "kmAtual", label: "Quilometragem Atual", type: "number", required: true, min: 0 },
        { name: "odometro", label: "Odómetro", type: "number", required: false, min: 0 },
        { name: "posto", label: "Posto de Abastecimento", type: "text", required: false, placeholder: "Nome do posto" },
        { name: "data", label: "Data do Abastecimento", type: "date", required: true },
        { name: "motorista", label: "Motorista", type: "text", required: false, placeholder: "Nome do motorista" },
        { name: "fatura", label: "Nº da Factura", type: "text", required: false, placeholder: "Número da factura" }
      ]
    },
    // 7. EQUIPAMENTO
    { 
      value: "equipamento", 
      label: "🖥️ Equipamento", 
      icon: Computer, 
      cor: "purple", 
      modulo: "Inventario",
      descricao: "Aquisição de equipamentos",
      natureza: "Ativo Fixo",
      camposItem: [
        { name: "nome", label: "Nome do Equipamento", type: "text", required: true, placeholder: "Ex: Dell Latitude 5420" },
        { name: "categoria", label: "Categoria", type: "select", options: ["Computador", "Servidor", "Impressora", "Monitor", "Periférico", "Mobiliário", "Utensílio"], required: true },
        { name: "marca", label: "Marca", type: "text", required: false, placeholder: "Ex: Dell, HP, Lenovo" },
        { name: "modelo", label: "Modelo", type: "text", required: false, placeholder: "Ex: Latitude 5420" },
        { name: "numeroSerie", label: "Número de Série", type: "text", required: false, placeholder: "Identificação única" },
        { name: "valorAquisicao", label: "Valor de Aquisição (Kz)", type: "number", required: true, min: 0 },
        { name: "dataAquisicao", label: "Data de Aquisição", type: "date", required: true },
        { name: "vidaUtil", label: "Vida Útil Estimada (anos)", type: "number", required: false, min: 0, placeholder: "Para depreciação" },
        { name: "depreciacao", label: "Taxa de Depreciação (%)", type: "number", required: false, min: 0, max: 100, placeholder: "Anual" },
        { name: "garantia", label: "Garantia (meses)", type: "number", required: false, min: 0 },
        { name: "localizacao", label: "Localização", type: "text", required: false, placeholder: "Departamento, sala" },
        { name: "responsavel", label: "Responsável", type: "text", required: false, placeholder: "Nome do colaborador" },
        { name: "especificacoes", label: "Especificações Técnicas", type: "textarea", required: false, placeholder: "Processador, RAM, disco, etc" },
        { name: "acessorios", label: "Acessórios Incluídos", type: "text", required: false, placeholder: "Mouse, teclado, cabo, etc" }
      ]
    },
    // 8. SERVIÇO GERAL (Outros)
    { 
      value: "servicoGeral", 
      label: "📝 Outro Serviço", 
      icon: FileText, 
      cor: "gray", 
      modulo: "Pagamentos",
      descricao: "Outros tipos de serviço",
      natureza: "Serviço Geral",
      camposItem: [
        { name: "descricao", label: "Descrição do Serviço", type: "textarea", required: true, placeholder: "Detalhar o serviço" },
        { name: "valor", label: "Valor (Kz)", type: "number", required: true, min: 0 },
        { name: "formaPagamento", label: "Forma de Pagamento", type: "select", options: ["À Vista", "30 dias", "60 dias", "Na Entrega"], required: true },
        { name: "dataExecucao", label: "Data de Execução", type: "date", required: false },
        { name: "prazoEntrega", label: "Prazo de Entrega (dias)", type: "number", required: false, min: 0 },
        { name: "observacoes", label: "Observações", type: "textarea", required: false }
      ]
    }
  ];

  // ============================================
  // FUNÇÃO PARA CALCULAR RESUMO FISCAL
  // ============================================
  const calcularResumoFiscal = (valor) => {
    const taxaIVA = formData.fiscal.taxaIVA || 14;
    const taxaRetencao = formData.fiscal.taxaRetencao || 0;
    const incluiIVA = formData.fiscal.suportaIVA !== false;
    const incluiRetencao = formData.fiscal.retencaoFonte || false;
    
    const iva = incluiIVA ? valor * (taxaIVA / 100) : 0;
    const retencao = incluiRetencao ? valor * (taxaRetencao / 100) : 0;
    const valorLiquido = valor + iva - retencao;
    return { iva, retencao, valorLiquido, taxaIVA, taxaRetencao };
  };

  // ============================================
  // FUNÇÕES PARA ITENS
  // ============================================
  const getCamposItem = () => {
    const tipoInfo = tiposFornecedorConfig.find(t => t.value === tipoFornecedor);
    return tipoInfo?.camposItem || [];
  };

  const abrirModalItem = (item = null) => {
    setEditandoItem(item);
    if (item) {
      setNovoItem({ ...item });
    } else {
      const defaultItem = {};
      getCamposItem().forEach(campo => {
        defaultItem[campo.name] = campo.default || (campo.type === 'number' ? 0 : (campo.type === 'boolean' ? false : ''));
      });
      setNovoItem(defaultItem);
    }
    setModalItemOpen(true);
  };

  const salvarItem = () => {
    const campos = getCamposItem();
    const missingFields = campos.filter(c => c.required && !novoItem[c.name]);
    if (missingFields.length > 0) {
      mostrarMensagem(`Preencha: ${missingFields.map(f => f.label).join(', ')}`, "erro");
      return;
    }
    
    let valorTotal = novoItem.valor || novoItem.valorMensal || novoItem.valorProjeto || novoItem.valorAquisicao || 0;
    if (tipoFornecedor === "mercadoria") {
      valorTotal = (novoItem.quantidade || 0) * (novoItem.precoCompra || 0);
    }
    if (tipoFornecedor === "abastecimento") {
      valorTotal = (novoItem.quantidade || 0) * (novoItem.precoLitro || 0);
    }
    
    const itemCompleto = {
      id: editandoItem?.id || Date.now(),
      ...novoItem,
      valorTotal
    };
    
    if (editandoItem) {
      setItens(itens.map(item => item.id === editandoItem.id ? itemCompleto : item));
      mostrarMensagem(`${tipoInfo?.label} atualizado!`, "sucesso");
    } else {
      setItens([...itens, itemCompleto]);
      mostrarMensagem(`${tipoInfo?.label} adicionado!`, "sucesso");
    }
    setModalItemOpen(false);
    setEditandoItem(null);
    setNovoItem({});
  };

  const removerItem = (id) => {
    setItens(itens.filter(item => item.id !== id));
    mostrarMensagem("Item removido!", "sucesso");
  };

  // ============================================
  // FUNÇÕES PARA CONTRATOS
  // ============================================
  const abrirModalContrato = (contrato = null) => {
    if (contrato) {
      setEditandoContrato(contrato);
      setNovoContrato({
        descricao: contrato.descricao,
        valor: contrato.valor,
        dataInicio: contrato.dataInicio,
        dataFim: contrato.dataFim,
        modalidadePagamento: contrato.modalidadePagamento,
        diaVencimento: contrato.diaVencimento,
        diaPagamento: contrato.diaPagamento,
        avisoAntecedencia: contrato.avisoAntecedencia,
        observacoes: contrato.observacoes || ""
      });
    } else {
      setEditandoContrato(null);
      setNovoContrato({
        descricao: "",
        valor: "",
        dataInicio: "",
        dataFim: "",
        modalidadePagamento: "Mensal",
        diaVencimento: 5,
        diaPagamento: 15,
        avisoAntecedencia: 5,
        observacoes: ""
      });
    }
    setShowContratoModal(true);
  };

  const salvarContrato = () => {
    if (!novoContrato.descricao || !novoContrato.valor || !novoContrato.dataInicio || !novoContrato.dataFim) {
      mostrarMensagem("Preencha todos os campos obrigatórios do contrato", "erro");
      return;
    }
    
    // CORREÇÃO CRÍTICA: Garantir que valor é string antes de chamar toString()
    const valorStr = String(novoContrato.valor || "0");
    const valorNumerico = parseFloat(valorStr.replace(/\D/g, "")) || 0;
    const resumo = calcularResumoFiscal(valorNumerico);
    
    const contratoData = {
      id: editandoContrato?.id || Date.now(),
      descricao: novoContrato.descricao,
      valor: valorNumerico,
      valorLiquido: resumo.valorLiquido,
      iva: resumo.iva,
      retencao: resumo.retencao,
      dataInicio: novoContrato.dataInicio,
      dataFim: novoContrato.dataFim,
      modalidadePagamento: novoContrato.modalidadePagamento,
      diaVencimento: novoContrato.diaVencimento,
      diaPagamento: novoContrato.diaPagamento,
      avisoAntecedencia: novoContrato.avisoAntecedencia,
      observacoes: novoContrato.observacoes
    };
    
    if (editandoContrato) {
      setContratos(contratos.map(c => c.id === editandoContrato.id ? contratoData : c));
      mostrarMensagem("Contrato atualizado!", "sucesso");
    } else {
      setContratos([...contratos, contratoData]);
      mostrarMensagem("Contrato adicionado!", "sucesso");
    }
    
    setShowContratoModal(false);
    setEditandoContrato(null);
    setNovoContrato({
      descricao: "",
      valor: "",
      dataInicio: "",
      dataFim: "",
      modalidadePagamento: "Mensal",
      diaVencimento: 5,
      diaPagamento: 15,
      avisoAntecedencia: 5,
      observacoes: ""
    });
  };

  const removerContrato = (id) => {
    setContratos(contratos.filter(c => c.id !== id));
    mostrarMensagem("Contrato removido!", "sucesso");
  };

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  useEffect(() => {
    if (isTecnico() && userEmpresaId) {
      setFormData(prev => ({ ...prev, empresaId: userEmpresaId }));
    }
  }, [isTecnico, userEmpresaId]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.status === 403) {
        setEmpresas([]);
        return;
      }
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      if (empresasList.length === 1 && !formData.empresaId) {
        setFormData(prev => ({ ...prev, empresaId: empresasList[0]._id }));
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "";
    const numeros = String(valor).replace(/\D/g, "");
    if (!numeros) return "";
    return new Intl.NumberFormat('pt-AO').format(parseInt(numeros));
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.empresaId) {
    mostrarMensagem("Selecione uma empresa", "erro");
    return;
  }
  if (!formData.nome?.trim()) {
    mostrarMensagem("Nome do fornecedor é obrigatório", "erro");
    return;
  }
  if (!formData.nif?.trim()) {
    mostrarMensagem("NIF é obrigatório", "erro");
    return;
  }
  if (!tipoFornecedor) {
    mostrarMensagem("Selecione o tipo de fornecedor", "erro");
    return;
  }

  setLoading(true);
  
  const dadosEnvio = {
    ...formData,
    tipoFornecedor,
    natureza: tiposFornecedorConfig.find(t => t.value === tipoFornecedor)?.natureza,
    itens: itens,
    contratos: contratos
  };

  try {
    const token = localStorage.getItem("token");
    const response = await fetch("https://sirexa-api.onrender.com/api/fornecedores", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(dadosEnvio)
    });
    const result = await response.json();
    
    // CORREÇÃO: O backend retorna o objeto do fornecedor diretamente, não tem campo 'sucesso'
    if (response.ok && result._id) {
      mostrarMensagem("✅ Fornecedor cadastrado com sucesso!", "sucesso");
      setRedirecting(true);
      setTimeout(() => navigate("/fornecedores"), 1500);
    } else {
      // Se houver mensagem de erro no resultado, usa ela, senão mensagem genérica
      const msgErro = result.mensagem || result.erro || "Erro ao cadastrar fornecedor";
      mostrarMensagem(msgErro, "erro");
      setLoading(false);
    }
  } catch (error) {
    console.error("Erro:", error);
    mostrarMensagem("Erro ao conectar ao servidor", "erro");
    setLoading(false);
  }
};


  // Função para obter classes CSS estáticas baseadas na cor
  const getBorderClass = (cor, isSelected) => {
    if (!isSelected) return "border-gray-600 bg-gray-700/30 hover:bg-gray-700/50";
    switch(cor) {
      case "blue": return "border-blue-500 bg-blue-600/20";
      case "green": return "border-green-500 bg-green-600/20";
      case "indigo": return "border-indigo-500 bg-indigo-600/20";
      case "cyan": return "border-cyan-500 bg-cyan-600/20";
      case "orange": return "border-orange-500 bg-orange-600/20";
      case "yellow": return "border-yellow-500 bg-yellow-600/20";
      case "purple": return "border-purple-500 bg-purple-600/20";
      case "gray": return "border-gray-500 bg-gray-600/20";
      default: return "border-gray-600 bg-gray-700/30";
    }
  };

  const getIconBgClass = (cor, isSelected) => {
    if (!isSelected) return "bg-gray-600";
    switch(cor) {
      case "blue": return "bg-blue-600";
      case "green": return "bg-green-600";
      case "indigo": return "bg-indigo-600";
      case "cyan": return "bg-cyan-600";
      case "orange": return "bg-orange-600";
      case "yellow": return "bg-yellow-600";
      case "purple": return "bg-purple-600";
      case "gray": return "bg-gray-600";
      default: return "bg-gray-600";
    }
  };

  const getTextClass = (cor, isSelected) => {
    if (!isSelected) return "text-white";
    switch(cor) {
      case "blue": return "text-blue-400";
      case "green": return "text-green-400";
      case "indigo": return "text-indigo-400";
      case "cyan": return "text-cyan-400";
      case "orange": return "text-orange-400";
      case "yellow": return "text-yellow-400";
      case "purple": return "text-purple-400";
      case "gray": return "text-gray-400";
      default: return "text-white";
    }
  };

  const getButtonColorClass = (cor) => {
    switch(cor) {
      case "blue": return "bg-blue-600 hover:bg-blue-700";
      case "green": return "bg-green-600 hover:bg-green-700";
      case "indigo": return "bg-indigo-600 hover:bg-indigo-700";
      case "cyan": return "bg-cyan-600 hover:bg-cyan-700";
      case "orange": return "bg-orange-600 hover:bg-orange-700";
      case "yellow": return "bg-yellow-600 hover:bg-yellow-700";
      case "purple": return "bg-purple-600 hover:bg-purple-700";
      case "gray": return "bg-gray-600 hover:bg-gray-700";
      default: return "bg-blue-600 hover:bg-blue-700";
    }
  };

  const getModalHeaderClass = (cor) => {
    switch(cor) {
      case "blue": return "bg-gradient-to-r from-blue-600/20 to-purple-600/20";
      case "green": return "bg-gradient-to-r from-green-600/20 to-purple-600/20";
      case "indigo": return "bg-gradient-to-r from-indigo-600/20 to-purple-600/20";
      case "cyan": return "bg-gradient-to-r from-cyan-600/20 to-purple-600/20";
      case "orange": return "bg-gradient-to-r from-orange-600/20 to-purple-600/20";
      case "yellow": return "bg-gradient-to-r from-yellow-600/20 to-purple-600/20";
      case "purple": return "bg-gradient-to-r from-purple-600/20 to-pink-600/20";
      case "gray": return "bg-gradient-to-r from-gray-600/20 to-purple-600/20";
      default: return "bg-gradient-to-r from-blue-600/20 to-purple-600/20";
    }
  };

  if (redirecting) {
    return (
      <Layout title="Cadastrar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30">
            <div className="relative mb-4"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div><div className="absolute inset-0 flex items-center justify-center"><CheckCircle className="w-8 h-8 text-green-500 animate-pulse" /></div></div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Fornecedor cadastrado.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const tipoInfo = tiposFornecedorConfig.find(t => t.value === tipoFornecedor);
  const valorTotalItens = itens.reduce((sum, item) => sum + (item.valorTotal || item.valor || item.valorMensal || item.valorProjeto || item.valorAquisicao || 0), 0);
  const valorTotalContratos = contratos.reduce((sum, c) => sum + (c.valor || 0), 0);
  const valorTotalGeral = valorTotalItens + valorTotalContratos;

  // Renderização do campo específico baseado no tipo
  const renderCampoEspecifico = (campo) => {
    if (campo.type === 'select') {
      return (
        <select
          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500"
          value={novoItem[campo.name] || ''}
          onChange={(e) => setNovoItem({...novoItem, [campo.name]: e.target.value})}
        >
          <option value="">Selecione</option>
          {campo.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    } else if (campo.type === 'textarea') {
      return (
        <textarea
          rows="3"
          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none focus:ring-2 focus:ring-blue-500"
          value={novoItem[campo.name] || ''}
          onChange={(e) => setNovoItem({...novoItem, [campo.name]: e.target.value})}
          placeholder={campo.placeholder}
        />
      );
    } else if (campo.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            checked={novoItem[campo.name] || false}
            onChange={(e) => setNovoItem({...novoItem, [campo.name]: e.target.checked})}
          />
          <span className="text-gray-300 text-sm">{campo.description}</span>
        </label>
      );
    } else if (campo.type === 'multiselect') {
      const valoresAtuais = novoItem[campo.name] || [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {campo.options.map(opt => (
              <label key={opt} className="flex items-center gap-1 cursor-pointer bg-gray-700/50 px-2 py-1 rounded-lg text-sm">
                <input
                  type="checkbox"
                  className="w-3 h-3 text-blue-600 rounded"
                  checked={valoresAtuais.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNovoItem({...novoItem, [campo.name]: [...valoresAtuais, opt]});
                    } else {
                      setNovoItem({...novoItem, [campo.name]: valoresAtuais.filter(v => v !== opt)});
                    }
                  }}
                />
                <span className="text-gray-300">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <input
          type={campo.type}
          step={campo.type === 'number' ? "0.01" : undefined}
          min={campo.min}
          disabled={campo.disabled}
          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500"
          value={novoItem[campo.name] || ''}
          onChange={(e) => {
            let value = campo.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            setNovoItem({...novoItem, [campo.name]: value});
            // Auto-calcular valor total para abastecimento
            if (tipoFornecedor === "abastecimento" && campo.name === "quantidade" && novoItem.precoLitro) {
              setNovoItem(prev => ({...prev, valorTotal: (value || 0) * (prev.precoLitro || 0)}));
            }
            if (tipoFornecedor === "abastecimento" && campo.name === "precoLitro" && novoItem.quantidade) {
              setNovoItem(prev => ({...prev, valorTotal: (prev.quantidade || 0) * (value || 0)}));
            }
          }}
          placeholder={campo.placeholder}
        />
      );
    }
  };

  return (
    <Layout title="Cadastrar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"} text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto pb-8">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Truck className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-xl font-bold text-white">Cadastrar Fornecedor</h2>
                <p className="text-sm text-gray-400">Registo completo com base na natureza do serviço/produto</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Seção Empresa */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</h3>
              {isTecnico() ? (
                <div>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white cursor-not-allowed" value={userEmpresaNome || "Empresa vinculada"} disabled />
                  <input type="hidden" name="empresaId" value={formData.empresaId} />
                  <p className="text-xs text-gray-400 mt-1">Você está vinculado a esta empresa. Não é possível alterar.</p>
                </div>
              ) : (
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500" value={formData.empresaId} onChange={(e) => setFormData({...formData, empresaId: e.target.value})} required>
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(emp => (<option key={emp._id} value={emp._id}>{emp.nome}</option>))}
                </select>
              )}
            </div>

            {/* Dados do Fornecedor */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Truck className="w-4 h-4" /> Dados do Fornecedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Nome / Razão Social *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">NIF *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label><input type="tel" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Email</label><input type="email" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Pessoa de Contacto</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.contato} onChange={(e) => setFormData({...formData, contato: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Endereço</label><textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} /></div>
              </div>
            </div>

            {/* Tipo de Fornecedor - Grid com 3 colunas */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Tipo de Fornecedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tiposFornecedorConfig.map(tipo => {
                  const Icon = tipo.icon;
                  const isSelected = tipoFornecedor === tipo.value;
                  const borderClass = getBorderClass(tipo.cor, isSelected);
                  const iconBgClass = getIconBgClass(tipo.cor, isSelected);
                  const textClass = getTextClass(tipo.cor, isSelected);
                  
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => {
                        setTipoFornecedor(tipo.value);
                        setItens([]);
                        setContratos([]);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${borderClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${iconBgClass}`}>
                          <Icon size={20} className="text-white" />
                        </div>
                        <div>
                          <p className={`font-medium ${textClass}`}>{tipo.label}</p>
                          <p className="text-xs text-gray-400">{tipo.descricao}</p>
                          <p className="text-xs text-green-400 mt-1">🎯 {tipo.modulo}</p>
                          <p className="text-xs text-blue-400">{tipo.natureza}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulário Específico do Tipo */}
            {tipoFornecedor && tipoInfo && (
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-yellow-400 flex items-center gap-2">
                    {React.createElement(tipoInfo.icon, { className: "w-5 h-5" })}
                    {tipoInfo.label === "Mercadoria/Produto" ? "Adicionar Produto" : 
                     tipoInfo.label === "Renda (Aluguer)" ? "Adicionar Contrato de Arrendamento" :
                     tipoInfo.label === "Serviço Profissional" ? "Adicionar Serviço" :
                     tipoInfo.label === "Internet/Telecom" ? "Adicionar Contrato" :
                     tipoInfo.label === "Manutenção" ? "Registar Serviço" :
                     tipoInfo.label === "Abastecimento" ? "Registar Abastecimento" :
                     tipoInfo.label === "Equipamento" ? "Adicionar Equipamento" : "Adicionar Item"}
                  </h3>
                  <button type="button" onClick={abrirModalItem} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-1">
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                
                {itens.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {itens.map(item => (
                        <div key={item.id} className="bg-gray-700/50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-white font-medium">{item.produto || item.descricao || item.nome || item.tipoImovel || "Item"}</p>
                              <div className="flex flex-wrap gap-3 text-xs mt-1">
                                <span className="text-green-400">{item.valorTotal?.toLocaleString()} Kz</span>
                                {item.quantidade && <span className="text-gray-400">📦 {item.quantidade} {item.unidadeMedida}</span>}
                                {item.tipoImovel && <span className="text-blue-400">🏠 {item.tipoImovel}</span>}
                                {item.area && <span className="text-gray-400">📐 {item.area}m²</span>}
                                {item.tipoCombustivel && <span className="text-yellow-400">⛽ {item.tipoCombustivel}</span>}
                                {item.kmAtual && <span className="text-gray-400">📊 {item.kmAtual} km</span>}
                              </div>
                              {item.marca && <p className="text-xs text-purple-400 mt-1">{item.marca} {item.modelo}</p>}
                              {item.numeroSerie && <p className="text-xs text-gray-500">S/N: {item.numeroSerie}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => abrirModalItem(item)} className="p-1 text-yellow-400"><Edit size={16} /></button>
                              <button onClick={() => removerItem(item.id)} className="p-1 text-red-400"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-gray-600 flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-green-400 font-bold">{valorTotalItens.toLocaleString()} Kz</span>
                    </div>
                  </div>
                )}
                
                {itens.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">
                    Clique em "Adicionar" para registrar o primeiro {tipoInfo.label === "Mercadoria/Produto" ? "produto" : 
                     tipoInfo.label === "Renda (Aluguer)" ? "contrato de arrendamento" :
                     tipoInfo.label === "Serviço Profissional" ? "serviço" :
                     tipoInfo.label === "Internet/Telecom" ? "contrato" :
                     tipoInfo.label === "Manutenção" ? "serviço de manutenção" :
                     tipoInfo.label === "Abastecimento" ? "abastecimento" :
                     tipoInfo.label === "Equipamento" ? "equipamento" : "item"}
                  </p>
                )}
              </div>
            )}

            {/* CONTRATOS - Para serviços recorrentes */}
            {tipoFornecedor && (tipoFornecedor === "renda" || tipoFornecedor === "internet" || tipoFornecedor === "servicoProfissional") && (
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-purple-400 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Contratos e Pagamentos Recorrentes
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Configure os contratos para geração automática de pagamentos
                </p>
                
                {contratos.length > 0 && (
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {contratos.map(contrato => (
                      <div key={contrato.id} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-medium">{contrato.descricao}</p>
                            <p className="text-xs text-gray-400">{new Date(contrato.dataInicio).toLocaleDateString('pt-PT')} - {new Date(contrato.dataFim).toLocaleDateString('pt-PT')}</p>
                            <p className="text-xs text-purple-400">{contrato.modalidadePagamento} • Pagamento dia {contrato.diaPagamento}</p>
                            <p className="text-xs text-green-400 mt-1">Valor: {contrato.valor?.toLocaleString()} Kz/mês</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => abrirModalContrato(contrato)} className="p-1 text-yellow-400"><Edit size={16} /></button>
                            <button onClick={() => removerContrato(contrato.id)} className="p-1 text-red-400"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-600 flex justify-between">
                      <span className="text-gray-400">Compromisso Mensal Total:</span>
                      <span className="text-purple-400 font-bold">{valorTotalContratos.toLocaleString()} Kz</span>
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={abrirModalContrato}
                  className="w-full py-2 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-purple-400 hover:border-purple-500 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Adicionar Contrato
                </button>
              </div>
            )}

            {/* Configuração Fiscal */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Percent className="w-4 h-4" /> Configuração Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Regime de Tributação</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.regimeTributacao} onChange={(e) => setFormData({...formData, regimeTributacao: e.target.value})}><option value="">Selecione</option><option value="Regime Geral">Regime Geral</option><option value="Regime Simplificado">Regime Simplificado</option><option value="Regime de IVA com Exclusão">Regime de IVA com Exclusão</option><option value="Regime de IVA com Inclusão">Regime de IVA com Inclusão</option></select></div>
                <div className="flex items-center gap-4 mt-6"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.fiscal.suportaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, suportaIVA: e.target.checked}})} className="w-4 h-4 text-blue-600 rounded" /><span className="text-gray-300">Suporta IVA</span></label><label className="flex items-center gap-2"><input type="checkbox" checked={formData.fiscal.retencaoFonte} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, retencaoFonte: e.target.checked}})} className="w-4 h-4 text-yellow-600 rounded" /><span className="text-gray-300">Retenção na Fonte</span></label></div>
                {formData.fiscal.suportaIVA && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label><input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaIVA: parseFloat(e.target.value)}})} /></div>)}
                {formData.fiscal.retencaoFonte && (<><div><label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Retenção</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.tipoRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, tipoRetencao: e.target.value}})}><option value="">Selecione</option><option value="Renda">Renda</option><option value="Serviços">Serviços</option><option value="Outros">Outros</option></select></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label><input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaRetencao: parseFloat(e.target.value)}})} /><p className="text-xs text-gray-400 mt-1">Serviços: 6.5% | Renda: 15% | Outros: conforme legislação</p></div></>)}
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4" /> Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Banco</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.banco} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, banco: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.iban} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, iban: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">SWIFT/BIC</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.swift} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, swift: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento Padrão</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.formaPagamento} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, formaPagamento: e.target.value}})}><option value="Transferência">Transferência Bancária</option><option value="Dinheiro">Dinheiro</option><option value="Cheque">Cheque</option><option value="POS">POS/Terminal</option></select></div>
              </div>
            </div>

            {/* Resumo Financeiro */}
            {(valorTotalItens > 0 || valorTotalContratos > 0) && (
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/30">
                <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Resumo Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Total em Itens</p>
                    <p className="text-green-400 font-bold text-xl">{valorTotalItens.toLocaleString()} Kz</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Contratos (mensal)</p>
                    <p className="text-purple-400 font-bold text-xl">{valorTotalContratos.toLocaleString()} Kz</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Compromisso Total</p>
                    <p className="text-yellow-400 font-bold text-xl">{valorTotalGeral.toLocaleString()} Kz</p>
                  </div>
                </div>
              </div>
            )}

            {/* Observações e Status */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Informações Adicionais</h3>
              <div className="grid grid-cols-1 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Observações Gerais</label><textarea rows="3" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" placeholder="Informações relevantes sobre o fornecedor..." value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Status</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option><option value="Bloqueado">Bloqueado</option></select></div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading || redirecting} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><Save className="w-5 h-5" /> Cadastrar Fornecedor</>}
              </button>
              <button type="button" onClick={() => navigate("/fornecedores")} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL DE ITEM - Formulário Inteligente */}
      {modalItemOpen && tipoInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className={`${getModalHeaderClass(tipoInfo.cor)} px-6 py-4 border-b border-gray-700 sticky top-0`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`${getIconBgClass(tipoInfo.cor, true)} p-2 rounded-lg`}>
                    {React.createElement(tipoInfo.icon, { className: "w-5 h-5 text-white" })}
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {editandoItem ? "Editar" : "Adicionar"} {tipoInfo.label}
                  </h3>
                </div>
                <button onClick={() => setModalItemOpen(false)} className="p-1 rounded-lg hover:bg-gray-700"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {getCamposItem().map(campo => (
                <div key={campo.name} className={campo.type === 'multiselect' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {campo.label} {campo.required && <span className="text-red-400">*</span>}
                    {campo.description && <span className="text-xs text-gray-500 ml-2">({campo.description})</span>}
                  </label>
                  {renderCampoEspecifico(campo)}
                </div>
              ))}
              {tipoFornecedor === "mercadoria" && novoItem.quantidade > 0 && novoItem.precoCompra > 0 && (
                <div className="bg-blue-600/10 rounded-lg p-3 mt-2">
                  <p className="text-blue-400 text-sm flex items-center gap-2"><Calculator size={14} /> Resumo</p>
                  <div className="flex justify-between mt-2"><span className="text-gray-400">Valor Total da Compra:</span><span className="text-green-400 font-bold">{(novoItem.quantidade * novoItem.precoCompra).toLocaleString()} Kz</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">IVA ({novoItem.taxaIVA || formData.fiscal.taxaIVA}%):</span><span className="text-blue-400">{((novoItem.quantidade * novoItem.precoCompra) * (novoItem.taxaIVA || formData.fiscal.taxaIVA) / 100).toLocaleString()} Kz</span></div>
                </div>
              )}
              {tipoFornecedor === "abastecimento" && novoItem.quantidade > 0 && novoItem.precoLitro > 0 && (
                <div className="bg-blue-600/10 rounded-lg p-3 mt-2">
                  <p className="text-blue-400 text-sm flex items-center gap-2"><Calculator size={14} /> Resumo do Abastecimento</p>
                  <div className="flex justify-between mt-2"><span className="text-gray-400">Valor Total:</span><span className="text-green-400 font-bold">{(novoItem.quantidade * novoItem.precoLitro).toLocaleString()} Kz</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Preço médio por Litro:</span><span className="text-blue-400">{novoItem.precoLitro.toLocaleString()} Kz/L</span></div>
                </div>
              )}
              {tipoFornecedor === "renda" && novoItem.valorMensal > 0 && (
                <div className="bg-green-600/10 rounded-lg p-3 mt-2">
                  <p className="text-green-400 text-sm flex items-center gap-2"><Calculator size={14} /> Resumo do Arrendamento</p>
                  <div className="flex justify-between"><span className="text-gray-400">Valor Mensal:</span><span className="text-green-400 font-bold">{novoItem.valorMensal.toLocaleString()} Kz</span></div>
                  {novoItem.valorCondominio > 0 && <div className="flex justify-between"><span className="text-gray-400">Condomínio:</span><span className="text-blue-400">{novoItem.valorCondominio.toLocaleString()} Kz</span></div>}
                  <div className="flex justify-between pt-1 border-t border-green-600/30"><span className="text-gray-400">Total Mensal:</span><span className="text-yellow-400 font-bold">{(novoItem.valorMensal + (novoItem.valorCondominio || 0)).toLocaleString()} Kz</span></div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button onClick={() => setModalItemOpen(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button>
              <button onClick={salvarItem} className={`px-4 py-2 rounded-lg ${getButtonColorClass(tipoInfo.cor)}`}>{editandoItem ? "Atualizar" : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRATO */}
      {showContratoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700 sticky top-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3"><div className="bg-purple-600 p-2 rounded-lg"><Calendar className="w-5 h-5 text-white" /></div><h3 className="text-xl font-bold text-white">{editandoContrato ? "Editar" : "Adicionar"} Contrato</h3></div>
                <button onClick={() => setShowContratoModal(false)} className="p-1 rounded-lg hover:bg-gray-700"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Descrição do Contrato *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="Ex: Aluguer de Escritório, Internet Fibra, Consultoria Mensal" value={novoContrato.descricao} onChange={(e) => setNovoContrato({...novoContrato, descricao: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Valor (Kz) *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="0,00" value={novoContrato.valor} onChange={(e) => setNovoContrato({...novoContrato, valor: formatarMoeda(e.target.value)})} /></div>
              
              {/* CORREÇÃO: usar novoContrato.valor diretamente, convertendo para string com segurança */}
              {novoContrato.valor && String(novoContrato.valor).replace(/\D/g, "") !== "" && (
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <p className="text-blue-400 text-sm flex items-center gap-2 mb-2"><Calculator size={14} /> Resumo Fiscal</p>
                  {(() => {
                    const valorStr = String(novoContrato.valor || "0");
                    const valor = parseFloat(valorStr.replace(/\D/g, "")) || 0;
                    const resumo = calcularResumoFiscal(valor);
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">Valor Bruto:</span><span className="text-white">{valor.toLocaleString()} Kz</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">IVA ({resumo.taxaIVA}%):</span><span className="text-blue-400">+ {resumo.iva.toLocaleString()} Kz</span></div>
                        {resumo.retencao > 0 && <div className="flex justify-between"><span className="text-gray-400">Retenção ({resumo.taxaRetencao}%):</span><span className="text-red-400">- {resumo.retencao.toLocaleString()} Kz</span></div>}
                        <div className="flex justify-between pt-2 border-t border-gray-600 font-bold"><span className="text-gray-400">Valor Líquido:</span><span className="text-green-400">{resumo.valorLiquido.toLocaleString()} Kz</span></div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-300 mb-2">Data Início *</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.dataInicio} onChange={(e) => setNovoContrato({...novoContrato, dataInicio: e.target.value})} /></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Data Fim *</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.dataFim} onChange={(e) => setNovoContrato({...novoContrato, dataFim: e.target.value})} /></div></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Modalidade de Pagamento *</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.modalidadePagamento} onChange={(e) => setNovoContrato({...novoContrato, modalidadePagamento: e.target.value})}><option value="Diário">Diário</option><option value="Semanal">Semanal</option><option value="Quinzenal">Quinzenal</option><option value="Mensal">Mensal</option><option value="Bimestral">Bimestral</option><option value="Trimestral">Trimestral</option><option value="Semestral">Semestral</option><option value="Anual">Anual</option></select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Vencimento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaVencimento} onChange={(e) => setNovoContrato({...novoContrato, diaVencimento: parseInt(e.target.value)})} /></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Pagamento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaPagamento} onChange={(e) => setNovoContrato({...novoContrato, diaPagamento: parseInt(e.target.value)})} /></div></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Aviso Antecedência (dias)</label><input type="number" min="0" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.avisoAntecedencia} onChange={(e) => setNovoContrato({...novoContrato, avisoAntecedencia: parseInt(e.target.value)})} /><p className="text-xs text-gray-400 mt-1">Dias de antecedência para renovação/aviso</p></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Observações do Contrato</label><textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" placeholder="Cláusulas especiais, condições de renovação..." value={novoContrato.observacoes} onChange={(e) => setNovoContrato({...novoContrato, observacoes: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3"><button onClick={() => setShowContratoModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button><button onClick={salvarContrato} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">{editandoContrato ? "Atualizar" : "Adicionar Contrato"}</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default CadastroFornecedor;