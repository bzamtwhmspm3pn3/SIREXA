// src/pages/Fornecedores/CadastroFornecedor.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { 
  Save, ArrowLeft, Truck, Building2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Hash, CheckCircle, AlertCircle, 
  Loader2, Plus, X, Calendar, DollarSign, Award, FileText,
  Package, Wrench, Home, Globe, TrendingUp, Edit,Trash2 
} from "lucide-react";

const CadastroFornecedor = () => {
  const { 
    isTecnico, 
    isGestor,
    user,
    empresaId: userEmpresaId, 
    empresaNome: userEmpresaNome,
    empresaNif: userEmpresaNif,
    role
  } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  
  // ============================================
  // TIPO DE FORNECEDOR (SELECT)
  // ============================================
  const [tipoFornecedor, setTipoFornecedor] = useState("");
  
  const tiposFornecedor = [
    { value: "mercadoria", label: "📦 Mercadoria / Produto", icon: Package, descricao: "Produtos físicos para stock" },
    { value: "servico", label: "🛠️ Serviço Geral", icon: Wrench, descricao: "Prestação de serviços" },
    { value: "renda", label: "🏠 Renda / Aluguer", icon: Home, descricao: "Arrendamento de imóveis ou equipamentos" },
    { value: "internet", label: "🌐 Internet / Telecom", icon: Globe, descricao: "Serviços de comunicação" },
    { value: "outro", label: "📝 Outro", icon: FileText, descricao: "Outros tipos de serviços" }
  ];
  
  // ============================================
  // FORMULÁRIO PARA MERCADORIA (PRODUTO)
  // ============================================
  const [produtoData, setProdutoData] = useState({
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
    armazem: "Principal",
    numeroLote: "",
    taxaIVA: 14,
    observacoes: ""
  });
  
  const unidadesMedida = [
    "Unidade", "KG", "Litro", "Metro", "Pacote", "Caixa", 
    "Palete", "Grama", "Mililitro", "Centímetro", "Par", 
    "Dúzia", "Cento", "Milheiro", "Rolo", "Fardo"
  ];
  
  const categorias = [
    "Geral", "Alimentar", "Bebidas", "Limpeza", "Informática", 
    "Escritório", "Vestuário", "Construção", "Manutenção"
  ];
  
  // ============================================
  // FORMULÁRIO PARA CONTRATO (SERVIÇO/RENDA/INTERNET)
  // ============================================
  const [contratos, setContratos] = useState([]);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [editandoContratoIndex, setEditandoContratoIndex] = useState(null);
  const [novoContrato, setNovoContrato] = useState({
    descricao: "",
    valor: "",
    dataInicio: "",
    dataFim: "",
    modalidadePagamento: "Mensal",
    diaVencimento: 5,
    diaPagamento: 15,
    avisoAntecedencia: 5
  });
  
  // ============================================
  // DADOS BÁSICOS DO FORNECEDOR
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
  // STATE PARA NOME DA EMPRESA DO TÉCNICO (APENAS PARA TÉCNICOS)
  // ============================================
  const [empresaNomeTecnico, setEmpresaNomeTecnico] = useState("");

  // ============================================
  // BUSCAR EMPRESA DO TÉCNICO (APENAS SE FOR TÉCNICO)
  // ============================================
  useEffect(() => {
    // SÓ EXECUTAR SE FOR TÉCNICO E TIVER ID DA EMPRESA
    if (role === 'tecnico' && userEmpresaId && !empresaNomeTecnico) {
      const buscarEmpresaTecnico = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${userEmpresaId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            const nome = data.nome || data.dados?.nome || "Empresa";
            setEmpresaNomeTecnico(nome);
            console.log("Empresa do técnico carregada:", nome);
          } else {
            setEmpresaNomeTecnico("Empresa");
          }
        } catch (error) {
          console.error("Erro ao buscar empresa:", error);
          setEmpresaNomeTecnico("Empresa");
        }
      };
      buscarEmpresaTecnico();
    }
  }, [role, userEmpresaId, empresaNomeTecnico]);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================
  useEffect(() => {
    // Para técnico: definir empresaId automaticamente
    if (role === 'tecnico' && userEmpresaId) {
      setFormData(prev => ({ ...prev, empresaId: userEmpresaId }));
    }
  }, [role, userEmpresaId]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    // Para técnico, não carregar lista de empresas
    if (role === 'tecnico') return;
    
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
  // FUNÇÕES PARA CONTRATOS
  // ============================================
  const abrirModalContrato = (index = null) => {
    if (index !== null && contratos[index]) {
      const contrato = contratos[index];
      setEditandoContratoIndex(index);
      setNovoContrato({
        descricao: contrato.descricao || "",
        valor: contrato.valor || "",
        dataInicio: contrato.dataInicio || "",
        dataFim: contrato.dataFim || "",
        modalidadePagamento: contrato.modalidadePagamento || "Mensal",
        diaVencimento: contrato.diaVencimento || 5,
        diaPagamento: contrato.diaPagamento || 15,
        avisoAntecedencia: contrato.avisoAntecedencia || 5
      });
    } else {
      setEditandoContratoIndex(null);
      setNovoContrato({
        descricao: "",
        valor: "",
        dataInicio: "",
        dataFim: "",
        modalidadePagamento: "Mensal",
        diaVencimento: 5,
        diaPagamento: 15,
        avisoAntecedencia: 5
      });
    }
    setShowContratoModal(true);
  };

  const salvarContrato = () => {
    if (!novoContrato.descricao || !novoContrato.valor || !novoContrato.dataInicio || !novoContrato.dataFim) {
      mostrarMensagem("Preencha todos os campos obrigatórios", "erro");
      return;
    }
    
    const valorNumerico = parseFloat(String(novoContrato.valor).replace(/\D/g, "")) || 0;
    
    const contratoData = {
      descricao: novoContrato.descricao,
      valor: valorNumerico,
      dataInicio: novoContrato.dataInicio,
      dataFim: novoContrato.dataFim,
      modalidadePagamento: novoContrato.modalidadePagamento,
      diaVencimento: novoContrato.diaVencimento,
      diaPagamento: novoContrato.diaPagamento,
      avisoAntecedencia: novoContrato.avisoAntecedencia
    };
    
    if (editandoContratoIndex !== null) {
      const novosContratos = [...contratos];
      novosContratos[editandoContratoIndex] = contratoData;
      setContratos(novosContratos);
      mostrarMensagem("Contrato atualizado!", "sucesso");
    } else {
      setContratos([...contratos, contratoData]);
      mostrarMensagem("Contrato adicionado!", "sucesso");
    }
    
    setShowContratoModal(false);
    setEditandoContratoIndex(null);
    setNovoContrato({
      descricao: "",
      valor: "",
      dataInicio: "",
      dataFim: "",
      modalidadePagamento: "Mensal",
      diaVencimento: 5,
      diaPagamento: 15,
      avisoAntecedencia: 5
    });
  };

  const removerContrato = (index) => {
    if (window.confirm("Tem certeza que deseja remover este contrato?")) {
      const novosContratos = [...contratos];
      novosContratos.splice(index, 1);
      setContratos(novosContratos);
      mostrarMensagem("Contrato removido!", "sucesso");
    }
  };

  // ============================================
  // SUBMIT
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.empresaId && !userEmpresaId) {
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
      tipoServico: tipoFornecedor,
      contratos: contratos
    };
    
    // Se for mercadoria, adicionar dados do produto
    if (tipoFornecedor === "mercadoria") {
      dadosEnvio.produtoInfo = produtoData;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/fornecedores", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok && (result.sucesso !== false || result._id)) {
        mostrarMensagem("✅ Fornecedor cadastrado com sucesso!", "sucesso");
        setRedirecting(true);
        setTimeout(() => navigate("/fornecedores"), 1500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao cadastrar fornecedor", "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
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

  const valorTotalContratos = contratos.reduce((sum, c) => sum + (c.valor || 0), 0);
  const tipoInfo = tiposFornecedor.find(t => t.value === tipoFornecedor);
  
  // Determinar se o usuário é técnico (baseado no role)
  const usuarioEhTecnico = role === 'tecnico';
  
  // Nome da empresa para exibição
  const nomeEmpresaExibicao = usuarioEhTecnico 
    ? (empresaNomeTecnico || userEmpresaNome || "Carregando empresa...")
    : empresas.find(e => e._id === formData.empresaId)?.nome || "";

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

      {/* MODAL DE CONTRATO */}
      {showContratoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700 sticky top-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg"><Calendar className="w-5 h-5 text-white" /></div>
                  <h3 className="text-xl font-bold text-white">{editandoContratoIndex !== null ? "Editar" : "Adicionar"} Contrato</h3>
                </div>
                <button onClick={() => setShowContratoModal(false)} className="p-1 rounded-lg hover:bg-gray-700"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição do Contrato *</label>
                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                  placeholder="Ex: Aluguer de Escritório, Internet Fibra" 
                  value={novoContrato.descricao} 
                  onChange={(e) => setNovoContrato({...novoContrato, descricao: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Valor (Kz) *</label>
                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                  placeholder="0,00" value={novoContrato.valor} 
                  onChange={(e) => setNovoContrato({...novoContrato, valor: formatarMoeda(e.target.value)})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Data Início *</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.dataInicio} onChange={(e) => setNovoContrato({...novoContrato, dataInicio: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Data Fim *</label><input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.dataFim} onChange={(e) => setNovoContrato({...novoContrato, dataFim: e.target.value})} /></div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Modalidade de Pagamento *</label>
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.modalidadePagamento} onChange={(e) => setNovoContrato({...novoContrato, modalidadePagamento: e.target.value})}>
                  <option value="Diário">Diário</option><option value="Semanal">Semanal</option><option value="Quinzenal">Quinzenal</option>
                  <option value="Mensal">Mensal</option><option value="Bimestral">Bimestral</option><option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option><option value="Anual">Anual</option><option value="Único">Único</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Vencimento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaVencimento} onChange={(e) => setNovoContrato({...novoContrato, diaVencimento: parseInt(e.target.value)})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Pagamento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaPagamento} onChange={(e) => setNovoContrato({...novoContrato, diaPagamento: parseInt(e.target.value)})} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowContratoModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button>
              <button onClick={salvarContrato} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">{editandoContratoIndex !== null ? "Atualizar" : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto pb-8">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Truck className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-xl font-bold text-white">Cadastrar Fornecedor</h2>
                <p className="text-sm text-gray-400">Preencha os dados do fornecedor</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Empresa - CORRIGIDA */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</h3>
              {usuarioEhTecnico ? (
                <div>
                  <div className="w-full p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">
                      {nomeEmpresaExibicao}
                    </span>
                  </div>
                  <input type="hidden" name="empresaId" value={userEmpresaId} />
                  <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                    <CheckCircle size={12} className="inline" /> 
                    Você está vinculado a esta empresa como Técnico.
                  </p>
                </div>
              ) : (
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500" 
                  value={formData.empresaId} 
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})} 
                  required
                >
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

            {/* Tipo de Fornecedor - SELECT */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Tipo de Fornecedor</h3>
              <select 
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500"
                value={tipoFornecedor}
                onChange={(e) => setTipoFornecedor(e.target.value)}
                required
              >
                <option value="">Selecione o tipo de fornecedor</option>
                {tiposFornecedor.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
              {tipoInfo && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  {React.createElement(tipoInfo.icon, { size: 12, className: "text-blue-400" })}
                  {tipoInfo.descricao}
                </p>
              )}
            </div>

            {/* FORMULÁRIO DINÂMICO POR TIPO - MERCADORIA */}
            {tipoFornecedor === "mercadoria" && (
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-green-400" />
                  <h3 className="text-md font-semibold text-green-400">Informações do Produto</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Produto *</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.produto} onChange={(e) => setProdutoData({...produtoData, produto: e.target.value})} required />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Código de Barras</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.codigoBarras} onChange={(e) => setProdutoData({...produtoData, codigoBarras: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Código Interno</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.codigoInterno} onChange={(e) => setProdutoData({...produtoData, codigoInterno: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.categoria} onChange={(e) => setProdutoData({...produtoData, categoria: e.target.value})}>
                      {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Marca</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.marca} onChange={(e) => setProdutoData({...produtoData, marca: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Unidade de Medida</label>
                    <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.unidadeMedida} onChange={(e) => setProdutoData({...produtoData, unidadeMedida: e.target.value})}>
                      {unidadesMedida.map(um => <option key={um} value={um}>{um}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Compra (Kz) *</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.precoCompra} onChange={(e) => setProdutoData({...produtoData, precoCompra: parseFloat(e.target.value) || 0})} required />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Venda (Kz) *</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.precoVenda} onChange={(e) => setProdutoData({...produtoData, precoVenda: parseFloat(e.target.value) || 0})} required />
                    {produtoData.precoCompra > 0 && produtoData.precoVenda > 0 && (
                      <p className={`text-xs mt-1 ${produtoData.precoVenda >= produtoData.precoCompra ? 'text-green-400' : 'text-red-400'}`}>
                        Margem: {((produtoData.precoVenda - produtoData.precoCompra) / produtoData.precoCompra * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade Inicial</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.quantidade} onChange={(e) => setProdutoData({...produtoData, quantidade: parseInt(e.target.value) || 0})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade Mínima (Alerta)</label>
                    <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.quantidadeMinima} onChange={(e) => setProdutoData({...produtoData, quantidadeMinima: parseInt(e.target.value) || 5})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Data de Validade *</label>
                    <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.dataValidade} onChange={(e) => setProdutoData({...produtoData, dataValidade: e.target.value})} required />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Armazém / Localização</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.armazem} onChange={(e) => setProdutoData({...produtoData, armazem: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nº Lote</label>
                    <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.numeroLote} onChange={(e) => setProdutoData({...produtoData, numeroLote: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label>
                    <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                      value={produtoData.taxaIVA} onChange={(e) => setProdutoData({...produtoData, taxaIVA: parseFloat(e.target.value) || 14})} />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Observações do Produto</label>
                    <textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                      value={produtoData.observacoes} onChange={(e) => setProdutoData({...produtoData, observacoes: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {/* CONTRATOS - Para serviços, renda, internet, etc. */}
            {(tipoFornecedor === "servico" || tipoFornecedor === "renda" || tipoFornecedor === "internet" || tipoFornecedor === "outro") && (
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <h3 className="text-md font-semibold text-purple-400">Contratos / Serviços</h3>
                  </div>
                  <button type="button" onClick={() => abrirModalContrato()} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-1">
                    <Plus size={14} /> Adicionar Contrato
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3">Adicione contratos para gerar pagamentos automáticos</p>
                
                {contratos.length > 0 && (
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {contratos.map((contrato, index) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-medium">{contrato.descricao || "Contrato"}</p>
                            <p className="text-xs text-gray-400">{contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString('pt-PT') : '—'} - {contrato.dataFim ? new Date(contrato.dataFim).toLocaleDateString('pt-PT') : '—'}</p>
                            <p className="text-xs text-purple-400">{contrato.modalidadePagamento} • Pagamento dia {contrato.diaPagamento}</p>
                            <p className="text-xs text-green-400">Valor: {contrato.valor?.toLocaleString()} Kz</p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => abrirModalContrato(index)} className="p-1 text-yellow-400"><Edit size={16} /></button>
                            <button type="button" onClick={() => removerContrato(index)} className="p-1 text-red-400"><Trash2 size={16} /></button>
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
              </div>
            )}

            {/* Resumo Financeiro (apenas para contratos) */}
            {contratos.length > 0 && valorTotalContratos > 0 && (
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/30">
                <h3 className="text-md font-semibold text-blue-400 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Resumo Financeiro</h3>
                <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Compromisso Mensal com Contratos</p>
                  <p className="text-purple-400 font-bold text-xl">{valorTotalContratos.toLocaleString()} Kz</p>
                </div>
              </div>
            )}

            {/* Resumo do Produto (apenas para mercadoria) */}
            {tipoFornecedor === "mercadoria" && produtoData.produto && produtoData.precoCompra > 0 && (
              <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-xl p-4 border border-green-500/30">
                <h3 className="text-md font-semibold text-green-400 mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Resumo do Produto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-xs">Produto</p>
                    <p className="text-white font-medium text-sm">{produtoData.produto}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-xs">Stock Inicial</p>
                    <p className="text-white font-medium text-sm">{produtoData.quantidade} {produtoData.unidadeMedida}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-xs">Preço Compra</p>
                    <p className="text-green-400 font-medium text-sm">{produtoData.precoCompra.toLocaleString()} Kz</p>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-xs">Preço Venda</p>
                    <p className="text-blue-400 font-medium text-sm">{produtoData.precoVenda.toLocaleString()} Kz</p>
                  </div>
                </div>
              </div>
            )}

            {/* Configuração Fiscal */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Configuração Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Regime de Tributação</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.regimeTributacao} onChange={(e) => setFormData({...formData, regimeTributacao: e.target.value})}><option value="">Selecione</option><option value="Regime Geral">Regime Geral</option><option value="Regime Simplificado">Regime Simplificado</option><option value="Regime de IVA com Exclusão">Regime de IVA com Exclusão</option><option value="Regime de IVA com Inclusão">Regime de IVA com Inclusão</option></select></div>
                <div className="flex items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.fiscal.suportaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, suportaIVA: e.target.checked}})} className="w-4 h-4 text-blue-600 rounded" /><span className="text-gray-300">Suporta IVA</span></label><label className="flex items-center gap-2"><input type="checkbox" checked={formData.fiscal.retencaoFonte} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, retencaoFonte: e.target.checked}})} className="w-4 h-4 text-yellow-600 rounded" /><span className="text-gray-300">Retenção na Fonte</span></label></div>
                {formData.fiscal.suportaIVA && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label><input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaIVA: parseFloat(e.target.value)}})} /></div>)}
                {formData.fiscal.retencaoFonte && (<><div><label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Retenção</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.tipoRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, tipoRetencao: e.target.value}})}><option value="">Selecione</option><option value="Renda">Renda</option><option value="Serviços">Serviços</option><option value="Outros">Outros</option></select></div><div><label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label><input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaRetencao: parseFloat(e.target.value)}})} /></div></>)}
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Banco</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.banco} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, banco: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.iban} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, iban: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">SWIFT/BIC</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.swift} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, swift: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento Padrão</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.formaPagamento} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, formaPagamento: e.target.value}})}><option value="Transferência">Transferência Bancária</option><option value="Dinheiro">Dinheiro</option><option value="Cheque">Cheque</option><option value="POS">POS/Terminal</option></select></div>
              </div>
            </div>

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

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default CadastroFornecedor;