// src/pages/Fornecedores/ListaFornecedores.jsx - VERSÃO CORRIGIDA PARA TÉCNICO
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import EmpresaSelector from "../../components/EmpresaSelector";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Edit, Trash2, Eye, Users, Search, RefreshCw, 
  Truck, Phone, Mail, MapPin, Building2, FileText,
  Filter, Loader2, AlertTriangle, CheckCircle, XCircle,
  Calendar, DollarSign, CreditCard, Clock, Award, Eye as EyeIcon
} from "lucide-react";

const ListaFornecedores = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [fornecedores, setFornecedores] = useState([]);
  const [filteredFornecedores, setFilteredFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  
  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

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
      carregarFornecedores();
    } else {
      setFornecedores([]);
      setFilteredFornecedores([]);
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    filtrarFornecedores();
  }, [busca, statusFilter, fornecedores]);

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
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      if (empresasList.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(empresasList[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarFornecedores = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/fornecedores?empresaId=${empresaSelecionada}`, {
        headers: getHeaders()
      });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setFornecedores([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      const fornecedoresList = Array.isArray(data) ? data : (data.dados || []);
      setFornecedores(fornecedoresList);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar fornecedores", "erro");
      setFornecedores([]);
    } finally {
      setLoading(false);
    }
  };

  const filtrarFornecedores = () => {
    let filtrados = [...fornecedores];
    
    if (busca) {
      filtrados = filtrados.filter(f =>
        f.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        f.nif?.toLowerCase().includes(busca.toLowerCase()) ||
        f.tipoServico?.toLowerCase().includes(busca.toLowerCase()) ||
        f.email?.toLowerCase().includes(busca.toLowerCase())
      );
    }
    
    if (statusFilter !== "todos") {
      filtrados = filtrados.filter(f => 
        statusFilter === "ativo" ? f.status === "Ativo" : f.status !== "Ativo"
      );
    }
    
    setFilteredFornecedores(filtrados);
  };

  const excluirFornecedor = async (id) => {
    if (!showDeleteModal) return;
    
    try {
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Fornecedor excluído com sucesso!", "sucesso");
        setShowDeleteModal(null);
        carregarFornecedores();
      } else {
        const data = await response.json();
        mostrarMensagem(data.mensagem || "Erro ao excluir fornecedor", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor) return "—";
    return new Intl.NumberFormat('pt-AO', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor) + " Kz";
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Ativo": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Inativo": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Bloqueado": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const estatisticas = {
    total: fornecedores.length,
    ativos: fornecedores.filter(f => f.status === "Ativo").length,
    comContratos: fornecedores.filter(f => f.contratos?.length > 0).length
  };

  // Overlay de redirecionamento
  if (redirecting) {
    return (
      <Layout title="Fornecedores" showBackButton={true} backToRoute="/menu">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Operação concluída com sucesso.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingEmpresas) {
    return (
      <Layout title="Fornecedores" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Fornecedores" showBackButton={true} backToRoute="/menu">
      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700 animate-scale-in">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmar Exclusão</h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-300">
                Tem certeza que deseja excluir este fornecedor?
              </p>
              <p className="text-sm text-gray-500 mt-2">Esta ação não pode ser desfeita.</p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirFornecedor(showDeleteModal)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Mensagem para Técnico */}
        {isTecnico() && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <EyeIcon size={18} />
              <span className="text-sm">
                Trabalhando com a empresa: <strong>{userEmpresaNome}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-sm opacity-90">Total de Fornecedores</p>
            <p className="text-2xl font-bold mt-1">{estatisticas.total}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 rounded-lg p-2">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Ativos</span>
            </div>
            <p className="text-sm opacity-90">Fornecedores Ativos</p>
            <p className="text-2xl font-bold mt-1">{estatisticas.ativos}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 rounded-lg p-2">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Contratos</span>
            </div>
            <p className="text-sm opacity-90">Com Contratos Ativos</p>
            <p className="text-2xl font-bold mt-1">{estatisticas.comContratos}</p>
          </div>
        </div>

        {/* Seletor de Empresa */}
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => carregarFornecedores()}
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
            {/* Barra de Ferramentas */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Pesquisar por nome, NIF ou serviço..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                      />
                    </div>
                    
                    <div className="relative flex-1 md:w-48">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <select
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="todos">Todos os Status</option>
                        <option value="ativo">Ativos</option>
                        <option value="inativo">Inativos</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={carregarFornecedores}
                      className="p-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-gray-400 hover:text-white hover:border-blue-500 transition-all duration-200"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => navigate("/fornecedores/novo")}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg"
                    >
                      <Plus size={18} /> Novo Fornecedor
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Fornecedores */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="animate-spin text-blue-400" size={40} />
                <p className="mt-4 text-gray-400">Carregando fornecedores...</p>
              </div>
            ) : filteredFornecedores.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
                <div className="bg-gray-700/30 rounded-full p-6 mb-4 inline-flex">
                  <Truck className="w-12 h-12 text-gray-500" />
                </div>
                <p className="text-gray-400 text-lg">Nenhum fornecedor encontrado</p>
                <p className="text-gray-500 text-sm mt-1">
                  {busca || statusFilter !== "todos" 
                    ? "Tente ajustar os filtros de busca" 
                    : "Clique em 'Novo Fornecedor' para começar"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFornecedores.map(fornecedor => (
                  <div 
                    key={fornecedor._id} 
                    className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 overflow-hidden shadow-lg"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                            <Truck className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">{fornecedor.nome}</h3>
                            <p className="text-sm text-gray-400">NIF: {fornecedor.nif}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${getStatusColor(fornecedor.status)}`}>
                            {fornecedor.status}
                          </span>
                          {fornecedor.contratos?.length > 0 && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {fornecedor.contratos.length} contrato(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {fornecedor.tipoServico && (
                          <div className="flex items-center gap-2 text-sm">
                            <Award className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-300">{fornecedor.tipoServico}</span>
                          </div>
                        )}
                        {fornecedor.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-300 truncate">{fornecedor.email}</span>
                          </div>
                        )}
                        {fornecedor.telefone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300">{fornecedor.telefone}</span>
                          </div>
                        )}
                        {fornecedor.proximoPagamento && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300">
                              Próximo pagamento: {formatarData(fornecedor.proximoPagamento)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/fornecedores/visualizar/${fornecedor._id}`)}
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Eye size={16} /> Ver
                        </button>
                        <button
                          onClick={() => navigate(`/fornecedores/editar/${fornecedor._id}`)}
                          className="flex-1 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Edit size={16} /> Editar
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(fornecedor._id)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-xl transition-all duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
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

export default ListaFornecedores;