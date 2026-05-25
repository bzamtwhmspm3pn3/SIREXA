// src/pages/Fornecedores/EditarFornecedor.jsx - VERSÃO COMPLETA COM TIPOS E ITENS
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, Truck, Building2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Hash, CheckCircle, AlertCircle, 
  Loader2, Plus, X, Calendar, DollarSign, Edit, FileText,
  Eye, Package, Wrench, Fuel, Computer, Globe, Home, Percent,
  Wallet, Trash2, Calculator, TrendingUp
} from "lucide-react";

const EditarFornecedor = () => {
  const { isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState(null);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  const [tipoFornecedor, setTipoFornecedor] = useState("");
  const [itens, setItens] = useState([]);
  const [contratos, setContratos] = useState([]);
  
  // Modal states
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [novoItem, setNovoItem] = useState({});
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

  // Configuração dos tipos de fornecedor (mesma do Cadastro)
  const tiposFornecedorConfig = [
    { value: "mercadoria", label: "📦 Mercadoria/Produto", icon: Package, cor: "blue", modulo: "Stock", descricao: "Produtos físicos para revenda ou consumo", natureza: "Produto Físico" },
    { value: "renda", label: "🏠 Renda (Aluguer)", icon: Home, cor: "green", modulo: "Contratos", descricao: "Fornecedor de serviços de arrendamento", natureza: "Serviço Recorrente" },
    { value: "servicoProfissional", label: "👔 Serviço Profissional", icon: Briefcase, cor: "indigo", modulo: "Pagamentos", descricao: "Consultoria, advocacia, contabilidade", natureza: "Serviço por Hora/Projeto" },
    { value: "internet", label: "🌐 Internet/Telecom", icon: Globe, cor: "cyan", modulo: "Pagamentos", descricao: "Serviços de comunicação", natureza: "Serviço Recorrente" },
    { value: "manutencao", label: "🔧 Manutenção", icon: Wrench, cor: "orange", modulo: "Manutencoes", descricao: "Serviços de manutenção", natureza: "Serviço por Execução" },
    { value: "abastecimento", label: "⛽ Abastecimento", icon: Fuel, cor: "yellow", modulo: "Abastecimentos", descricao: "Combustível e lubrificantes", natureza: "Produto por Unidade" },
    { value: "equipamento", label: "🖥️ Equipamento", icon: Computer, cor: "purple", modulo: "Inventario", descricao: "Aquisição de equipamentos", natureza: "Ativo Fixo" },
    { value: "servicoGeral", label: "📝 Outro Serviço", icon: FileText, cor: "gray", modulo: "Pagamentos", descricao: "Outros tipos de serviço", natureza: "Serviço Geral" }
  ];

  // Campos para cada tipo (simplificados para edição)
  const getCamposItem = () => {
    const camposPorTipo = {
      mercadoria: [
        { name: "produto", label: "Nome do Produto", type: "text", required: true },
        { name: "quantidade", label: "Quantidade", type: "number", required: true },
        { name: "precoCompra", label: "Preço de Compra (Kz)", type: "number", required: true },
        { name: "precoVenda", label: "Preço de Venda (Kz)", type: "number", required: true },
        { name: "unidadeMedida", label: "Unidade", type: "select", options: ["Unidade", "KG", "Litro", "Caixa"] }
      ],
      manutencao: [
        { name: "descricao", label: "Descrição do Serviço", type: "text", required: true },
        { name: "valor", label: "Valor (Kz)", type: "number", required: true },
        { name: "dataAgendamento", label: "Data do Agendamento", type: "date" },
        { name: "viatura", label: "Viatura", type: "text" }
      ],
      abastecimento: [
        { name: "quantidade", label: "Quantidade (Litros)", type: "number", required: true },
        { name: "precoLitro", label: "Preço por Litro (Kz)", type: "number", required: true },
        { name: "viatura", label: "Viatura", type: "text", required: true },
        { name: "kmAtual", label: "Quilometragem", type: "number" },
        { name: "data", label: "Data", type: "date" }
      ],
      equipamento: [
        { name: "nome", label: "Nome do Equipamento", type: "text", required: true },
        { name: "valor", label: "Valor (Kz)", type: "number", required: true },
        { name: "marca", label: "Marca", type: "text" },
        { name: "modelo", label: "Modelo", type: "text" },
        { name: "numeroSerie", label: "Nº Série", type: "text" }
      ],
      renda: [
        { name: "tipoImovel", label: "Tipo de Imóvel", type: "text", required: true },
        { name: "localizacao", label: "Localização", type: "text", required: true },
        { name: "valorMensal", label: "Valor Mensal (Kz)", type: "number", required: true },
        { name: "area", label: "Área (m²)", type: "number" }
      ],
      servicoProfissional: [
        { name: "tipoServico", label: "Tipo de Serviço", type: "text", required: true },
        { name: "descricao", label: "Descrição", type: "textarea", required: true },
        { name: "valorProjeto", label: "Valor do Projeto (Kz)", type: "number", required: true },
        { name: "prazoExecucao", label: "Prazo (dias)", type: "number" }
      ],
      internet: [
        { name: "operadora", label: "Operadora", type: "text", required: true },
        { name: "plano", label: "Plano", type: "text", required: true },
        { name: "valorMensal", label: "Valor Mensal (Kz)", type: "number", required: true },
        { name: "velocidade", label: "Velocidade (Mbps)", type: "text" }
      ],
      servicoGeral: [
        { name: "descricao", label: "Descrição do Serviço", type: "textarea", required: true },
        { name: "valor", label: "Valor (Kz)", type: "number", required: true },
        { name: "dataExecucao", label: "Data de Execução", type: "date" }
      ]
    };
    return camposPorTipo[tipoFornecedor] || [];
  };

  const BASE_URL = "https://sirexa-api.onrender.com";
  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (isTecnico() && userEmpresaId) {
      setFormData(prev => ({ ...prev, empresaId: userEmpresaId }));
    }
  }, [isTecnico, userEmpresaId]);

  useEffect(() => {
    if (id) {
      carregarEmpresas();
      carregarFornecedor();
    } else {
      setError("ID do fornecedor não encontrado");
      setLoadingData(false);
    }
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) return;
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (response.status === 403) {
        setEmpresas([]);
        return;
      }
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  };

  const carregarFornecedor = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, { headers: getHeaders() });
      
      if (response.status === 404) {
        setError("Fornecedor não encontrado");
        setLoadingData(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set tipoFornecedor
      if (data.tipoFornecedor) {
        setTipoFornecedor(data.tipoFornecedor);
      }
      
      // Set itens
      if (data.itens && Array.isArray(data.itens)) {
        setItens(data.itens);
      }
      
      // Set contratos
      if (data.contratos && Array.isArray(data.contratos)) {
        setContratos(data.contratos);
      }
      
      setFormData({
        empresaId: data.empresaId || "",
        nome: data.nome || "",
        nif: data.nif || "",
        telefone: data.telefone || "",
        email: data.email || "",
        endereco: data.endereco || "",
        contato: data.contato || "",
        regimeTributacao: data.regimeTributacao || "",
        fiscal: data.fiscal || { suportaIVA: true, taxaIVA: 14, retencaoFonte: false, tipoRetencao: "", taxaRetencao: 0 },
        pagamento: data.pagamento || { banco: "", iban: "", swift: "", formaPagamento: "Transferência" },
        status: data.status || "Ativo",
        observacoes: data.observacoes || ""
      });
      
    } catch (error) {
      console.error("Erro:", error);
      setError(error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "";
    const numeros = String(valor).replace(/\D/g, "");
    if (!numeros) return "";
    return new Intl.NumberFormat('pt-AO').format(parseInt(numeros));
  };

  const calcularResumoFiscal = (valor) => {
    const taxaIVA = formData.fiscal.taxaIVA || 14;
    const taxaRetencao = formData.fiscal.taxaRetencao || 0;
    const iva = valor * (taxaIVA / 100);
    const retencao = valor * (taxaRetencao / 100);
    return { iva, retencao, valorLiquido: valor + iva - retencao };
  };

  // FUNÇÕES PARA ITENS
  const abrirModalItem = (item = null) => {
    setEditandoItem(item);
    if (item) {
      setNovoItem({ ...item });
    } else {
      const defaultItem = {};
      getCamposItem().forEach(campo => {
        defaultItem[campo.name] = campo.type === 'number' ? 0 : '';
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
    
    let valorTotal = novoItem.valor || novoItem.valorMensal || novoItem.valorProjeto || 0;
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
      mostrarMensagem("Item atualizado!", "sucesso");
    } else {
      setItens([...itens, itemCompleto]);
      mostrarMensagem("Item adicionado!", "sucesso");
    }
    setModalItemOpen(false);
    setEditandoItem(null);
    setNovoItem({});
  };

  const removerItem = (id) => {
    if (window.confirm("Tem certeza que deseja remover este item?")) {
      setItens(itens.filter(item => item.id !== id));
      mostrarMensagem("Item removido!", "sucesso");
    }
  };

  // FUNÇÕES PARA CONTRATOS
  const abrirModalContrato = (contrato = null) => {
    if (contrato) {
      setEditandoContrato(contrato);
      setNovoContrato({
        descricao: contrato.descricao || "",
        valor: contrato.valor || "",
        dataInicio: contrato.dataInicio ? contrato.dataInicio.split('T')[0] : "",
        dataFim: contrato.dataFim ? contrato.dataFim.split('T')[0] : "",
        modalidadePagamento: contrato.modalidadePagamento || "Mensal",
        diaVencimento: contrato.diaVencimento || 5,
        diaPagamento: contrato.diaPagamento || 15,
        avisoAntecedencia: contrato.avisoAntecedencia || 5,
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
      mostrarMensagem("Preencha todos os campos obrigatórios", "erro");
      return;
    }
    
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
  };

  const removerContrato = (id) => {
    if (window.confirm("Tem certeza que deseja remover este contrato?")) {
      setContratos(contratos.filter(c => c.id !== id));
      mostrarMensagem("Contrato removido!", "sucesso");
    }
  };

  // Funções de estilo (corrigidas)
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

    setLoading(true);
    
    const dadosEnvio = {
      ...formData,
      tipoFornecedor,
      itens: itens,
      contratos: contratos
    };

    try {
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      // CORREÇÃO: verificar se tem _id (igual ao cadastro)
      if (response.ok && result._id) {
        mostrarMensagem("✅ Fornecedor atualizado com sucesso!", "sucesso");
        setRedirecting(true);
        setTimeout(() => {
          navigate("/fornecedores");
        }, 1500);
      } else {
        const msgErro = result.mensagem || result.erro || "Erro ao atualizar fornecedor";
        mostrarMensagem(msgErro, "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  const tipoInfo = tiposFornecedorConfig.find(t => t.value === tipoFornecedor);
  const valorTotalItens = itens.reduce((sum, item) => sum + (item.valorTotal || item.valor || item.valorMensal || 0), 0);
  const valorTotalContratos = contratos.reduce((sum, c) => sum + (c.valor || 0), 0);

  if (error) {
    return (
      <Layout title="Editar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-10">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar fornecedor</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => navigate("/fornecedores")} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition">
            Voltar para lista
          </button>
        </div>
      </Layout>
    );
  }

  if (loadingData) {
    return (
      <Layout title="Editar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
          <p className="mt-4 text-gray-400">Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  if (redirecting) {
    return (
      <Layout title="Editar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Fornecedor atualizado.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"} text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      {isTecnico() && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3 mx-4 mb-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Eye size={18} />
            <span className="text-sm">Empresa: <strong>{userEmpresaNome}</strong></span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto pb-8 px-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Edit className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-xl font-bold text-white">Editar Fornecedor</h2>
                <p className="text-sm text-gray-400">Atualize os dados do fornecedor</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Empresa */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</h3>
              {isTecnico() ? (
                <div>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white cursor-not-allowed" value={userEmpresaNome || "Empresa vinculada"} disabled />
                  <input type="hidden" name="empresaId" value={formData.empresaId} />
                  <p className="text-xs text-blue-400 mt-1"><CheckCircle size={12} className="inline mr-1" /> Você está vinculado a esta empresa.</p>
                </div>
              ) : (
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.empresaId} onChange={(e) => setFormData({...formData, empresaId: e.target.value})} required>
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

            {/* Tipo de Fornecedor - Exibição (não editável) */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Tipo de Fornecedor</h3>
              {tipoFornecedor && tipoInfo ? (
                <div className={`p-4 rounded-xl border-2 ${getBorderClass(tipoInfo.cor, true)}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getIconBgClass(tipoInfo.cor, true)}`}>
                      {React.createElement(tipoInfo.icon, { size: 20, className: "text-white" })}
                    </div>
                    <div>
                      <p className={`font-medium ${getTextClass(tipoInfo.cor, true)}`}>{tipoInfo.label}</p>
                      <p className="text-xs text-gray-400">{tipoInfo.descricao}</p>
                      <p className="text-xs text-green-400 mt-1">🎯 {tipoInfo.modulo}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Tipo de fornecedor não definido</p>
              )}
            </div>

            {/* Itens do Tipo de Fornecedor */}
            {tipoFornecedor && (
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-yellow-400 flex items-center gap-2">
                    {tipoInfo && React.createElement(tipoInfo.icon, { className: "w-5 h-5" })}
                    {tipoInfo?.label === "Mercadoria/Produto" ? "Produtos" : 
                     tipoInfo?.label === "Renda (Aluguer)" ? "Contratos de Arrendamento" :
                     tipoInfo?.label === "Serviço Profissional" ? "Serviços" :
                     tipoInfo?.label === "Internet/Telecom" ? "Contratos" :
                     tipoInfo?.label === "Manutenção" ? "Serviços" :
                     tipoInfo?.label === "Abastecimento" ? "Abastecimentos" :
                     tipoInfo?.label === "Equipamento" ? "Equipamentos" : "Itens"}
                  </h3>
                  <button type="button" onClick={() => abrirModalItem()} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-1">
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
                              <p className="text-white font-medium">{item.produto || item.descricao || item.nome || "Item"}</p>
                              <div className="flex flex-wrap gap-3 text-xs mt-1">
                                <span className="text-green-400">{item.valorTotal?.toLocaleString()} Kz</span>
                                {item.quantidade && <span className="text-gray-400">📦 {item.quantidade}</span>}
                                {item.tipoCombustivel && <span className="text-yellow-400">⛽ {item.tipoCombustivel}</span>}
                              </div>
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
                    Clique em "Adicionar" para registrar itens
                  </p>
                )}
              </div>
            )}

            {/* Contratos */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-purple-400 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Contratos</h3>
              <p className="text-xs text-gray-400 mb-3">Adicione contratos para gerar pagamentos automáticos</p>
              
              {contratos.length > 0 && (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {contratos.map(contrato => (
                    <div key={contrato.id} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium">{contrato.descricao}</p>
                          <p className="text-xs text-gray-400">{contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString('pt-PT') : '—'} - {contrato.dataFim ? new Date(contrato.dataFim).toLocaleDateString('pt-PT') : '—'}</p>
                          <p className="text-xs text-purple-400">{contrato.modalidadePagamento} • Pagamento dia {contrato.diaPagamento}</p>
                          <p className="text-xs text-green-400">Valor: {contrato.valor?.toLocaleString()} Kz</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => abrirModalContrato(contrato)} className="p-1 text-yellow-400"><Edit size={16} /></button>
                          <button type="button" onClick={() => removerContrato(contrato.id)} className="p-1 text-red-400"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-600 flex justify-between">
                    <span className="text-gray-400">Total Mensal:</span>
                    <span className="text-purple-400 font-bold">{valorTotalContratos.toLocaleString()} Kz</span>
                  </div>
                </div>
              )}
              
              <button type="button" onClick={() => abrirModalContrato()} className="w-full py-2 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-purple-400 hover:border-purple-500 transition-all duration-200 flex items-center justify-center gap-2">
                <Plus size={18} /> Adicionar Contrato
              </button>
            </div>

            {/* Resumo Financeiro */}
            {(valorTotalItens > 0 || valorTotalContratos > 0) && (
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/30">
                <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Resumo Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Total em Itens</p>
                    <p className="text-green-400 font-bold text-xl">{valorTotalItens.toLocaleString()} Kz</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Total em Contratos</p>
                    <p className="text-purple-400 font-bold text-xl">{valorTotalContratos.toLocaleString()} Kz</p>
                  </div>
                </div>
              </div>
            )}

            {/* Configuração Fiscal */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Percent className="w-4 h-4" /> Configuração Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Regime de Tributação</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.regimeTributacao} onChange={(e) => setFormData({...formData, regimeTributacao: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Regime Geral">Regime Geral</option>
                    <option value="Regime Simplificado">Regime Simplificado</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.fiscal.suportaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, suportaIVA: e.target.checked}})} />
                    <span className="text-gray-300">Suporta IVA</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.fiscal.retencaoFonte} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, retencaoFonte: e.target.checked}})} />
                    <span className="text-gray-300">Retenção na Fonte</span>
                  </label>
                </div>
                {formData.fiscal.suportaIVA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaIVA: parseFloat(e.target.value)}})} />
                  </div>
                )}
                {formData.fiscal.retencaoFonte && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Retenção</label>
                      <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.tipoRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, tipoRetencao: e.target.value}})}>
                        <option value="">Selecione</option>
                        <option value="Renda">Renda</option>
                        <option value="Serviços">Serviços</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label>
                      <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaRetencao: parseFloat(e.target.value)}})} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4" /> Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Banco</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.banco} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, banco: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.iban} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, iban: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.formaPagamento} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, formaPagamento: e.target.value}})}><option value="Transferência">Transferência</option><option value="Dinheiro">Dinheiro</option><option value="Cheque">Cheque</option></select></div>
              </div>
            </div>

            {/* Observações e Status */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Informações Adicionais</h3>
              <div className="grid grid-cols-1 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Observações</label><textarea rows="3" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Status</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option><option value="Bloqueado">Bloqueado</option></select></div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading || redirecting} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : <><Save className="w-5 h-5" /> Salvar Alterações</>}
              </button>
              <button type="button" onClick={() => navigate("/fornecedores")} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL DE ITEM */}
      {modalItemOpen && tipoInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700 sticky top-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg">
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
                <div key={campo.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {campo.label} {campo.required && <span className="text-red-400">*</span>}
                  </label>
                  {campo.type === 'select' ? (
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoItem[campo.name] || ''} onChange={(e) => setNovoItem({...novoItem, [campo.name]: e.target.value})}>
                      <option value="">Selecione</option>
                      {campo.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : campo.type === 'textarea' ? (
                    <textarea rows="3" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={novoItem[campo.name] || ''} onChange={(e) => setNovoItem({...novoItem, [campo.name]: e.target.value})} />
                  ) : (
                    <input type={campo.type} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoItem[campo.name] || ''} onChange={(e) => {
                      let value = campo.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                      setNovoItem({...novoItem, [campo.name]: value});
                    }} />
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button onClick={() => setModalItemOpen(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button>
              <button onClick={salvarItem} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">{editandoItem ? "Atualizar" : "Adicionar"}</button>
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
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Descrição do Contrato *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="Ex: Aluguer de Escritório" value={novoContrato.descricao} onChange={(e) => setNovoContrato({...novoContrato, descricao: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Valor (Kz) *</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="0,00" value={novoContrato.valor} onChange={(e) => setNovoContrato({...novoContrato, valor: formatarMoeda(e.target.value)})} /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Data Início *</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.dataInicio} onChange={(e) => setNovoContrato({...novoContrato, dataInicio: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Data Fim *</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.dataFim} onChange={(e) => setNovoContrato({...novoContrato, dataFim: e.target.value})} /></div>
              </div>
              
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Modalidade de Pagamento *</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.modalidadePagamento} onChange={(e) => setNovoContrato({...novoContrato, modalidadePagamento: e.target.value})}><option value="Mensal">Mensal</option><option value="Trimestral">Trimestral</option><option value="Semestral">Semestral</option><option value="Anual">Anual</option></select></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Vencimento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaVencimento} onChange={(e) => setNovoContrato({...novoContrato, diaVencimento: parseInt(e.target.value)})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Pagamento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaPagamento} onChange={(e) => setNovoContrato({...novoContrato, diaPagamento: parseInt(e.target.value)})} /></div>
              </div>
              
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Observações</label><textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={novoContrato.observacoes} onChange={(e) => setNovoContrato({...novoContrato, observacoes: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowContratoModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button>
              <button onClick={salvarContrato} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">{editandoContrato ? "Atualizar" : "Adicionar"}</button>
            </div>
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

export default EditarFornecedor;