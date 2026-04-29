// src/pages/Funcionarios/CadastroFuncionario.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { 
  Save, ArrowLeft, UserPlus, Building2, Mail, Phone, MapPin, 
  Briefcase, Calendar, DollarSign, CreditCard,
  Users, CheckCircle, AlertCircle, Loader2, Shield,
  TrendingUp, ShoppingCart, Package, Receipt, UsersIcon,
  Wallet, ClipboardList, Gift, BarChart3, Car, Fuel,
  Wrench, Boxes, Truck, PieChart, ArrowRightLeft, Eye,
  FileText, UserCheck
} from "lucide-react";

const CadastroFuncionario = () => {
  const { user, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  
  // Estados para controle de expansão das seções de módulos
  const [expandedSections, setExpandedSections] = useState({
    operacional: true,
    recursosHumanos: false,
    gestaoPatrimonial: false,
    financeiro: false,
    relatorios: false
  });
  
  // Campos para técnico - ESTRUTURA COMPLETA DE MÓDULOS
  const [tecnicoSenha, setTecnicoSenha] = useState("");
  const [tecnicoConfirmarSenha, setTecnicoConfirmarSenha] = useState("");
  const [tecnicoModulos, setTecnicoModulos] = useState({
    // Operacional
    vendas: false,
    stock: false,
    facturacao: false,
    
    // Recursos Humanos
    funcionarios: false,
    folhaSalarial: false,
    gestaoFaltas: false,
    gestaoAbonos: false,
    avaliacao: false,
    
    // Gestão Patrimonial
    viaturas: false,
    abastecimentos: false,
    manutencoes: false,
    inventario: false,
    
    // Financeiro
    fornecedores: false,
    fluxoCaixa: false,
    contaCorrente: false,
    controloPagamento: false,
    custosReceitas: false,
    orcamentos: false,
    dre: false,
    indicadores: false,
    transferencias: false,
    reconciliacao: false,
    
    // Relatórios
    relatorios: false,
    graficos: false,
    analise: false
  });
  
  const [formData, setFormData] = useState({
    nome: "",
    nif: "",
    dataNascimento: "",
    genero: "",
    estadoCivil: "",
    nacionalidade: "Angolana",
    email: "",
    telefone: "",
    endereco: "",
    funcao: "",
    departamento: "",
    dataAdmissao: new Date().toISOString().split('T')[0],
    tipoContrato: "Efetivo",
    status: "Ativo",
    salarioBase: "",
    banco: "",
    numeroConta: "",
    iban: "",
    titularConta: "",
    grupoIRT: "A",
    dependentes: 0,
    horasSemanais: 40,
    horasDiarias: 8,
    empresaId: "",
    isTecnico: false,
    // NOVO CAMPO - Contribuição para Segurança Social
    contribuiINSS: true  // Por padrão, contribui (true)
  });

  // Função para alternar expansão de seção
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Função para selecionar todos os módulos de uma categoria
  const handleSelectAll = (category, modules) => {
    const allSelected = modules.every(m => tecnicoModulos[m]);
    const newModulos = { ...tecnicoModulos };
    modules.forEach(m => {
      newModulos[m] = !allSelected;
    });
    setTecnicoModulos(newModulos);
  };

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId) {
      setFormData(prev => ({ ...prev, empresaId: userEmpresaId }));
    }
  }, [isTecnico, userEmpresaId]);

  // Função para formatar valor com separador de milhares
  const formatarMoeda = (valor) => {
    if (!valor) return "";
    const numeros = valor.toString().replace(/\D/g, "");
    return new Intl.NumberFormat('pt-AO').format(numeros);
  };

  // Função para converter valor formatado de volta para número
  const converterParaNumero = (valorFormatado) => {
    if (!valorFormatado) return "";
    return valorFormatado.replace(/\D/g, "");
  };

  const handleSalarioChange = (e) => {
    const valorFormatado = formatarMoeda(e.target.value);
    setFormData({...formData, salarioBase: valorFormatado});
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

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
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome?.trim()) {
      mostrarMensagem("Nome do funcionário é obrigatório", "erro");
      return;
    }
    if (!formData.nif?.trim()) {
      mostrarMensagem("NIF é obrigatório", "erro");
      return;
    }
    if (!formData.funcao?.trim()) {
      mostrarMensagem("Função é obrigatória", "erro");
      return;
    }
    if (!formData.salarioBase) {
      mostrarMensagem("Salário base é obrigatório", "erro");
      return;
    }
    if (!formData.empresaId) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }
    
    // Validar senha se for técnico
    if (formData.isTecnico) {
      if (!tecnicoSenha) {
        mostrarMensagem("Senha é obrigatória para técnico", "erro");
        return;
      }
      if (tecnicoSenha !== tecnicoConfirmarSenha) {
        mostrarMensagem("As senhas não coincidem", "erro");
        return;
      }
    }

    setLoading(true);
    
    const salarioNumerico = parseFloat(converterParaNumero(formData.salarioBase)) || 0;
    
    const dadosEnvio = {
      nome: formData.nome,
      nif: formData.nif,
      dataNascimento: formData.dataNascimento || null,
      genero: formData.genero || null,
      estadoCivil: formData.estadoCivil || null,
      nacionalidade: formData.nacionalidade,
      email: formData.email,
      telefone: formData.telefone,
      endereco: formData.endereco,
      funcao: formData.funcao,
      departamento: formData.departamento || "",
      dataAdmissao: formData.dataAdmissao,
      tipoContrato: formData.tipoContrato,
      status: formData.status,
      salarioBase: salarioNumerico,
      banco: formData.banco || "",
      numeroConta: formData.numeroConta || "",
      iban: formData.iban || "",
      titularConta: formData.titularConta || "",
      grupoIRT: formData.grupoIRT,
      dependentes: parseInt(formData.dependentes) || 0,
      horasSemanais: parseFloat(formData.horasSemanais) || 40,
      horasDiarias: parseFloat(formData.horasDiarias) || 8,
      empresaId: formData.empresaId,
      isTecnico: formData.isTecnico,
      // NOVO CAMPO - Contribuição para Segurança Social
      contribuiINSS: formData.contribuiINSS,
      // Dados do técnico
      tecnicoSenha: formData.isTecnico ? tecnicoSenha : null,
      tecnicoModulos: formData.isTecnico ? tecnicoModulos : null
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/funcionarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dadosEnvio)
      });

      const result = await response.json();

      if (response.ok) {
        setMensagem({ texto: "✅ Funcionário cadastrado com sucesso!", tipo: "sucesso" });
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = "/funcionarios";
        }, 500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao cadastrar funcionário", "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  if (loadingEmpresas) {
    return (
      <Layout title="Cadastrar Funcionário" showBackButton={true} backToRoute="/funcionarios">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </Layout>
    );
  }

  // Se for técnico e não tiver empresa, mostrar erro
  if (isTecnico() && !userEmpresaId) {
    return (
      <Layout title="Cadastrar Funcionário" showBackButton={true} backToRoute="/funcionarios">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
          <div className="bg-red-500/10 rounded-full p-6 mb-4 inline-flex">
            <Shield className="w-12 h-12 text-red-400" />
          </div>
          <p className="text-gray-400 text-lg">Você não está vinculado a nenhuma empresa</p>
          <p className="text-gray-500 text-sm mt-2">Contate o administrador do sistema</p>
          <button
            onClick={() => navigate("/funcionarios")}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Voltar
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Cadastrar Funcionário" showBackButton={true} backToRoute="/funcionarios">
      {/* Overlay de redirecionamento rápido */}
      {redirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Funcionário cadastrado com sucesso.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      )}

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

      <div className="max-w-4xl mx-auto pb-8">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Cadastrar Funcionário</h2>
                <p className="text-sm text-gray-400">Preencha os dados do funcionário</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Empresa - Para técnico: campo oculto/desabilitado */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Empresa
              </h3>
              
              {isTecnico() ? (
                // Para técnico: mostrar empresa fixa (desabilitado)
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white cursor-not-allowed"
                    value={userEmpresaNome || "Empresa vinculada"}
                    disabled
                  />
                  <input
                    type="hidden"
                    name="empresaId"
                    value={formData.empresaId}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Você está vinculado a esta empresa. Não é possível alterar.
                  </p>
                </div>
              ) : (
                // Para gestor: select normal
                <select
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={formData.empresaId}
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})}
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Dados Pessoais */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">NIF *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data Nascimento</label>
                  <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.dataNascimento} onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Género</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Estado Civil</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.estadoCivil} onChange={(e) => setFormData({...formData, estadoCivil: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Solteiro">Solteiro(a)</option>
                    <option value="Casado">Casado(a)</option>
                    <option value="Divorciado">Divorciado(a)</option>
                    <option value="Viúvo">Viúvo(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nacionalidade</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.nacionalidade} onChange={(e) => setFormData({...formData, nacionalidade: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input type="email" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                  <input type="tel" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Endereço</label>
                  <textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                    value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Dados Profissionais */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Dados Profissionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Função *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    placeholder="Ex: Técnico de Vendas, Analista Financeiro"
                    value={formData.funcao} onChange={(e) => setFormData({...formData, funcao: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Departamento</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data Admissão</label>
                  <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.dataAdmissao} onChange={(e) => setFormData({...formData, dataAdmissao: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo Contrato</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.tipoContrato} onChange={(e) => setFormData({...formData, tipoContrato: e.target.value})}>
                    <option value="Efetivo">Efetivo</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Temporário">Temporário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Licença">Licença</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Salário Base (Kz) *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right"
                    placeholder="0.000,00"
                    value={formData.salarioBase}
                    onChange={handleSalarioChange}
                    required 
                  />
                  <p className="text-xs text-gray-500 mt-1">Digite o valor com separador de milhares automático</p>
                </div>
              </div>
            </div>

            {/* NOVA SEÇÃO: Segurança Social */}
            <div className="bg-gray-700/30 rounded-xl p-4 border border-cyan-500/30">
              <h3 className="text-md font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Segurança Social (INSS)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-cyan-600/10 rounded-lg p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-white font-medium">Contribui para a Segurança Social?</p>
                        <p className="text-sm text-gray-400">
                          Se marcado "Sim", o INSS será descontado do salário do funcionário.
                          <br />
                          Se marcado "Não", o funcionário não terá desconto de INSS.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${!formData.contribuiINSS ? 'text-gray-400' : 'text-gray-500'}`}>Não</span>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, contribuiINSS: !formData.contribuiINSS})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                          formData.contribuiINSS ? 'bg-cyan-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.contribuiINSS ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm ${formData.contribuiINSS ? 'text-cyan-400' : 'text-gray-500'}`}>Sim</span>
                    </div>
                  </label>
                  
                  {!formData.contribuiINSS && (
                    <div className="mt-3 p-2 bg-yellow-600/20 rounded-lg">
                      <p className="text-xs text-yellow-400 flex items-center gap-1">
                        <AlertCircle size={12} /> Atenção: Este funcionário NÃO contribuirá para o INSS. Nenhum desconto será aplicado.
                      </p>
                    </div>
                  )}
                  
                  {formData.contribuiINSS && (
                    <div className="mt-3 p-2 bg-green-600/20 rounded-lg">
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle size={12} /> Este funcionário contribuirá para o INSS conforme regime da empresa.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Dados Bancários
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Banco</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.banco} onChange={(e) => setFormData({...formData, banco: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nº Conta</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.numeroConta} onChange={(e) => setFormData({...formData, numeroConta: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Titular Conta</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.titularConta} onChange={(e) => setFormData({...formData, titularConta: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Tributação */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Tributação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Grupo IRT</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.grupoIRT} onChange={(e) => setFormData({...formData, grupoIRT: e.target.value})}>
                    <option value="A">Grupo A</option>
                    <option value="B">Grupo B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nº Dependentes</label>
                  <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.dependentes} onChange={(e) => setFormData({...formData, dependentes: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Horário */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Horário de Trabalho
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Horas Semanais</label>
                  <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.horasSemanais} onChange={(e) => setFormData({...formData, horasSemanais: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Horas Diárias</label>
                  <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={formData.horasDiarias} onChange={(e) => setFormData({...formData, horasDiarias: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Técnico - SOMENTE PARA GESTOR (não técnico) - COM MÓDULOS EXPANDIDOS */}
            {!isTecnico() && (
              <div className="bg-purple-600/10 rounded-xl p-4 border border-purple-500/30">
                <label className="flex items-center justify-between cursor-pointer mb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">Promover a Técnico?</p>
                      <p className="text-sm text-gray-400">O funcionário terá acesso ao sistema</p>
                    </div>
                  </div>
                  <input type="checkbox" checked={formData.isTecnico} 
                    onChange={(e) => setFormData({...formData, isTecnico: e.target.checked})}
                    className="w-5 h-5 text-purple-600 rounded" />
                </label>
                
                {formData.isTecnico && (
                  <div className="mt-4 space-y-4 border-t border-purple-500/30 pt-4">
                    <h3 className="text-md font-semibold text-purple-400">Credenciais de Acesso</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Senha de Acesso <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          placeholder="Digite a senha para o técnico"
                          value={tecnicoSenha}
                          onChange={(e) => setTecnicoSenha(e.target.value)}
                          required={formData.isTecnico}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Confirmar Senha <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                          placeholder="Confirme a senha"
                          value={tecnicoConfirmarSenha}
                          onChange={(e) => setTecnicoConfirmarSenha(e.target.value)}
                          required={formData.isTecnico}
                        />
                      </div>
                    </div>
                    
                    {/* Módulos de Acesso - ESTRUTURA COMPLETA EXPANDIDA */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Módulos de Acesso
                      </label>
                      
                      {/* Seção Operacional */}
                      <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                        <button 
                          type="button" 
                          onClick={() => toggleSection('operacional')} 
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:bg-green-600/30 transition"
                        >
                          <div className="flex items-center gap-2">
                            <TrendingUp className="text-green-400" size={16} />
                            <span className="font-semibold text-white text-sm">Módulo Operacional</span>
                          </div>
                          <span className="text-gray-400 text-sm">{expandedSections.operacional ? '▼' : '▶'}</span>
                        </button>
                        {expandedSections.operacional && (
                          <div className="p-3 space-y-2 border-t border-gray-600">
                            <div className="flex justify-end mb-2">
                              <button 
                                type="button" 
                                onClick={() => handleSelectAll('operacional', ['vendas', 'stock', 'facturacao'])} 
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                {tecnicoModulos.vendas && tecnicoModulos.stock && tecnicoModulos.facturacao ? 'Desmarcar Todos' : 'Marcar Todos'}
                              </button>
                            </div>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><ShoppingCart size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Vendas</span></div>
                              <input type="checkbox" checked={tecnicoModulos.vendas} onChange={(e) => setTecnicoModulos({...tecnicoModulos, vendas: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Package size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Stock</span></div>
                              <input type="checkbox" checked={tecnicoModulos.stock} onChange={(e) => setTecnicoModulos({...tecnicoModulos, stock: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Receipt size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Facturação</span></div>
                              <input type="checkbox" checked={tecnicoModulos.facturacao} onChange={(e) => setTecnicoModulos({...tecnicoModulos, facturacao: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Seção Recursos Humanos */}
                      <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                        <button 
                          type="button" 
                          onClick={() => toggleSection('recursosHumanos')} 
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:bg-purple-600/30 transition"
                        >
                          <div className="flex items-center gap-2">
                            <UsersIcon className="text-purple-400" size={16} />
                            <span className="font-semibold text-white text-sm">Recursos Humanos</span>
                          </div>
                          <span className="text-gray-400 text-sm">{expandedSections.recursosHumanos ? '▼' : '▶'}</span>
                        </button>
                        {expandedSections.recursosHumanos && (
                          <div className="p-3 space-y-2 border-t border-gray-600">
                            <div className="flex justify-end mb-2">
                              <button type="button" onClick={() => handleSelectAll('recursosHumanos', ['funcionarios', 'folhaSalarial', 'gestaoFaltas', 'gestaoAbonos', 'avaliacao'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                            </div>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><ClipboardList size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Funcionários</span></div>
                              <input type="checkbox" checked={tecnicoModulos.funcionarios} onChange={(e) => setTecnicoModulos({...tecnicoModulos, funcionarios: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Wallet size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Folha Salarial</span></div>
                              <input type="checkbox" checked={tecnicoModulos.folhaSalarial} onChange={(e) => setTecnicoModulos({...tecnicoModulos, folhaSalarial: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Calendar size={14} className="text-red-400" /><span className="text-gray-300 text-sm">Gestão de Faltas</span></div>
                              <input type="checkbox" checked={tecnicoModulos.gestaoFaltas} onChange={(e) => setTecnicoModulos({...tecnicoModulos, gestaoFaltas: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Gift size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Gestão de Abonos</span></div>
                              <input type="checkbox" checked={tecnicoModulos.gestaoAbonos} onChange={(e) => setTecnicoModulos({...tecnicoModulos, gestaoAbonos: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><BarChart3 size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Avaliação de Desempenho</span></div>
                              <input type="checkbox" checked={tecnicoModulos.avaliacao} onChange={(e) => setTecnicoModulos({...tecnicoModulos, avaliacao: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Seção Gestão Patrimonial */}
                      <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                        <button 
                          type="button" 
                          onClick={() => toggleSection('gestaoPatrimonial')} 
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:bg-cyan-600/30 transition"
                        >
                          <div className="flex items-center gap-2">
                            <Car className="text-cyan-400" size={16} />
                            <span className="font-semibold text-white text-sm">Gestão Patrimonial</span>
                          </div>
                          <span className="text-gray-400 text-sm">{expandedSections.gestaoPatrimonial ? '▼' : '▶'}</span>
                        </button>
                        {expandedSections.gestaoPatrimonial && (
                          <div className="p-3 space-y-2 border-t border-gray-600">
                            <div className="flex justify-end mb-2">
                              <button type="button" onClick={() => handleSelectAll('gestaoPatrimonial', ['viaturas', 'abastecimentos', 'manutencoes', 'inventario'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                            </div>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Car size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Viaturas</span></div>
                              <input type="checkbox" checked={tecnicoModulos.viaturas} onChange={(e) => setTecnicoModulos({...tecnicoModulos, viaturas: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Fuel size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Abastecimentos</span></div>
                              <input type="checkbox" checked={tecnicoModulos.abastecimentos} onChange={(e) => setTecnicoModulos({...tecnicoModulos, abastecimentos: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Wrench size={14} className="text-red-400" /><span className="text-gray-300 text-sm">Manutenções</span></div>
                              <input type="checkbox" checked={tecnicoModulos.manutencoes} onChange={(e) => setTecnicoModulos({...tecnicoModulos, manutencoes: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Boxes size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Inventário</span></div>
                              <input type="checkbox" checked={tecnicoModulos.inventario} onChange={(e) => setTecnicoModulos({...tecnicoModulos, inventario: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Seção Financeiro */}
                      <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                        <button 
                          type="button" 
                          onClick={() => toggleSection('financeiro')} 
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:bg-emerald-600/30 transition"
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="text-emerald-400" size={16} />
                            <span className="font-semibold text-white text-sm">Financeiro</span>
                          </div>
                          <span className="text-gray-400 text-sm">{expandedSections.financeiro ? '▼' : '▶'}</span>
                        </button>
                        {expandedSections.financeiro && (
                          <div className="p-3 space-y-2 border-t border-gray-600 max-h-64 overflow-y-auto">
                            <div className="flex justify-end mb-2">
                              <button type="button" onClick={() => handleSelectAll('financeiro', ['fornecedores', 'fluxoCaixa', 'contaCorrente', 'controloPagamento', 'custosReceitas', 'orcamentos', 'dre', 'indicadores', 'transferencias', 'reconciliacao'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                            </div>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Truck size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Fornecedores</span></div>
                              <input type="checkbox" checked={tecnicoModulos.fornecedores} onChange={(e) => setTecnicoModulos({...tecnicoModulos, fornecedores: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><TrendingUp size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Fluxo de Caixa</span></div>
                              <input type="checkbox" checked={tecnicoModulos.fluxoCaixa} onChange={(e) => setTecnicoModulos({...tecnicoModulos, fluxoCaixa: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Wallet size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Conta Corrente</span></div>
                              <input type="checkbox" checked={tecnicoModulos.contaCorrente} onChange={(e) => setTecnicoModulos({...tecnicoModulos, contaCorrente: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><FileText size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Controlo de Pagamento</span></div>
                              <input type="checkbox" checked={tecnicoModulos.controloPagamento} onChange={(e) => setTecnicoModulos({...tecnicoModulos, controloPagamento: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><PieChart size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Custos e Receitas</span></div>
                              <input type="checkbox" checked={tecnicoModulos.custosReceitas} onChange={(e) => setTecnicoModulos({...tecnicoModulos, custosReceitas: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><ClipboardList size={14} className="text-orange-400" /><span className="text-gray-300 text-sm">Orçamentos</span></div>
                              <input type="checkbox" checked={tecnicoModulos.orcamentos} onChange={(e) => setTecnicoModulos({...tecnicoModulos, orcamentos: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><BarChart3 size={14} className="text-red-400" /><span className="text-gray-300 text-sm">DRE</span></div>
                              <input type="checkbox" checked={tecnicoModulos.dre} onChange={(e) => setTecnicoModulos({...tecnicoModulos, dre: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Eye size={14} className="text-cyan-400" /><span className="text-gray-300 text-sm">Indicadores</span></div>
                              <input type="checkbox" checked={tecnicoModulos.indicadores} onChange={(e) => setTecnicoModulos({...tecnicoModulos, indicadores: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><ArrowRightLeft size={14} className="text-teal-400" /><span className="text-gray-300 text-sm">Transferências</span></div>
                              <input type="checkbox" checked={tecnicoModulos.transferencias} onChange={(e) => setTecnicoModulos({...tecnicoModulos, transferencias: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><Wallet size={14} className="text-indigo-400" /><span className="text-gray-300 text-sm">Reconciliação Bancária</span></div>
                              <input type="checkbox" checked={tecnicoModulos.reconciliacao} onChange={(e) => setTecnicoModulos({...tecnicoModulos, reconciliacao: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Seção Relatórios */}
                      <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                        <button 
                          type="button" 
                          onClick={() => toggleSection('relatorios')} 
                          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-rose-600/20 to-pink-600/20 hover:bg-rose-600/30 transition"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="text-rose-400" size={16} />
                            <span className="font-semibold text-white text-sm">Relatórios e Análises</span>
                          </div>
                          <span className="text-gray-400 text-sm">{expandedSections.relatorios ? '▼' : '▶'}</span>
                        </button>
                        {expandedSections.relatorios && (
                          <div className="p-3 space-y-2 border-t border-gray-600">
                            <div className="flex justify-end mb-2">
                              <button type="button" onClick={() => handleSelectAll('relatorios', ['relatorios', 'graficos', 'analise'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button>
                            </div>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><FileText size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Relatórios</span></div>
                              <input type="checkbox" checked={tecnicoModulos.relatorios} onChange={(e) => setTecnicoModulos({...tecnicoModulos, relatorios: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><BarChart3 size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Gráficos</span></div>
                              <input type="checkbox" checked={tecnicoModulos.graficos} onChange={(e) => setTecnicoModulos({...tecnicoModulos, graficos: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                              <div className="flex items-center gap-2"><PieChart size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Análise Geral</span></div>
                              <input type="checkbox" checked={tecnicoModulos.analise} onChange={(e) => setTecnicoModulos({...tecnicoModulos, analise: e.target.checked})} className="w-4 h-4 text-purple-600 rounded" />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading || redirecting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Cadastrando...</> : <><Save className="w-5 h-5" /> Cadastrar Funcionário</>}
              </button>
              <button type="button" onClick={() => navigate("/funcionarios")}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

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
      `}</style>
    </Layout>
  );
};

export default CadastroFuncionario;