// src/pages/AvaliacaoDesempenho.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  Plus, Search, Star, Users, Calendar, TrendingUp, 
  Building2, Settings, Eye, Filter, Loader2, CheckCircle, 
  ClipboardList, UserCheck, Trash2
} from "lucide-react";
import ConfigurarAvaliacao from "./Avaliacao/ConfigurarAvaliacao";
import RealizarAvaliacao from "./Avaliacao/RealizarAvaliacao";
import VisualizarAvaliacao from "./Avaliacao/VisualizarAvaliacao";

const AvaliacaoDesempenho = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [configuracao, setConfiguracao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [busca, setBusca] = useState("");
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const [filtroStatus, setFiltroStatus] = useState("");
  
  // Estados dos modais
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRealizarModal, setShowRealizarModal] = useState(false);
  const [showVisualizarModal, setShowVisualizarModal] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  
  const { user, isTecnico, empresaId: userEmpresaId } = useAuth();

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
      carregarAvaliacoes();
      carregarFuncionarios();
      carregarConfiguracao();
    } else {
      setAvaliacoes([]);
      setFuncionarios([]);
    }
  }, [empresaSelecionada, filtroAno, filtroStatus]);

  const mostrarMensagem = useCallback((texto, tipo) => { 
    setMensagem({ texto, tipo }); 
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000); 
  }, []);

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
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      const empresaPadrao = empresasList[0]?._id || user?.empresaId;
      if (empresaPadrao && !empresaSelecionada) {
        setEmpresaSelecionada(empresaPadrao);
      }
    } catch (error) { 
      console.error("Erro ao carregar empresas:", error); 
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarAvaliacoes = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      let url = `https://sirexa-api.onrender.com/api/avaliacoes?empresaId=${empresaSelecionada}&ano=${filtroAno}`;
      if (filtroStatus) url += `&status=${filtroStatus}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      const avaliacoesList = data.sucesso ? data.dados : (Array.isArray(data) ? data : []);
      setAvaliacoes(avaliacoesList);
    } catch (error) { 
      console.error("Erro ao carregar avaliações:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const carregarFuncionarios = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/funcionarios?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      setFuncionarios(Array.isArray(data) ? data : (data.dados || []));
    } catch (error) { 
      console.error("Erro ao carregar funcionários:", error); 
    }
  };

  const carregarConfiguracao = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/avaliacoes/configuracao/${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      if (data.sucesso && data.config) {
        setConfiguracao(data.config);
      } else {
        setConfiguracao(null);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setConfiguracao(null);
    }
  };

  const excluirAvaliacao = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta avaliação?")) return;
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/avaliacoes/${id}`, { 
        method: "DELETE", 
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } 
      });
      if (response.ok) { 
        mostrarMensagem("Avaliação excluída com sucesso!", "sucesso"); 
        carregarAvaliacoes(); 
      } else {
        mostrarMensagem("Erro ao excluir avaliação", "erro");
      }
    } catch (error) { 
      mostrarMensagem("Erro ao conectar ao servidor", "erro"); 
    }
  };

  // Handlers para modais
  const handleOpenConfigModal = () => setShowConfigModal(true);
  const handleCloseConfigModal = () => {
    setShowConfigModal(false);
    carregarConfiguracao();
  };

  const handleOpenRealizarModal = () => setShowRealizarModal(true);
  const handleCloseRealizarModal = () => {
    setShowRealizarModal(false);
    carregarAvaliacoes();
    mostrarMensagem("Avaliação realizada com sucesso!", "sucesso");
  };

  // Função separada para quando a avaliação é salva com sucesso
  const handleRealizarSuccess = () => {
    setRedirecting(true);
    setTimeout(() => {
      setShowRealizarModal(false);
      carregarAvaliacoes();
      mostrarMensagem("Avaliação realizada com sucesso!", "sucesso");
      setRedirecting(false);
    }, 500);
  };

  const handleOpenVisualizarModal = (aval) => {
    setAvaliacaoSelecionada(aval);
    setShowVisualizarModal(true);
  };
  const handleCloseVisualizarModal = () => {
    setShowVisualizarModal(false);
    setAvaliacaoSelecionada(null);
  };

  const getStatusColor = (status) => {
    const cores = {
      "Concluído": "bg-green-600/20 text-green-400",
      "Aprovado": "bg-blue-600/20 text-blue-400",
      "Pendente": "bg-yellow-600/20 text-yellow-400",
      "Revisão": "bg-purple-600/20 text-purple-400"
    };
    return cores[status] || "bg-gray-600/20 text-gray-400";
  };

  const getClassificacaoColor = (nota) => {
    if (nota >= 90) return "text-purple-400";
    if (nota >= 75) return "text-blue-400";
    if (nota >= 60) return "text-green-400";
    if (nota >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString('pt-PT');
  };

  const avaliacoesFiltradas = avaliacoes.filter(a => 
    a.funcionarioNome?.toLowerCase().includes(busca.toLowerCase()) || 
    a.funcionario?.toLowerCase().includes(busca.toLowerCase()) || 
    a.periodo?.toLowerCase().includes(busca.toLowerCase())
  );
  
  const mediaGeral = avaliacoes.length > 0 ? 
    avaliacoes.reduce((acc, a) => acc + (a.notaTotal || a.notaGeral || 0), 0) / avaliacoes.length : 0;

  if (loadingEmpresas) {
    return (
      <Layout title="Avaliação de Desempenho" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  // Overlay de redirecionamento
  if (redirecting) {
    return (
      <Layout title="Avaliação de Desempenho" showBackButton={true} backToRoute="/menu">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Avaliação registrada com sucesso.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Avaliação de Desempenho" showBackButton={true} backToRoute="/menu">
      {/* Toast Notification */}
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            {mensagem.texto}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Seletor de Empresa */}
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarAvaliacoes(); carregarFuncionarios(); carregarConfiguracao(); }}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada && !isTecnico() ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">Selecione uma empresa para visualizar as avaliações</p>
          </div>
        ) : (
          <>
            {/* Métodos de Avaliação Configurados */}
            {configuracao && configuracao.metodosSelecionados && configuracao.metodosSelecionados.length > 0 && (
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-600 p-2 rounded-lg">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Métodos de Avaliação Configurados</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {configuracao.metodosSelecionados.map(metodo => (
                          <span 
                            key={metodo.key} 
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              configuracao.metodoPadrao === metodo.key 
                                ? "bg-green-600/30 text-green-400 border border-green-500/50" 
                                : "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {metodo.nome}
                            {configuracao.metodoPadrao === metodo.key && " ★"}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Método padrão: <span className="text-green-400">
                          {configuracao.metodosSelecionados.find(m => m.key === configuracao.metodoPadrao)?.nome || 
                           configuracao.metodosSelecionados[0]?.nome}
                        </span>
                      </p>
                    </div>
                  </div>
                  {!isTecnico() && (
                    <button
                      onClick={handleOpenConfigModal}
                      className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                    >
                      <Settings size={14} /> Configurar
                    </button>
                  )}
                </div>
              </div>
            )}

            {(!configuracao || !configuracao.metodosSelecionados || configuracao.metodosSelecionados.length === 0) && !isTecnico() && (
              <div className="bg-yellow-600/10 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-600 p-2 rounded-lg">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Nenhum método configurado</p>
                      <p className="text-white font-semibold">Configure os métodos de avaliação</p>
                    </div>
                  </div>
                  <button
                    onClick={handleOpenConfigModal}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Settings size={14} /> Configurar Agora
                  </button>
                </div>
              </div>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-blue-300 text-sm">Total</p><p className="text-3xl font-bold text-white">{avaliacoes.length}</p></div>
                  <ClipboardList className="text-blue-400" size={28} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-green-300 text-sm">Média</p><p className="text-3xl font-bold text-white">{mediaGeral.toFixed(1)}</p></div>
                  <TrendingUp className="text-green-400" size={28} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-purple-300 text-sm">Funcionários</p><p className="text-3xl font-bold text-white">{funcionarios.length}</p></div>
                  <Users className="text-purple-400" size={28} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <div><p className="text-yellow-300 text-sm">Concluídas</p><p className="text-3xl font-bold text-white">{avaliacoes.filter(a => a.status === "Concluído").length}</p></div>
                  <CheckCircle className="text-yellow-400" size={28} />
                </div>
              </div>
            </div>

            {/* Barra de Ferramentas */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por funcionário ou período..." 
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 transition" 
                      value={busca} 
                      onChange={(e) => setBusca(e.target.value)} 
                    />
                  </div>
                  <div className="flex gap-3 w-full md:w-auto flex-wrap">
                    <select 
                      className="px-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                      value={filtroAno} 
                      onChange={(e) => setFiltroAno(parseInt(e.target.value))}
                    >
                      <option value={2023}>2023</option>
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                    <select 
                      className="px-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                      value={filtroStatus} 
                      onChange={(e) => setFiltroStatus(e.target.value)}
                    >
                      <option value="">Todos Status</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Aprovado">Aprovado</option>
                    </select>
                    {!isTecnico() && (
                      <button
                        onClick={handleOpenConfigModal}
                        className="p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white transition"
                        title="Configurar Avaliação"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={handleOpenRealizarModal}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2.5 rounded-xl transition flex items-center gap-2"
                    >
                      <Plus size={18} /> Nova Avaliação
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Avaliações */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-blue-400" size={40} />
              </div>
            ) : avaliacoesFiltradas.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <Star className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhuma avaliação registrada para esta empresa</p>
                <button
                  onClick={handleOpenRealizarModal}
                  className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                >
                  Realizar Primeira Avaliação
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {avaliacoesFiltradas.map(aval => {
                  const nomeFuncionario = aval.funcionarioNome || aval.funcionario || "Funcionário não identificado";
                  
                  return (
                    <div key={aval._id} className="bg-gray-800 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                              <UserCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{nomeFuncionario}</h3>
                              <p className="text-sm text-gray-400">{aval.periodo}</p>
                              {aval.funcionarioCargo && (
                                <p className="text-xs text-gray-500">{aval.funcionarioCargo}</p>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(aval.status)}`}>
                            {aval.status}
                          </span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-500" />
                              <span className="text-sm text-gray-400">Data</span>
                            </div>
                            <span className="text-sm text-white">{formatarData(aval.dataAvaliacao || aval.data || aval.createdAt)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Star size={14} className="text-gray-500" />
                              <span className="text-sm text-gray-400">Nota Geral</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="text-yellow-400" size={16} />
                              <span className={`text-xl font-bold ${getClassificacaoColor(aval.notaTotal || aval.notaGeral)}`}>
                                {(aval.notaTotal || aval.notaGeral)?.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenVisualizarModal(aval)}
                            className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-xl transition flex items-center justify-center gap-2"
                          >
                            <Eye size={16} /> Ver Detalhes
                          </button>
                          <button
                            onClick={() => excluirAvaliacao(aval._id)}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-xl transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Configuração */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-5xl">
              <button
                onClick={handleCloseConfigModal}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              >
                ✕ Fechar
              </button>
              <ConfigurarAvaliacao 
                empresaId={empresaSelecionada}
                onClose={handleCloseConfigModal}
                onSave={carregarConfiguracao}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Realizar Avaliação */}
      {showRealizarModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-4xl">
              <RealizarAvaliacao 
                empresaId={empresaSelecionada}
                funcionarios={funcionarios}
                configuracao={configuracao}
                onSuccess={handleRealizarSuccess}
                onClose={() => setShowRealizarModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualizar Avaliação */}
      {showVisualizarModal && avaliacaoSelecionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-4xl">
              <button
                onClick={handleCloseVisualizarModal}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              >
                ✕ Fechar
              </button>
              <VisualizarAvaliacao 
                avaliacao={avaliacaoSelecionada}
                onClose={handleCloseVisualizarModal}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in-out { animation: fade-in-out 3s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </Layout>
  );
};

export default AvaliacaoDesempenho;