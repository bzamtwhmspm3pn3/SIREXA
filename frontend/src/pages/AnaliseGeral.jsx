// frontend/src/pages/AnaliseGeral.jsx - CORREÇÃO PARA TÉCNICO
import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  TrendingUp, 
  TrendingDown, 
  Building, 
  Users, 
  FileText, 
  BarChart3,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Target,
  Shield,
  DollarSign,
  PieChart,
  Activity,
  Eye
} from "lucide-react";

const AnaliseGeral = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [resumo, setResumo] = useState(null);
  const [insightsIA, setInsightsIA] = useState([]);
  const [previsoes, setPrevisoes] = useState([]);
  const [saudeFinanceira, setSaudeFinanceira] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [periodo, setPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);

  const BASE_URL = "https://sirexa-api.onrender.com";
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // 🔧 Função para gerar anos disponíveis (separada para reuso)
  const gerarAnosDisponiveis = () => {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 2; i <= anoAtual + 2; i++) {
      anos.push(i);
    }
    setAnosDisponiveis(anos);
  };

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    buscarEmpresas();
    // 🔧 Garantir que os anos sejam gerados mesmo para técnico
    gerarAnosDisponiveis();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarAnalise();
    }
  }, [empresaSelecionada, periodo]);

  const buscarEmpresas = async () => {
    // Se for técnico, não precisa carregar lista, usa a empresa designada
    if (isTecnico()) {
      setLoadingEmpresas(false);
      if (userEmpresaId) {
        setEmpresaSelecionada(userEmpresaId);
      }
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const headers = getHeaders();
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
      
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      setErro("Erro ao carregar empresas. Verifique sua conexão.");
      setTimeout(() => setErro(""), 5000);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarAnalise = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    setErro("");
    
    try {
      const headers = getHeaders();
      const url = `${BASE_URL}/api/analisegeral?empresaId=${empresaSelecionada}&mes=${periodo.mes}&ano=${periodo.ano}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        if (response.status === 403) {
          setErro("Acesso negado a esta empresa");
          setEmpresaSelecionada("");
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.sucesso && data.dados) {
        setResumo(data.dados.resumo);
        setInsightsIA(data.dados.insights || []);
        setPrevisoes(data.dados.previsoes || []);
        setSaudeFinanceira(data.dados.saudeFinanceira);
        setTopClientes(data.dados.topClientes || []);
        setTopProdutos(data.dados.topProdutos || []);
      } else {
        throw new Error(data.mensagem || "Erro ao carregar dados");
      }
      
    } catch (error) {
      console.error("Erro ao carregar análise:", error);
      setErro(`Erro ao carregar dados: ${error.message}`);
      setTimeout(() => setErro(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    const num = Number(numero);
    if (isNaN(num)) return "0,00";
    return num.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarMoeda = (numero) => `${formatarNumero(numero)} Kz`;

  const getCorScore = (score) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getClassificacaoTexto = (score) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Boa";
    if (score >= 40) return "Regular";
    return "Crítica";
  };

  // Loading inicial
  if (loadingEmpresas) {
    return (
      <Layout title="Análise Geral do Sistema" showBackButton={true} backToRoute="/menu">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <RefreshCw className="animate-spin mx-auto mb-4 text-blue-400" size={48} />
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Análise Geral do Sistema" showBackButton={true} backToRoute="/menu">
      <div className="space-y-6 p-4">
        {/* Mensagem de erro */}
        {erro && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg text-center border border-red-700">
            {erro}
          </div>
        )}

        {/* Mensagem para Técnico */}
        {isTecnico() && userEmpresaNome && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Eye size={18} />
              <span className="text-sm">
                Empresa designada: <strong>{userEmpresaNome}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Seleção de Empresa e Período */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-300">🏢 Empresa</label>
              {isTecnico() ? (
                <div className="bg-gray-700 p-2 rounded text-white">
                  {userEmpresaNome || "Empresa designada"}
                  <span className="text-xs text-gray-400 ml-2">(Atribuída pelo gestor)</span>
                </div>
              ) : (
                <select
                  className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                  value={empresaSelecionada}
                  onChange={(e) => setEmpresaSelecionada(e.target.value)}
                >
                  {empresas.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.nome}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">📅 Ano</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                value={periodo.ano}
                onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">📆 Mês</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                value={periodo.mes}
                onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })}
              >
                {meses.map((mes, idx) => (
                  <option key={idx} value={idx + 1}>{mes}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => carregarAnalise()}
              disabled={loading || !empresaSelecionada}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold text-white transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {loading ? "Processando..." : "Atualizar Análise"}
            </button>
          </div>
        </div>

        {!empresaSelecionada && !isTecnico() ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <Building className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">Selecione uma empresa para começar</p>
          </div>
        ) : resumo ? (
          <>
            {/* Score de Saúde Financeira */}
            {saudeFinanceira && (
              <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Shield size={32} className="text-blue-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">Saúde Financeira</h3>
                      <p className="text-gray-300 text-sm">Score baseado em múltiplos indicadores</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getCorScore(saudeFinanceira.score)}`}>
                      {saudeFinanceira.score}
                    </div>
                    <div className="text-sm text-gray-300">/ 100</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${getCorScore(saudeFinanceira.score)}`}>
                      {getClassificacaoTexto(saudeFinanceira.score)}
                    </div>
                    <div className="text-sm text-gray-300">Classificação Geral</div>
                  </div>
                </div>
              </div>
            )}

            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <CardAnalise 
                titulo="💰 Receita Total" 
                valor={formatarMoeda(resumo.receitaTotal)} 
                cor="bg-gradient-to-r from-green-700 to-green-600"
                icone={<TrendingUp size={24} />}
              />
              <CardAnalise 
                titulo="📉 Despesa Total" 
                valor={formatarMoeda(resumo.despesaTotal)} 
                cor="bg-gradient-to-r from-red-700 to-red-600"
                icone={<TrendingDown size={24} />}
              />
              <CardAnalise 
                titulo="📈 Lucro Líquido" 
                valor={formatarMoeda(resumo.lucro)} 
                cor="bg-gradient-to-r from-amber-700 to-amber-600"
                icone={<DollarSign size={24} />}
              />
              <CardAnalise 
                titulo="📊 Margem de Lucro" 
                valor={`${resumo.margemLucro?.toFixed(1) || "0,0"}%`} 
                cor="bg-gradient-to-r from-purple-700 to-purple-600"
                icone={<PieChart size={24} />}
              />
            </div>

            {/* Cards de Métricas Operacionais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardAnalise 
                titulo="🏢 Empresa" 
                valor={resumo.empresasAtivas || 1} 
                cor="bg-gradient-to-r from-indigo-700 to-indigo-600"
                icone={<Building size={24} />}
              />
              <CardAnalise 
                titulo="👥 Colaboradores" 
                valor={resumo.tecnicosActivos || 0} 
                cor="bg-gradient-to-r from-blue-700 to-blue-600"
                icone={<Users size={24} />}
              />
              <CardAnalise 
                titulo="📑 Transações" 
                valor={resumo.relatoriosGerados || 0} 
                cor="bg-gradient-to-r from-purple-700 to-purple-600"
                icone={<FileText size={24} />}
              />
            </div>

            {/* Top Clientes e Top Produtos */}
            {(topClientes.length > 0 || topProdutos.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {topClientes.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                      <Users size={20} /> Top Clientes
                    </h3>
                    <div className="space-y-3">
                      {topClientes.map((cliente, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-gray-700 pb-2">
                          <span className="text-white truncate max-w-[200px]">{cliente.nome}</span>
                          <span className="text-green-400 font-semibold">{formatarMoeda(cliente.totalCompras)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topProdutos.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                      <BarChart3 size={20} /> Produtos Mais Vendidos
                    </h3>
                    <div className="space-y-3">
                      {topProdutos.map((produto, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-gray-700 pb-2">
                          <span className="text-white truncate max-w-[200px]">{produto.nome}</span>
                          <div className="text-right">
                            <span className="text-green-400 font-semibold block">{formatarMoeda(produto.receita)}</span>
                            <span className="text-gray-400 text-xs">{produto.quantidade} unid.</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Insights IA */}
            {insightsIA.length > 0 && (
              <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <Brain className="text-blue-400" size={28} />
                    <h2 className="text-2xl font-bold text-white">Insights Inteligentes</h2>
                    <span className="bg-blue-600 text-xs px-2 py-1 rounded-full">IA</span>
                  </div>
                  <p className="text-gray-300 mt-2">Análise baseada nos dados do período</p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insightsIA.map((insight, idx) => (
                      <div 
                        key={idx}
                        className={`rounded-lg p-4 ${
                          insight.tipo === "positivo" ? "bg-green-900/30 border border-green-500" :
                          insight.tipo === "alerta" ? "bg-red-900/30 border border-red-500" :
                          insight.tipo === "critico" ? "bg-red-900/50 border border-red-600" :
                          "bg-blue-900/30 border border-blue-500"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`${
                            insight.tipo === "positivo" ? "text-green-400" :
                            insight.tipo === "alerta" ? "text-red-400" :
                            insight.tipo === "critico" ? "text-red-500" :
                            "text-blue-400"
                          }`}>
                            {insight.tipo === "positivo" ? <CheckCircle size={20} /> :
                             insight.tipo === "alerta" ? <AlertTriangle size={20} /> :
                             <Activity size={20} />}
                          </div>
                          <h3 className="font-semibold text-white">{insight.titulo}</h3>
                        </div>
                        <p className="text-sm text-gray-300">{insight.descricao}</p>
                        {insight.acaoRecomendada && (
                          <p className="text-xs text-blue-300 mt-2">💡 {insight.acaoRecomendada}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Previsões */}
            {previsoes.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="text-yellow-400" size={20} />
                  <h2 className="text-xl font-bold text-white">Previsões Financeiras</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {previsoes.map((previsao, idx) => (
                    <div key={idx} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-blue-400">{previsao.periodo}</span>
                        <Clock size={16} className="text-gray-400" />
                      </div>
                      <p className="text-2xl font-bold text-amber-400">{formatarMoeda(previsao.valor)}</p>
                      <p className="text-xs text-gray-400 mt-2">{previsao.descricao}</p>
                      {previsao.cenario && (
                        <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                          previsao.cenario === 'otimista' ? 'bg-green-600' :
                          previsao.cenario === 'conservador' ? 'bg-blue-600' : 'bg-yellow-600'
                        }`}>
                          Cenário {previsao.cenario}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evolução Mensal */}
            {resumo.receitaMensal && resumo.receitaMensal.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <Activity size={20} /> Evolução Mensal
                </h2>
                <div className="space-y-4">
                  {resumo.receitaMensal.map((item, idx) => {
                    const maxValor = Math.max(...resumo.receitaMensal.map(r => r.valor), 1);
                    const percentual = (item.valor / maxValor) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.mes}</span>
                          <span className="text-green-400">{formatarMoeda(item.valor)}</span>
                          {resumo.despesaMensal && resumo.despesaMensal[idx] && (
                            <span className="text-red-400">{formatarMoeda(resumo.despesaMensal[idx].valor)}</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all" 
                            style={{ width: `${Math.min(percentual, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recomendações Estratégicas */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <Lightbulb size={20} /> Recomendações Estratégicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">📈 Crescimento</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">• Expandir presença digital e redes sociais</li>
                    <li className="flex items-start gap-2">• Investir em marketing direcionado ao público-alvo</li>
                    <li className="flex items-start gap-2">• Capacitar equipa de vendas e atendimento</li>
                    <li className="flex items-start gap-2">• Explorar novos segmentos de mercado</li>
                  </ul>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">💰 Eficiência</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">• Otimizar processos operacionais e administrativos</li>
                    <li className="flex items-start gap-2">• Negociar melhores condições com fornecedores</li>
                    <li className="flex items-start gap-2">• Automatizar tarefas repetitivas</li>
                    <li className="flex items-start gap-2">• Implementar sistema de controlo de custos</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="text-center text-xs text-gray-500 mt-4">
              <p>Análise baseada nos dados de {meses[periodo.mes - 1]} de {periodo.ano}</p>
              <p className="mt-1">Sistema de Análise Inteligente | Dados em tempo real</p>
            </div>
          </>
        ) : loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <RefreshCw className="animate-spin mx-auto mb-4 text-blue-400" size={48} />
              <p className="text-gray-400">Carregando análise...</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-400 text-lg">Nenhum dado disponível</p>
            <p className="text-gray-500 text-sm mt-2">
              Selecione uma empresa e período para visualizar a análise.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

const CardAnalise = ({ titulo, valor, cor, icone }) => (
  <div className={`rounded-lg p-4 text-white shadow-md ${cor}`}>
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm font-medium opacity-90">{titulo}</h3>
        <p className="text-2xl font-bold mt-2">{valor}</p>
      </div>
      <div className="opacity-80">{icone}</div>
    </div>
  </div>
);

export default AnaliseGeral;