import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  User, Edit, ArrowLeft, Mail, Phone, Briefcase, Calendar, 
  DollarSign, CheckCircle, XCircle, Building2, CreditCard, 
  MapPin, Users, Gift, FileText, Clock, Hash, Shield,
  Banknote, IdCard, CalendarDays, Home, Globe, Award,
  Cake, Heart, PhoneCall, MapPinHouse, Tag, Wallet,
  UserCheck, AlertCircle
} from "lucide-react";

const VisualizarFuncionario = () => {
  const [funcionario, setFuncionario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const { user, isTecnico, empresaId: userEmpresaId } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarFuncionario();
    }
  }, [empresaSelecionada]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      if (isTecnico() && userEmpresaId) {
        setEmpresaSelecionada(userEmpresaId);
      } else if (empresasList.length > 0) {
        setEmpresaSelecionada(empresasList[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    }
  };

  const carregarFuncionario = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/funcionarios/${id}?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado a este funcionário", "erro");
        navigate("/funcionarios");
        return;
      }
      
      const data = await response.json();
      console.log("📊 Dados completos do funcionário:", data);
      setFuncionario(data);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar funcionário", "erro");
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar data
  const formatarData = (data) => {
    if (!data) return "—";
    try {
      return new Date(data).toLocaleDateString('pt-PT');
    } catch {
      return "—";
    }
  };

  // Função para formatar moeda
  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "—";
    return valor.toLocaleString() + " Kz";
  };

  if (loading) {
    return (
      <Layout title="Detalhes do Funcionário" showBackButton={true} backToRoute="/funcionarios">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Carregando dados do funcionário...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!funcionario) {
    return (
      <Layout title="Detalhes do Funcionário" showBackButton={true} backToRoute="/funcionarios">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Funcionário não encontrado</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Detalhes do Funcionário" showBackButton={true} backToRoute="/funcionarios">
      {mensagem.texto && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
        } text-white`}>
          {mensagem.texto}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Header com Foto */}
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {funcionario.foto ? (
                  <img 
                    src={`https://sirexa-api.onrender.com${funcionario.foto}`} 
                    alt={funcionario.nome}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <User className="text-white" size={40} />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">{funcionario.nome || "—"}</h1>
                  <p className="text-blue-200">
                    {funcionario.funcao || funcionario.cargo || "Função não definida"}
                  </p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                    funcionario.status === "Ativo" || funcionario.ativo === true
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {funcionario.status || (funcionario.ativo ? "Ativo" : "Inativo")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/funcionarios/editar/${funcionario._id}`)}
                className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
              >
                <Edit size={18} /> Editar
              </button>
            </div>
          </div>

          {/* Content - Grid com TODOS os campos */}
          <div className="p-6 space-y-6">
            
            {/* Seção 1: Informações da Empresa */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Empresa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Building2 className="text-blue-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Nome da Empresa</p>
                    <p className="text-white">{funcionario.empresaNome || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="text-gray-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">ID da Empresa</p>
                    <p className="text-white text-sm font-mono">{funcionario.empresaId || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Dados Pessoais */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <IdCard className="text-yellow-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">NIF</p>
                    <p className="text-white">{funcionario.nif || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Cake className="text-pink-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Data Nascimento</p>
                    <p className="text-white">{formatarData(funcionario.dataNascimento)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="text-purple-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Género</p>
                    <p className="text-white">{funcionario.genero || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Heart className="text-red-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Estado Civil</p>
                    <p className="text-white">{funcionario.estadoCivil || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="text-green-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Nacionalidade</p>
                    <p className="text-white">{funcionario.nacionalidade || "Angolana"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="text-orange-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Grupo IRT</p>
                    <p className="text-white">{funcionario.grupoIRT || "A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="text-cyan-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Dependentes</p>
                    <p className="text-white">{funcionario.dependentes || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 3: Contactos */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Contactos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="text-blue-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-white">{funcionario.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneCall className="text-green-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Telefone</p>
                    <p className="text-white">{funcionario.telefone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <MapPinHouse className="text-yellow-400" size={18} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Endereço</p>
                    <p className="text-white">{funcionario.endereco || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 4: Dados Profissionais */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Dados Profissionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Tag className="text-yellow-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Função / Cargo</p>
                    <p className="text-white">{funcionario.funcao || funcionario.cargo || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="text-purple-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Departamento</p>
                    <p className="text-white">{funcionario.departamento || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-green-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Data Admissão</p>
                    <p className="text-white">{formatarData(funcionario.dataAdmissao || funcionario.dataContratacao)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="text-orange-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Tipo Contrato</p>
                    <p className="text-white">{funcionario.tipoContrato || "Efetivo"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Banknote className="text-green-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Salário Base</p>
                    <p className="text-white">{formatarMoeda(funcionario.salarioBase)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Horário</p>
                    <p className="text-white">{funcionario.horasSemanais || 40}h/semana | {funcionario.horasDiarias || 8}h/dia</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 5: Segurança Social (INSS) - NOVA SEÇÃO */}
            <div className="bg-gray-700/30 rounded-xl p-4 border border-cyan-500/30">
              <h3 className="text-md font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Segurança Social (INSS)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-cyan-600/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck className="text-cyan-400" size={20} />
                      <div>
                        <p className="text-white font-medium">Contribui para a Segurança Social?</p>
                        <p className="text-xs text-gray-400">
                          Este funcionário tem desconto de INSS no salário
                        </p>
                      </div>
                    </div>
                    <div>
                      {funcionario.contribuiINSS === true || funcionario.contribuiINSS === undefined ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-600/20 text-green-400">
                          <CheckCircle size={14} /> Sim, contribui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-600/20 text-red-400">
                          <XCircle size={14} /> Não contribui
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {funcionario.contribuiINSS === false && (
                    <div className="mt-3 p-2 bg-yellow-600/20 rounded-lg">
                      <p className="text-xs text-yellow-400 flex items-center gap-1">
                        <AlertCircle size={12} /> Atenção: Este funcionário NÃO contribui para o INSS. Nenhum desconto é aplicado ao seu salário.
                      </p>
                    </div>
                  )}
                  
                  {funcionario.contribuiINSS === true && (
                    <div className="mt-3 p-2 bg-green-600/20 rounded-lg">
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle size={12} /> Este funcionário contribui para o INSS conforme regime da empresa.
                      </p>
                    </div>
                  )}
                  
                  {/* Se for undefined (campo não existe no banco), mostrar mensagem padrão */}
                  {funcionario.contribuiINSS === undefined && (
                    <div className="mt-3 p-2 bg-blue-600/20 rounded-lg">
                      <p className="text-xs text-blue-400 flex items-center gap-1">
                        <AlertCircle size={12} /> Padrão: Contribui para o INSS (configuração antiga)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seção 6: Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Dados Bancários
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Wallet className="text-blue-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Banco</p>
                    <p className="text-white">{funcionario.banco || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="text-green-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Nº Conta</p>
                    <p className="text-white">{funcionario.numeroConta || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="text-purple-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">IBAN</p>
                    <p className="text-white font-mono text-sm">{funcionario.iban || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="text-yellow-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Titular Conta</p>
                    <p className="text-white">{funcionario.titularConta || funcionario.nome || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 7: Acesso Técnico */}
            {funcionario.isTecnico && (
              <div className="bg-purple-600/10 rounded-xl p-4 border border-purple-500/30">
                <h3 className="text-md font-semibold text-purple-400 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Acesso Técnico
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3">
                    <Shield className="text-purple-400" size={18} />
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <p className="text-purple-400 font-semibold">✓ Técnico ativo no sistema</p>
                    </div>
                  </div>
                  {funcionario.usuarioId && (
                    <div className="flex items-center gap-3">
                      <Hash className="text-gray-400" size={18} />
                      <div>
                        <p className="text-xs text-gray-400">ID do Usuário Técnico</p>
                        <p className="text-white text-sm font-mono">{funcionario.usuarioId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seção 8: Informações do Sistema */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Informações do Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Hash className="text-gray-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">ID do Funcionário</p>
                    <p className="text-white text-sm font-mono">{funcionario._id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-blue-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Data de Cadastro</p>
                    <p className="text-white">{formatarData(funcionario.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-green-400" size={18} />
                  <div>
                    <p className="text-xs text-gray-400">Última Atualização</p>
                    <p className="text-white">{formatarData(funcionario.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Voltar */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => navigate("/funcionarios")}
                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} /> Voltar para Lista
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VisualizarFuncionario;