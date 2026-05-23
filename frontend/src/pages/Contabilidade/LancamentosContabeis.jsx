// src/pages/Contabilidade/LancamentosContabeis.jsx
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import {
  FileText, Plus, Search, RefreshCw, Eye, Printer, Download,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Building2,
  TrendingUp, TrendingDown, BookOpen, Upload, FileSpreadsheet, 
  GitBranch, Database, Settings, Trash2, Filter
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

// Modal de Importação Excel
const ModalImportacao = ({ isOpen, onClose, onImport, onDownloadModelo, loading }) => {
  const [file, setFile] = useState(null);
  const [tipoImportacao, setTipoImportacao] = useState("lancamentos");
  const fileInputRef = useRef(null);

  const handleImport = () => {
    if (!file) {
      alert("❌ Selecione um ficheiro Excel");
      return;
    }
    onImport(file, tipoImportacao);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Importar Dados</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo de Importação</label>
            <select
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={tipoImportacao}
              onChange={(e) => setTipoImportacao(e.target.value)}
            >
              <option value="lancamentos">Lançamentos Contabilísticos</option>
              <option value="receitas">Receitas (Vendas)</option>
              <option value="custos">Custos (Pagamentos)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ficheiro Excel (.xlsx, .xls)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white file:bg-gray-600 file:border-0 file:text-white file:px-3 file:py-1 file:rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: Código, Descrição, Débito, Crédito, Data
            </p>
          </div>
          
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-blue-300 flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} />
              <strong>Modelo de Excel:</strong>
            </p>
            <button 
              onClick={onDownloadModelo}
              className="text-blue-400 text-xs hover:underline flex items-center gap-1"
            >
              📥 Baixar modelo de lançamentos (.xlsx)
            </button>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={18} /> {loading ? "Importando..." : "Importar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal de Sincronização
const ModalSincronizacao = ({ isOpen, onClose, onSync, loading, stats }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Sincronizar Dados</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Esta operação irá sincronizar automaticamente os lançamentos contabilísticos com:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Vendas registadas
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Pagamentos efectuados
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Transferências bancárias
            </li>
          </ul>
          
          {stats && (
            <div className="bg-gray-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-400">Resultado da última sincronização:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-green-400">Vendas: {stats.vendas || 0}</div>
                <div className="text-red-400">Pagamentos: {stats.pagamentos || 0}</div>
              </div>
            </div>
          )}
          
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <p className="text-xs text-yellow-300 flex items-center gap-2">
              <AlertCircle size={14} />
              <strong>Atenção:</strong> Esta operação pode criar novos lançamentos automaticamente.
            </p>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
            >
              Cancelar
            </button>
            <button
              onClick={onSync}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50"
            >
              <GitBranch size={18} /> {loading ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LancamentosContabeis = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalLancamentos, setTotalLancamentos] = useState(0);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    status: "todos"
  });
  const [resumo, setResumo] = useState({
    totalDebito: 0,
    totalCredito: 0,
    contabilizados: 0,
    pendentes: 0
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
      carregarLancamentos();
      carregarResumo();
    }
  }, [empresaSelecionada, pagina, filtros]);

  const buscarEmpresas = async () => {
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

  const carregarLancamentos = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId: empresaSelecionada || userEmpresaId,
        pagina,
        limite: 20
      });
      
      if (filtros.dataInicio) params.append("dataInicio", filtros.dataInicio);
      if (filtros.dataFim) params.append("dataFim", filtros.dataFim);
      if (filtros.status !== "todos") params.append("status", filtros.status);
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/lancamentos?${params}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setLancamentos(data.dados || []);
          setTotalPaginas(data.paginacao?.totalPaginas || 1);
          setTotalLancamentos(data.paginacao?.total || 0);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarResumo = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    try {
      const dataAtual = new Date();
      const response = await fetch(
        `${BASE_URL}/api/contabilidade/resumo?empresaId=${empresaSelecionada || userEmpresaId}&mes=${dataAtual.getMonth() + 1}&ano=${dataAtual.getFullYear()}`,
        { headers: getHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.dados) {
          setResumo({
            totalDebito: data.dados.totalDebito || 0,
            totalCredito: data.dados.totalCredito || 0,
            contabilizados: data.dados.lancamentosMes || 0,
            pendentes: 0
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar resumo:", error);
    }
  };

  // Download do modelo Excel
  const downloadModeloExcel = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_lancamentos.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert("✅ Download do modelo iniciado!");
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.mensagem || "Falha no download"}`);
      }
    } catch (error) {
      console.error("Erro no download:", error);
      alert("❌ Erro ao baixar modelo");
    }
  };

  // Importar Excel
  const handleImportExcel = async (file, tipo) => {
    setImportLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("empresaId", empresaSelecionada || userEmpresaId);
    formData.append("tipo", tipo);
    
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-excel`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        alert(`✅ ${data.mensagem}`);
        if (data.erros && data.erros.length > 0) {
          console.warn("Erros na importação:", data.erros);
          alert(`⚠️ Alguns registos não foram importados: ${data.erros.length} erros. Verifique o console.`);
        }
        setShowImportModal(false);
        carregarLancamentos();
        carregarResumo();
      } else {
        alert(`❌ Erro: ${data.mensagem || "Falha na importação"}`);
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("❌ Erro ao importar ficheiro");
    } finally {
      setImportLoading(false);
    }
  };

  // Sincronizar com sistema
  const handleSincronizar = async () => {
    setSyncLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/sincronizar`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada || userEmpresaId,
          sincronizarCom: ["vendas", "pagamentos"]
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        setSyncStats(data.resultados);
        alert(`✅ Sincronização concluída!\n\nVendas: ${data.resultados?.vendas || 0} lançamentos\nPagamentos: ${data.resultados?.pagamentos || 0} lançamentos`);
        carregarLancamentos();
        carregarResumo();
      } else {
        alert(`❌ Erro: ${data.mensagem || "Falha na sincronização"}`);
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      alert("❌ Erro ao sincronizar dados");
    } finally {
      setSyncLoading(false);
    }
  };

  const verDetalhes = (lancamento) => {
    setLancamentoSelecionado(lancamento);
    setShowDetalhes(true);
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "Contabilizado":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-900 text-green-300 text-xs"><CheckCircle size={12} /> Contabilizado</span>;
      case "Pendente":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs"><AlertCircle size={12} /> Pendente</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-700 text-gray-300 text-xs">{status}</span>;
    }
  };

  const getOrigemBadge = (origem) => {
    const cores = {
      "Venda": "bg-blue-900 text-blue-300",
      "Pagamento": "bg-red-900 text-red-300",
      "Transferencia": "bg-purple-900 text-purple-300",
      "Importado": "bg-yellow-900 text-yellow-300",
      "Ajuste": "bg-gray-700 text-gray-300"
    };
    const cor = cores[origem] || "bg-gray-700 text-gray-300";
    return <span className={`text-xs px-2 py-0.5 rounded-full ${cor}`}>{origem || "Sistema"}</span>;
  };

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Lançamentos Contabilísticos" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lançamentos Contabilísticos" showBackButton backToRoute="/contabilidade">
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
            <div className="flex items-center gap-3">
              <FileText size={28} className="text-green-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Lançamentos Contabilísticos</h2>
                <p className="text-gray-400 text-sm">Lançamentos gerados automaticamente pelo sistema</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 text-sm"
              >
                <FileSpreadsheet size={16} /> Importar Excel
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 text-sm"
              >
                <GitBranch size={16} /> Sincronizar
              </button>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Lançamentos</p>
                <p className="text-2xl font-bold">{totalLancamentos}</p>
              </div>
              <FileText size={28} className="opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Débitos</p>
                <p className="text-2xl font-bold">{formatarNumero(resumo.totalDebito)} Kz</p>
              </div>
              <TrendingUp size={28} className="opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Total Créditos</p>
                <p className="text-2xl font-bold">{formatarNumero(resumo.totalCredito)} Kz</p>
              </div>
              <TrendingDown size={28} className="opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">Contabilizados</p>
                <p className="text-2xl font-bold">{resumo.contabilizados}</p>
                <p className="text-xs opacity-75">Este mês</p>
              </div>
              <CheckCircle size={28} className="opacity-80" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input
                type="date"
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input
                type="date"
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
              >
                <option value="todos">Todos</option>
                <option value="Contabilizado">Contabilizado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            <div>
              <button onClick={carregarLancamentos} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
                <Search size={18} /> Filtrar
              </button>
            </div>
            <div className="flex-1"></div>
            <div className="flex gap-2">
              <button onClick={carregarLancamentos} className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
              <button className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white">
                <Download size={18} />
              </button>
              <button className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white">
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr className="text-left text-gray-300">
                  <th className="p-3">Nº</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3 text-right">Débito</th>
                  <th className="p-3 text-right">Crédito</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center p-8 text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2">Carregando...</p>
                    </td>
                  </tr>
                ) : lancamentos.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center p-8 text-gray-400">
                      <Database size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhum lançamento encontrado</p>
                      <p className="text-xs mt-1">Os lançamentos são gerados automaticamente a partir de Vendas e Pagamentos</p>
                      <button
                        onClick={() => setShowSyncModal(true)}
                        className="text-blue-400 hover:text-blue-300 mt-3 inline-flex items-center gap-2"
                      >
                        <GitBranch size={16} /> Sincronizar com sistema
                      </button>
                    </td>
                  </tr>
                ) : (
                  lancamentos.map((lanc) => (
                    <tr key={lanc._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3 font-mono text-xs">{lanc.numeroLancamento?.slice(-8)}</td>
                      <td className="p-3">{formatarData(lanc.dataLancamento)}</td>
                      <td className="p-3 max-w-xs truncate">{lanc.descricao}</td>
                      <td className="p-3">{getOrigemBadge(lanc.origem || "Sistema")}</td>
                      <td className="p-3 text-right text-green-400">{formatarNumero(lanc.totalDebito)}</td>
                      <td className="p-3 text-right text-red-400">{formatarNumero(lanc.totalCredito)}</td>
                      <td className="p-3">{getStatusBadge(lanc.status)}</td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => verDetalhes(lanc)}
                          className="text-blue-400 hover:text-blue-300 transition"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex justify-between items-center">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
            >
              <ChevronLeft size={18} /> Anterior
            </button>
            <span className="text-gray-400">Página {pagina} de {totalPaginas}</span>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
            >
              Próxima <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Modal de Detalhes */}
        {showDetalhes && lancamentoSelecionado && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Detalhes do Lançamento</h3>
                <button onClick={() => setShowDetalhes(false)} className="text-gray-400 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Número</p>
                    <p className="text-white font-mono">{lancamentoSelecionado.numeroLancamento}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Data</p>
                    <p className="text-white">{formatarData(lancamentoSelecionado.dataLancamento)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Origem</p>
                    <p>{getOrigemBadge(lancamentoSelecionado.origem || "Sistema")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <p>{getStatusBadge(lancamentoSelecionado.status)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400">Descrição</p>
                  <p className="text-white">{lancamentoSelecionado.descricao}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-400 mb-2">Partidas Contabilísticas</p>
                  <div className="bg-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-600">
                        <tr className="text-left text-gray-300">
                          <th className="p-2">Conta</th>
                          <th className="p-2">Descrição</th>
                          <th className="p-2 text-right">Débito</th>
                          <th className="p-2 text-right">Crédito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lancamentoSelecionado.partidas?.map((partida, idx) => (
                          <tr key={idx} className="border-t border-gray-600">
                            <td className="p-2 font-mono text-xs">{partida.contaCodigo}</td>
                            <td className="p-2">{partida.contaDescricao}</td>
                            <td className="p-2 text-right text-green-400">{formatarNumero(partida.debito)}</td>
                            <td className="p-2 text-right text-red-400">{formatarNumero(partida.credito)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDetalhes(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Importação */}
        <ModalImportacao
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportExcel}
          onDownloadModelo={downloadModeloExcel}
          loading={importLoading}
        />

        {/* Modal de Sincronização */}
        <ModalSincronizacao
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          onSync={handleSincronizar}
          loading={syncLoading}
          stats={syncStats}
        />

        {/* Informação de Automação */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
            <Database size={18} /> Automação Contabilística
          </h3>
          <p className="text-sm text-gray-300">
            Os lançamentos são gerados <strong className="text-green-400">automaticamente</strong> a partir das operações do sistema:
            Vendas, Pagamentos, Transferências e Folha Salarial. A intervenção manual é apenas para ajustes excepcionais.
          </p>
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Vendas</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Pagamentos</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div> Transferências</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Importação Excel</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LancamentosContabeis;