// src/pages/Contabilidade/DashboardContabilidade.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  RefreshCw,
  Eye,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Printer,
  Download,
  Search,
  BookCopy,
  ClipboardList,
  Wallet,
  Lock,
  Loader2
} from "lucide-react";

// Componente de Seletor de Empresa
const EmpresaSelector = ({ empresas, empresaSelecionada, setEmpresaSelecionada, onRefresh, loading, isTecnico, empresaNome }) => {
  if (isTecnico) {
    return (
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Building2 size={18} className="text-blue-400" />
          <div>
            <p className="text-xs text-gray-400">Empresa Designada</p>
            <p className="text-white font-semibold">{empresaNome || "Carregando..."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-gray-400" />
          <span className="text-sm text-gray-300">Empresa:</span>
        </div>
        <select
          className="bg-gray-700 rounded-lg px-3 py-1.5 text-white text-sm flex-1 min-w-[200px]"
          value={empresaSelecionada}
          onChange={(e) => setEmpresaSelecionada(e.target.value)}
          disabled={loading}
        >
          <option value="">Selecione uma empresa...</option>
          {empresas.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.nome}
            </option>
          ))}
        </select>
        <button
          onClick={onRefresh}
          className="bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-white flex items-center gap-1 text-sm"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>
    </div>
  );
};

