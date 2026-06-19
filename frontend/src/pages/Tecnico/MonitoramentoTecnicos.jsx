// src/pages/Tecnico/MonitoramentoTecnicos.jsx
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Activity, Search, Filter, Calendar, RefreshCw, 
  Eye, User, Building2, Clock, CheckCircle, XCircle,
  Download, Printer, ChevronLeft, ChevronRight,
  TrendingUp, Users, FileText, DollarSign, BookOpen,ShoppingCart, Package
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { carregarLogoBase64, drawCabecalhoProfissional, drawRodape } from '../../utils/pdfUtils';

const MonitoramentoTecnicos = () => {
  const { user, isGestor, empresaId: userEmpresaId } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [estatisticas, setEstatisticas] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    modulo: "todos",
    acao: "todos",
    usuarioId: "todos"
  });
  const [modoExibicao, setModoExibicao] = useState("lista"); // lista, estatisticas

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (isGestor()) {
      carregarEmpresas();
    } else {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarLogs();
      carregarEstatisticas();
      carregarTecnicos();
    }
  }, [empresaSelecionada, pagina, filtros]);

  const carregarEmpresas = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    }
  };

  const carregarTecnicos = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/tecnico/empresa/${empresaSelecionada}`, {
        headers: getHeaders()
      });
      const data = await response.json();
      setTecnicos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar técnicos:", error);
    }
  };

  const carregarLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId: empresaSelecionada,
        pagina,
        limite: 30
      });
      
      if (filtros.dataInicio) params.append("dataInicio", filtros.dataInicio);
      if (filtros.dataFim) params.append("dataFim", filtros.dataFim);
      if (filtros.modulo !== "todos") params.append("modulo", filtros.modulo);
      if (filtros.acao !== "todos") params.append("acao", filtros.acao);
      if (filtros.usuarioId !== "todos") params.append("usuarioId", filtros.usuarioId);
      
      const response = await fetch(`${BASE_URL}/api/logs?${params}`, { headers: getHeaders() });
      const data = await response.json();
      
      if (data.sucesso) {
        setLogs(data.dados || []);
        setTotalPaginas(data.paginacao?.totalPaginas || 1);
      }
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/logs/estatisticas?empresaId=${empresaSelecionada}`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.sucesso) {
        setEstatisticas(data.dados);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO") + " " + new Date(data).toLocaleTimeString("pt-AO");
  };

  const getAcaoBadge = (acao) => {
    const cores = {
      CREATE: "bg-green-900 text-green-300",
      UPDATE: "bg-blue-900 text-blue-300",
      DELETE: "bg-red-900 text-red-300",
      VIEW: "bg-gray-700 text-gray-300",
      LOGIN: "bg-purple-900 text-purple-300",
      LOGOUT: "bg-yellow-900 text-yellow-300"
    };
    const cor = cores[acao] || "bg-gray-700 text-gray-300";
    return <span className={`text-xs px-2 py-0.5 rounded-full ${cor}`}>{acao}</span>;
  };

  const getModuloIcone = (modulo) => {
    const icones = {
      vendas: <ShoppingCart size={14} className="text-green-400" />,
      stock: <Package size={14} className="text-yellow-400" />,
      contabilidade: <BookOpen size={14} className="text-indigo-400" />,
      funcionarios: <Users size={14} className="text-blue-400" />,
      financeiro: <DollarSign size={14} className="text-emerald-400" />
    };
    return icones[modulo] || <FileText size={14} className="text-gray-400" />;
  };

  const exportarExcel = () => {
    const dadosExport = logs.map(log => ({
      "Data/Hora": formatarData(log.createdAt),
      "Técnico": log.usuarioNome,
      "Email": log.usuarioEmail,
      "Ação": log.acao,
      "Módulo": log.modulo,
      "Descrição": log.descricao,
      "Status": log.sucesso ? "Sucesso" : "Erro"
    }));
    
    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoramento");
    XLSX.writeFile(wb, `monitoramento_${new Date().toISOString().split("T")[0]}.xlsx`);
    alert("✅ Excel exportado com sucesso!");
  };

  const exportarPDF = async () => {
    const empresaAtual = empresas.find(e => e._id === empresaSelecionada) || { nome: "Empresa" };
    const logo = await carregarLogoBase64(empresaAtual);
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    let yPos = drawCabecalhoProfissional(doc, empresaAtual, logo) + 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Período: ${filtros.dataInicio || "Início"} a ${filtros.dataFim || "Actual"}`, 14, yPos);
    yPos += 8;
    
    const dadosTabela = logs.map(log => [
      formatarData(log.createdAt),
      log.usuarioNome,
      log.acao,
      log.modulo,
      log.descricao?.substring(0, 50) || "",
      log.sucesso ? "✅" : "❌"
    ]);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [["Data/Hora", "Técnico", "Ação", "Módulo", "Descrição", "Status"]],
      body: dadosTabela,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 7, cellPadding: 2 }
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    drawRodape(doc, empresaAtual?.nome || 'Empresa', pageCount);
    doc.save(`monitoramento_${new Date().toISOString().split("T")[0]}.pdf`);
    alert("✅ PDF exportado com sucesso!");
  };

  const modulosDisponiveis = [
    "vendas", "stock", "facturacao", "funcionarios", "folhaSalarial",
    "contabilidade", "planoContas", "lancamentos", "financeiro", "relatorios"
  ];

  if (loading && logs.length === 0) {
    return (
      <Layout title="Monitoramento de Técnicos" showBackButton backToRoute="/tecnico">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Monitoramento de Técnicos" showBackButton backToRoute="/tecnico">
      <div className="space-y-6 p-4">
        {/* Cabeçalho */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity size={28} className="text-blue-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Monitoramento de Técnicos</h2>
                <p className="text-gray-400 text-sm">Registo de atividades e ações realizadas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setModoExibicao(modoExibicao === "lista" ? "estatisticas" : "lista")}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-white"
              >
                {modoExibicao === "lista" ? "📊 Ver Estatísticas" : "📋 Ver Lista"}
              </button>
              <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white">
                <Download size={18} /> Excel
              </button>
              <button onClick={exportarPDF} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white">
                <Printer size={18} /> PDF
              </button>
              <button onClick={carregarLogs} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Seletor de Empresa */}
        {isGestor() && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-gray-400" />
              <span className="text-gray-300">Empresa:</span>
              <select
                className="bg-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                value={empresaSelecionada}
                onChange={(e) => setEmpresaSelecionada(e.target.value)}
              >
                {empresas.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.nome}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input
                type="date"
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input
                type="date"
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Módulo</label>
              <select
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.modulo}
                onChange={(e) => setFiltros({...filtros, modulo: e.target.value})}
              >
                <option value="todos">Todos os módulos</option>
                {modulosDisponiveis.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ação</label>
              <select
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.acao}
                onChange={(e) => setFiltros({...filtros, acao: e.target.value})}
              >
                <option value="todos">Todas</option>
                <option value="CREATE">Criação</option>
                <option value="UPDATE">Edição</option>
                <option value="DELETE">Eliminação</option>
                <option value="VIEW">Visualização</option>
                <option value="LOGIN">Login</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Técnico</label>
              <select
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={filtros.usuarioId}
                onChange={(e) => setFiltros({...filtros, usuarioId: e.target.value})}
              >
                <option value="todos">Todos os técnicos</option>
                {tecnicos.map(tec => (
                  <option key={tec._id} value={tec._id}>{tec.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={carregarLogs} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
              <Search size={18} /> Aplicar Filtros
            </button>
          </div>
        </div>

        {/* Modo Estatísticas */}
        {modoExibicao === "estatisticas" && estatisticas && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Total de Atividades</p>
                <p className="text-2xl font-bold">{estatisticas.total || 0}</p>
                <p className="text-xs opacity-75">Últimos 30 dias</p>
              </div>
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Criações</p>
                <p className="text-2xl font-bold">
                  {estatisticas.estatisticas?.filter(e => e._id.acao === 'CREATE').reduce((s, e) => s + e.total, 0) || 0}
                </p>
              </div>
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Edições</p>
                <p className="text-2xl font-bold">
                  {estatisticas.estatisticas?.filter(e => e._id.acao === 'UPDATE').reduce((s, e) => s + e.total, 0) || 0}
                </p>
              </div>
              <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white">
                <p className="text-sm opacity-90">Eliminações</p>
                <p className="text-2xl font-bold">
                  {estatisticas.estatisticas?.filter(e => e._id.acao === 'DELETE').reduce((s, e) => s + e.total, 0) || 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Atividades por Módulo */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <FileText size={18} /> Atividades por Módulo
                </h3>
                <div className="space-y-2">
                  {estatisticas.estatisticas?.slice(0, 10).map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getModuloIcone(stat._id.modulo)}
                        <span className="text-gray-300 capitalize">{stat._id.modulo}</span>
                        <span className="text-xs text-gray-500">({stat._id.acao})</span>
                      </div>
                      <span className="text-white font-bold">{stat.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Técnicos */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Users size={18} /> Técnicos Mais Ativos
                </h3>
                <div className="space-y-2">
                  {estatisticas.porUsuario?.map((user, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-blue-400" />
                        <span className="text-gray-300">{user._id.usuarioNome}</span>
                        <span className="text-xs text-gray-500">({user._id.usuarioTipo})</span>
                      </div>
                      <span className="text-white font-bold">{user.total} atividades</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modo Lista - Tabela de Logs */}
        {modoExibicao === "lista" && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr className="text-left text-gray-300">
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Técnico</th>
                    <th className="p-3">Ação</th>
                    <th className="p-3">Módulo</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center p-8 text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2">Carregando...</p>
                    </td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan="6" className="text-center p-8 text-gray-400">
                      <Activity size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhuma atividade registada</p>
                    </td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3 text-xs">{formatarData(log.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-blue-400" />
                            <span>{log.usuarioNome}</span>
                          </div>
                          <p className="text-xs text-gray-500">{log.usuarioEmail}</p>
                        </td>
                        <td className="p-3">{getAcaoBadge(log.acao)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {getModuloIcone(log.modulo)}
                            <span className="capitalize">{log.modulo}</span>
                          </div>
                        </td>
                        <td className="p-3 max-w-xs truncate" title={log.descricao}>
                          {log.descricao}
                        </td>
                        <td className="p-3 text-center">
                          {log.sucesso ? 
                            <CheckCircle size={18} className="text-green-400 mx-auto" /> : 
                            <XCircle size={18} className="text-red-400 mx-auto" />
                          }
                        </td>
                       </tr>
                    ))
                  )}
                </tbody>
               </table>
            </div>
          </div>
        )}

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

        {/* Legenda */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Legenda</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded"></div><span className="text-gray-400">CREATE - Criação</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"></div><span className="text-gray-400">UPDATE - Edição</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600 rounded"></div><span className="text-gray-400">DELETE - Eliminação</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-600 rounded"></div><span className="text-gray-400">VIEW - Visualização</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-600 rounded"></div><span className="text-gray-400">LOGIN - Login</span></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MonitoramentoTecnicos;