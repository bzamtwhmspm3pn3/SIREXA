// src/pages/Fornecedores/EditarFornecedor.jsx - VERSÃO FINAL CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, Truck, Building2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Hash, CheckCircle, AlertCircle, 
  Loader2, Plus, X, Calendar, DollarSign, Edit, FileText,
  Eye
} from "lucide-react";

const EditarFornecedor = () => {
  const { isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState(null);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    empresaId: "",
    nome: "",
    nif: "",
    telefone: "",
    email: "",
    endereco: "",
    contato: "",
    tipoServico: "",
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

  const [contratos, setContratos] = useState([]);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [editandoContratoIndex, setEditandoContratoIndex] = useState(null);
  const [novoContrato, setNovoContrato] = useState({
    valor: "",
    dataInicio: "",
    dataFim: "",
    modalidadePagamento: "Mensal",
    diaVencimento: 5,
    diaPagamento: 15,
    avisoAntecedencia: 5,
    descricao: ""
  });

  const BASE_URL = "http://localhost:5000";
  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Para técnico: definir empresa automaticamente
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
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      
      if (response.status === 403) {
        setEmpresas([]);
        return;
      }
      
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
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
      
      if (response.status === 403) {
        setError("Acesso negado a este fornecedor");
        setLoadingData(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      
      const data = await response.json();
      
      setFormData({
        empresaId: data.empresaId || "",
        nome: data.nome || "",
        nif: data.nif || "",
        telefone: data.telefone || "",
        email: data.email || "",
        endereco: data.endereco || "",
        contato: data.contato || "",
        tipoServico: data.tipoServico || "",
        regimeTributacao: data.regimeTributacao || "",
        fiscal: data.fiscal || { suportaIVA: true, taxaIVA: 14, retencaoFonte: false, tipoRetencao: "", taxaRetencao: 0 },
        pagamento: data.pagamento || { banco: "", iban: "", swift: "", formaPagamento: "Transferência" },
        status: data.status || "Ativo",
        observacoes: data.observacoes || ""
      });
      
      setContratos(data.contratos || []);
      
    } catch (error) {
      console.error("Erro:", error);
      setError(error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return "";
    const numeros = valor.toString().replace(/\D/g, "");
    return new Intl.NumberFormat('pt-AO').format(numeros);
  };

  const formatarMoedaParaInput = (valor) => {
    if (!valor) return "";
    return valor.toLocaleString('pt-AO');
  };

  const abrirModalAdicionarContrato = () => {
    setEditandoContratoIndex(null);
    setNovoContrato({
      valor: "",
      dataInicio: "",
      dataFim: "",
      modalidadePagamento: "Mensal",
      diaVencimento: 5,
      diaPagamento: 15,
      avisoAntecedencia: 5,
      descricao: ""
    });
    setShowContratoModal(true);
  };

  const abrirModalEditarContrato = (index) => {
    const contrato = contratos[index];
    setEditandoContratoIndex(index);
    setNovoContrato({
      valor: formatarMoedaParaInput(contrato.valor),
      dataInicio: contrato.dataInicio ? contrato.dataInicio.split('T')[0] : "",
      dataFim: contrato.dataFim ? contrato.dataFim.split('T')[0] : "",
      modalidadePagamento: contrato.modalidadePagamento,
      diaVencimento: contrato.diaVencimento || 5,
      diaPagamento: contrato.diaPagamento || 15,
      avisoAntecedencia: contrato.avisoAntecedencia || 5,
      descricao: contrato.descricao || ""
    });
    setShowContratoModal(true);
  };

  const salvarContrato = () => {
    if (!novoContrato.valor || !novoContrato.dataInicio || !novoContrato.dataFim) {
      mostrarMensagem("Preencha valor, data início e data fim do contrato", "erro");
      return;
    }

    const valorNumerico = parseFloat(novoContrato.valor.toString().replace(/\D/g, "")) || 0;
    
    const novoContratoObj = {
      valor: valorNumerico,
      dataInicio: novoContrato.dataInicio,
      dataFim: novoContrato.dataFim,
      modalidadePagamento: novoContrato.modalidadePagamento,
      diaVencimento: novoContrato.diaVencimento,
      diaPagamento: novoContrato.diaPagamento,
      avisoAntecedencia: novoContrato.avisoAntecedencia,
      descricao: novoContrato.descricao
    };

    if (editandoContratoIndex !== null) {
      const novosContratos = [...contratos];
      novosContratos[editandoContratoIndex] = novoContratoObj;
      setContratos(novosContratos);
      mostrarMensagem("Contrato atualizado!", "sucesso");
    } else {
      setContratos([...contratos, novoContratoObj]);
      mostrarMensagem("Contrato adicionado!", "sucesso");
    }
    
    setShowContratoModal(false);
    setEditandoContratoIndex(null);
    setNovoContrato({
      valor: "",
      dataInicio: "",
      dataFim: "",
      modalidadePagamento: "Mensal",
      diaVencimento: 5,
      diaPagamento: 15,
      avisoAntecedencia: 5,
      descricao: ""
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
      contratos: contratos
    };

    try {
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok) {
        mostrarMensagem("✅ Fornecedor atualizado com sucesso!", "sucesso");
        setRedirecting(true);
        setTimeout(() => {
          navigate("/fornecedores");
        }, 500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao atualizar", "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
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
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm`}>
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

      {/* Modal de Contrato */}
      {showContratoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-purple-500/30 animate-scale-in">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700 sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg"><Briefcase className="w-5 h-5 text-white" /></div>
                  <h3 className="text-xl font-bold text-white">{editandoContratoIndex !== null ? "Editar Contrato" : "Adicionar Contrato"}</h3>
                </div>
                <button onClick={() => setShowContratoModal(false)} className="p-1 rounded-lg hover:bg-gray-700">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Valor do Contrato (Kz) *</label>
                <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="0,00" value={novoContrato.valor} onChange={(e) => setNovoContrato({...novoContrato, valor: formatarMoeda(e.target.value)})} />
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
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Vencimento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaVencimento} onChange={(e) => setNovoContrato({...novoContrato, diaVencimento: parseInt(e.target.value, 10)})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Dia Pagamento</label><input type="number" min="1" max="31" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={novoContrato.diaPagamento} onChange={(e) => setNovoContrato({...novoContrato, diaPagamento: parseInt(e.target.value, 10)})} /></div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                <textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" placeholder="Descrição do serviço contratado..." value={novoContrato.descricao} onChange={(e) => setNovoContrato({...novoContrato, descricao: e.target.value})} />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button onClick={() => setShowContratoModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancelar</button>
              <button onClick={salvarContrato} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">{editandoContratoIndex !== null ? "Atualizar" : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto pb-8 px-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Edit className="w-5 h-5 text-white" /></div>
              <div><h2 className="text-xl font-bold text-white">Editar Fornecedor</h2><p className="text-sm text-gray-400">Atualize os dados do fornecedor</p></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Empresa */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</h3>
              
              {isTecnico() ? (
                <div className="relative">
                  <div className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white cursor-not-allowed">
                    {userEmpresaNome || "Empresa vinculada"}
                  </div>
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
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Serviço</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.tipoServico} onChange={(e) => setFormData({...formData, tipoServico: e.target.value})} /></div>
              </div>
            </div>

            {/* Contactos */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contactos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label><input type="tel" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Email</label><input type="email" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Pessoa de Contacto</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.contato} onChange={(e) => setFormData({...formData, contato: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Endereço</label><textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} /></div>
              </div>
            </div>

            {/* Configuração Fiscal - CORRIGIDA */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Configuração Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Regime de Tributação</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.regimeTributacao} onChange={(e) => setFormData({...formData, regimeTributacao: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Regime Geral">Regime Geral</option>
                    <option value="Regime Simplificado">Regime Simplificado</option>
                    <option value="Regime de IVA com Exclusão">Regime de IVA com Exclusão</option>
                    <option value="Regime de IVA com Inclusão">Regime de IVA com Inclusão</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.fiscal.suportaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, suportaIVA: e.target.checked}})} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-gray-300">Suporta IVA</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.fiscal.retencaoFonte} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, retencaoFonte: e.target.checked}})} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-gray-300">Retenção na Fonte</span>
                  </label>
                </div>
                
                {formData.fiscal.suportaIVA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label>
                    <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaIVA: parseFloat(e.target.value)}})} />
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
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label>
                      <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fiscal.taxaRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaRetencao: parseFloat(e.target.value)}})} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Banco</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.banco} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, banco: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.iban} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, iban: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">SWIFT/BIC</label><input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.swift} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, swift: e.target.value}})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label><select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.pagamento.formaPagamento} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, formaPagamento: e.target.value}})}><option value="Transferência">Transferência Bancária</option><option value="Dinheiro">Dinheiro</option><option value="Cheque">Cheque</option><option value="POS">POS/Terminal</option></select></div>
              </div>
            </div>

            {/* Contratos */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Contratos</h3>
              {contratos.length > 0 && (
                <div className="space-y-2 mb-4">
                  {contratos.map((contrato, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                      <div><p className="text-white font-medium">{contrato.valor.toLocaleString()} Kz</p><p className="text-xs text-gray-400">{contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString('pt-PT') : '—'} - {contrato.dataFim ? new Date(contrato.dataFim).toLocaleDateString('pt-PT') : '—'}</p><p className="text-xs text-gray-400">{contrato.modalidadePagamento}</p></div>
                      <div className="flex gap-2"><button type="button" onClick={() => abrirModalEditarContrato(index)} className="p-1 text-yellow-400 hover:text-yellow-300"><Edit className="w-5 h-5" /></button><button type="button" onClick={() => removerContrato(index)} className="p-1 text-red-400 hover:text-red-300"><X className="w-5 h-5" /></button></div>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={abrirModalAdicionarContrato} className="w-full py-2 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-blue-400 hover:border-blue-500 transition-all duration-200 flex items-center justify-center gap-2"><Plus size={18} /> Adicionar Contrato</button>
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
              <button type="submit" disabled={loading || redirecting} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</> : <><Save className="w-5 h-5" /> Salvar Alterações</>}
              </button>
              <button type="button" onClick={() => navigate("/fornecedores")} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-200 flex items-center gap-2">
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

export default EditarFornecedor;