const DashboardContabilidade = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    totalLancamentos: 0,
    totalDebito: 0,
    totalCredito: 0,
    lancamentosMes: 0,
    ultimosLancamentos: [],
    saldoContas: {}
  });
  const [periodo, setPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

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
    buscarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarDashboard();
    }
  }, [empresaSelecionada, periodo]);

  const buscarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      setLoading(false);
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
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarDashboard = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/contabilidade/resumo?empresaId=${empresaSelecionada || userEmpresaId}&mes=${periodo.mes}&ano=${periodo.ano}`,
        { headers: getHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setResumo(data.dados);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const modulosContabilidade = [
    { titulo: "Plano de Contas", descricao: "Estrutura completa do PGC", icon: <BookOpen size={24} />, cor: "bg-blue-500", path: "/contabilidade/plano-contas" },
    { titulo: "Lançamentos", descricao: "Partidas dobradas", icon: <FileText size={24} />, cor: "bg-green-500", path: "/contabilidade/lancamentos" },
    { titulo: "Diário Geral", descricao: "Registo cronológico", icon: <BookCopy size={24} />, cor: "bg-teal-500", path: "/contabilidade/diario-geral" },
    { titulo: "Razão Geral", descricao: "Movimentos por conta", icon: <ClipboardList size={24} />, cor: "bg-cyan-500", path: "/contabilidade/razao-geral" },
    { titulo: "Balancete", descricao: "Verificação de saldos", icon: <TrendingUp size={24} />, cor: "bg-yellow-500", path: "/contabilidade/balancete" },
    { titulo: "Saldos de Contas", descricao: "Posição dos saldos", icon: <Wallet size={24} />, cor: "bg-purple-500", path: "/contabilidade/saldos" },
    { titulo: "Balanço Patrimonial", descricao: "Ativo e Passivo", icon: <PieChart size={24} />, cor: "bg-red-500", path: "/contabilidade/balanco-patrimonial" },
    { titulo: "Períodos Fiscais", descricao: "Exercícios contabilísticos", icon: <Calendar size={24} />, cor: "bg-indigo-500", path: "/contabilidade/periodos-fiscais" },
    { titulo: "Encerramento", descricao: "Fecho do exercício", icon: <Lock size={24} />, cor: "bg-orange-500", path: "/contabilidade/encerramento" }
  ];

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Contabilidade - Dashboard" showBackButton backToRoute="/menu">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Contabilidade - Dashboard" showBackButton backToRoute="/menu">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">Selecione uma empresa para continuar</p>
            <button 
              onClick={() => setEmpresaSelecionada(empresas[0]?._id)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
            >
              Selecionar Empresa
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Contabilidade - Dashboard" showBackButton backToRoute="/menu">
      <div className="space-y-6 p-4">
        {/* Seletor de Empresa */}
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={buscarEmpresas}
          loading={loadingEmpresas}
          isTecnico={isTecnico()}
          empresaNome={userEmpresaNome}
        />

        {/* Cabeçalho */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Sistema Contabilístico</h2>
              <p className="text-gray-400 text-sm">Plano de Contas Geral (PGC)</p>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Lançamentos</p>
                <p className="text-2xl font-bold">{resumo.totalLancamentos || 0}</p>
                <p className="text-xs opacity-75">Este período</p>
              </div>
              <FileText size={28} className="opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Débitos</p>
                <p className="text-2xl font-bold">{formatarNumero(resumo.totalDebito)}</p>
                <p className="text-xs opacity-75">Kz</p>
              </div>
              <TrendingUp size={28} className="opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Créditos</p>
                <p className="text-2xl font-bold">{formatarNumero(resumo.totalCredito)}</p>
                <p className="text-xs opacity-75">Kz</p>
              </div>
              <TrendingDown size={28} className="opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Saldo</p>
                <p className="text-2xl font-bold">
                  {formatarNumero(Math.abs((resumo.totalDebito || 0) - (resumo.totalCredito || 0)))}
                </p>
                <p className="text-xs opacity-75">
                  {(resumo.totalDebito || 0) >= (resumo.totalCredito || 0) ? "Devedor" : "Credor"}
                </p>
              </div>
              <DollarSign size={28} className="opacity-80" />
            </div>
          </div>
        </div>

        {/* Seletor de Período */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-400" />
              <span className="text-gray-300">Período:</span>
              <select 
                className="bg-gray-700 rounded-lg px-3 py-1 text-white"
                value={periodo.mes}
                onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })}
              >
                {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((mes, i) => (
                  <option key={i} value={i + 1}>{mes}</option>
                ))}
              </select>
              <select 
                className="bg-gray-700 rounded-lg px-3 py-1 text-white"
                value={periodo.ano}
                onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}
              >
                {[2023, 2024, 2025, 2026].map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={carregarDashboard}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded-lg flex items-center gap-2 text-white"
            >
              <RefreshCw size={16} /> Actualizar
            </button>
          </div>
        </div>

        {/* Módulos de Contabilidade */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Módulos Contabilísticos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {modulosContabilidade.map((modulo, index) => (
              <Link
                key={index}
                to={modulo.path}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:bg-gray-700 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className={`${modulo.cor} p-3 rounded-lg`}>
                    {modulo.icon}
                  </div>
                  <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition" />
                </div>
                <h4 className="text-white font-semibold mt-3">{modulo.titulo}</h4>
                <p className="text-gray-400 text-sm mt-1">{modulo.descricao}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Últimos Lançamentos */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-bold text-white">Últimos Lançamentos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr className="text-left text-gray-300">
                  <th className="p-3">Nº Lançamento</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Débito</th>
                  <th className="p-3 text-right">Crédito</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {resumo.ultimosLancamentos?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-gray-400">
                      Nenhum lançamento encontrado neste período
                    </td>
                  </tr>
                ) : (
                  resumo.ultimosLancamentos?.map((lanc, idx) => (
                    <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3 font-mono text-xs">{lanc.numeroLancamento}</td>
                      <td className="p-3">{formatarData(lanc.dataLancamento)}</td>
                      <td className="p-3">{lanc.descricao}</td>
                      <td className="p-3 text-right text-green-400">{formatarNumero(lanc.totalDebito)}</td>
                      <td className="p-3 text-right text-red-400">{formatarNumero(lanc.totalCredito)}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-900 text-green-300 text-xs">
                          <CheckCircle size={12} /> {lanc.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-gray-700 text-right">
            <Link to="/contabilidade/lancamentos" className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-end gap-1">
              Ver todos <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Classes do PGC */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">Plano de Contas Geral (PGC)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-900/30 rounded-lg p-3 text-center border border-blue-700">
              <div className="text-2xl font-bold text-blue-400">Classe 1</div>
              <div className="text-xs text-gray-300">Meios Fixos</div>
            </div>
            <div className="bg-green-900/30 rounded-lg p-3 text-center border border-green-700">
              <div className="text-2xl font-bold text-green-400">Classe 2</div>
              <div className="text-xs text-gray-300">Existências</div>
            </div>
            <div className="bg-yellow-900/30 rounded-lg p-3 text-center border border-yellow-700">
              <div className="text-2xl font-bold text-yellow-400">Classe 3</div>
              <div className="text-xs text-gray-300">Terceiros</div>
            </div>
            <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-700">
              <div className="text-2xl font-bold text-purple-400">Classe 4</div>
              <div className="text-xs text-gray-300">Meios Monetários</div>
            </div>
            <div className="bg-pink-900/30 rounded-lg p-3 text-center border border-pink-700">
              <div className="text-2xl font-bold text-pink-400">Classe 5</div>
              <div className="text-xs text-gray-300">Capital</div>
            </div>
            <div className="bg-indigo-900/30 rounded-lg p-3 text-center border border-indigo-700">
              <div className="text-2xl font-bold text-indigo-400">Classe 6</div>
              <div className="text-xs text-gray-300">Proveitos</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-3 text-center border border-red-700">
              <div className="text-2xl font-bold text-red-400">Classe 7</div>
              <div className="text-xs text-gray-300">Custos</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center border border-gray-600">
              <div className="text-2xl font-bold text-gray-400">Classe 8/9</div>
              <div className="text-xs text-gray-300">Analíticas/Ordem</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardContabilidade;