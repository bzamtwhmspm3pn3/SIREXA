// src/pages/Contabilidade/RazaoGeral.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  BookOpen, Search, RefreshCw, Download, Printer, FileSpreadsheet,
  ChevronLeft, ChevronRight, Building2, TrendingUp, TrendingDown,
  Filter, Calendar, Eye, FileText, Wallet, Loader2, Upload, GitBranch,
  XCircle, CheckCircle, AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { carregarLogoBase64, drawCabecalhoProfissional, drawRodape } from '../../utils/pdfUtils';

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
  const fileInputRef = useRef(null);

  const handleImport = () => {
    if (!file) {
      alert("❌ Selecione um ficheiro Excel");
      return;
    }
    onImport(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Importar Movimentos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
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
              Formato: Data, Nº Lançamento, Descrição, Débito, Crédito
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
              📥 Baixar modelo do Razão (.xlsx)
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
            Esta operação irá sincronizar os movimentos da conta com:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Lançamentos do sistema
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Vendas e Pagamentos
            </li>
          </ul>
          
          {stats && (
            <div className="bg-gray-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-400">Resultado da última sincronização:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-green-400">Movimentos: {stats.movimentos || 0}</div>
                <div className="text-blue-400">Lançamentos: {stats.lancamentos || 0}</div>
              </div>
            </div>
          )}
          
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

const RazaoGeral = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [contas, setContas] = useState([]);
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [movimentos, setMovimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: ""
  });
  const [saldoInfo, setSaldoInfo] = useState({
    saldoAnterior: 0,
    totalDebito: 0,
    totalCredito: 0,
    saldoAtual: 0
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
    carregarContas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarContas();
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    if (empresaSelecionada && contaSelecionada) {
      carregarRazao();
    }
  }, [empresaSelecionada, contaSelecionada, filtros]);

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

  const carregarContas = async () => {
    try {
      const id = empresaSelecionada || userEmpresaId;
      if (!id) return;
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/plano-contas?empresaId=${id}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setContas(data.dados || []);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  const carregarRazao = async () => {
    if (!contaSelecionada) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId: empresaSelecionada || userEmpresaId,
        conta: contaSelecionada
      });
      
      if (filtros.dataInicio) params.append("dataInicio", filtros.dataInicio);
      if (filtros.dataFim) params.append("dataFim", filtros.dataFim);
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/lancamentos?${params}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          const lancamentos = data.dados || [];
          
          const movs = [];
          let saldoAcumulado = 0;
          
          lancamentos.forEach(lanc => {
            lanc.partidas?.forEach(partida => {
              if (partida.contaCodigo === contaSelecionada) {
                const debito = partida.debito || 0;
                const credito = partida.credito || 0;
                saldoAcumulado += debito - credito;
                
                movs.push({
                  data: lanc.dataLancamento,
                  numeroLancamento: lanc.numeroLancamento,
                  descricao: lanc.descricao,
                  debito,
                  credito,
                  saldo: saldoAcumulado
                });
              }
            });
          });
          
          setMovimentos(movs);
          
          const totalDebito = movs.reduce((sum, m) => sum + m.debito, 0);
          const totalCredito = movs.reduce((sum, m) => sum + m.credito, 0);
          const saldoAtual = totalDebito - totalCredito;
          
          setSaldoInfo({ saldoAnterior: 0, totalDebito, totalCredito, saldoAtual });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar razão:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadModeloExcel = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-excel-razao`, {
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
        a.download = 'modelo_razao_geral.xlsx';
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

  const handleImportExcel = async (file) => {
    setImportando(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("empresaId", empresaSelecionada || userEmpresaId);
    formData.append("conta", contaSelecionada);
    
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-excel-razao`, {
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
          alert(`⚠️ Alguns registos não foram importados: ${data.erros.length} erros.`);
        }
        setShowImportModal(false);
        carregarRazao();
      } else {
        alert(`❌ Erro: ${data.mensagem || "Falha na importação"}`);
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("❌ Erro ao importar ficheiro");
    } finally {
      setImportando(false);
    }
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/sincronizar-razao`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada || userEmpresaId,
          conta: contaSelecionada
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        setSyncStats(data.resultados);
        alert(`✅ Sincronização concluída!\n\nMovimentos: ${data.resultados?.movimentos || 0}`);
        carregarRazao();
      } else {
        alert(`❌ Erro: ${data.mensagem || "Falha na sincronização"}`);
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      alert("❌ Erro ao sincronizar dados");
    } finally {
      setSincronizando(false);
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

  const exportarExcel = () => {
    setExportando(true);
    try {
      const dadosExport = movimentos.map(mov => ({
        "Data": formatarData(mov.data),
        "Nº Lançamento": mov.numeroLancamento,
        "Descrição": mov.descricao,
        "Débito (Kz)": mov.debito,
        "Crédito (Kz)": mov.credito,
        "Saldo (Kz)": mov.saldo
      }));
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Razao_${contaSelecionada}`);
      
      XLSX.writeFile(wb, `razao_${contaSelecionada}_${new Date().toISOString().split("T")[0]}.xlsx`);
      alert("✅ Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("❌ Erro ao exportar Excel");
    } finally {
      setExportando(false);
    }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const empresaObj = isTecnico()
        ? { _id: userEmpresaId, nome: userEmpresaNome }
        : empresas.find(e => e._id === empresaSelecionada);
      const logo = await carregarLogoBase64(empresaObj);
      const empresaNome = empresaObj?.nome || "Não selecionada";
      
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const contaInfo = contas.find(c => c.codigo === contaSelecionada);
      
      let yPos = drawCabecalhoProfissional(doc, empresaObj, logo);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RAZÃO GERAL", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
      
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Conta: ${contaSelecionada} - ${contaInfo?.nome || ""}`, 14, yPos);
      yPos += 7;
      doc.text(`Período: ${filtros.dataInicio || "Início"} a ${filtros.dataFim || "Actual"}`, 14, yPos);
      
      const dadosTabela = movimentos.map(mov => [
        formatarData(mov.data),
        mov.numeroLancamento,
        mov.descricao?.substring(0, 40) || "",
        formatarNumero(mov.debito),
        formatarNumero(mov.credito),
        `${formatarNumero(Math.abs(mov.saldo))} ${mov.saldo >= 0 ? 'D' : 'C'}`
      ]);
      
      autoTable(doc, {
        startY: yPos + 6,
        head: [["Data", "Nº", "Descrição", "Débito", "Crédito", "Saldo"]],
        body: dadosTabela,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2 }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      drawRodape(doc, empresaNome, pageCount);
      doc.save(`razao_${contaSelecionada}_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  const contaInfo = contas.find(c => c.codigo === contaSelecionada);

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Razão Geral" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Razão Geral" showBackButton backToRoute="/contabilidade">
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
    <Layout title="Razão Geral" showBackButton backToRoute="/contabilidade">
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
              <BookOpen size={28} className="text-cyan-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Razão Geral</h2>
                <p className="text-gray-400 text-sm">Movimentos detalhados por conta contabilística</p>
              </div>
            </div>
            {contaSelecionada && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  disabled={!contaSelecionada}
                  className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Upload size={16} /> Importar
                </button>
                <button
                  onClick={() => setShowSyncModal(true)}
                  disabled={!contaSelecionada}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <GitBranch size={16} /> Sincronizar
                </button>
                <button onClick={exportarExcel} disabled={exportando || movimentos.length === 0} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50">
                  <FileSpreadsheet size={18} /> Excel
                </button>
                <button onClick={exportarPDF} disabled={exportando || movimentos.length === 0} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50">
                  <Printer size={18} /> PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Seletor de Conta */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs text-gray-400 mb-1">Conta Contabilística</label>
              <select
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={contaSelecionada}
                onChange={(e) => setContaSelecionada(e.target.value)}
              >
                <option value="">Selecione uma conta...</option>
                {contas.map(conta => (
                  <option key={conta.codigo} value={conta.codigo}>
                    {conta.codigo} - {conta.nome}
                  </option>
                ))}
              </select>
            </div>
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
              <button onClick={carregarRazao} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
                <Search size={18} /> Consultar
              </button>
            </div>
          </div>
        </div>

        {/* Informação da Conta */}
        {contaInfo && (
          <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-400">Código</p><p className="text-white font-mono font-bold">{contaInfo.codigo}</p></div>
              <div><p className="text-xs text-gray-400">Nome</p><p className="text-white">{contaInfo.nome}</p></div>
              <div><p className="text-xs text-gray-400">Classe</p><p className="text-white">{contaInfo.classe}</p></div>
              <div><p className="text-xs text-gray-400">Natureza</p><p className="text-white">{contaInfo.natureza}</p></div>
            </div>
          </div>
        )}

        {/* Cards de Saldo */}
        {contaSelecionada && movimentos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <p className="text-xs text-gray-400">Total Débitos</p>
              <p className="text-xl font-bold text-green-400">{formatarNumero(saldoInfo.totalDebito)} Kz</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <p className="text-xs text-gray-400">Total Créditos</p>
              <p className="text-xl font-bold text-red-400">{formatarNumero(saldoInfo.totalCredito)} Kz</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <p className="text-xs text-gray-400">Saldo Atual</p>
              <p className={`text-xl font-bold ${saldoInfo.saldoAtual >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatarNumero(Math.abs(saldoInfo.saldoAtual))} Kz {saldoInfo.saldoAtual >= 0 ? 'D' : 'C'}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <p className="text-xs text-gray-400">Movimentos</p>
              <p className="text-xl font-bold text-white">{movimentos.length}</p>
            </div>
          </div>
        )}

        {/* Tabela de Movimentos */}
        {contaSelecionada && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr className="text-left text-gray-300">
                    <th className="p-3">Data</th>
                    <th className="p-3">Nº Lançamento</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Débito (Kz)</th>
                    <th className="p-3 text-right">Crédito (Kz)</th>
                    <th className="p-3 text-right">Saldo (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-gray-400">
                        <Loader2 size={32} className="animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : movimentos.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-gray-400">
                        Nenhum movimento encontrado para esta conta
                      </td>
                    </tr>
                  ) : (
                    movimentos.map((mov, idx) => (
                      <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{formatarData(mov.data)}</td>
                        <td className="p-3 font-mono text-xs">{mov.numeroLancamento}</td>
                        <td className="p-3 max-w-md truncate">{mov.descricao}</td>
                        <td className="p-3 text-right text-green-400">{mov.debito > 0 ? formatarNumero(mov.debito) : "—"}</td>
                        <td className="p-3 text-right text-red-400">{mov.credito > 0 ? formatarNumero(mov.credito) : "—"}</td>
                        <td className="p-3 text-right font-semibold">
                          <span className={mov.saldo >= 0 ? "text-green-400" : "text-red-400"}>
                            {formatarNumero(Math.abs(mov.saldo))} {mov.saldo >= 0 ? "D" : "C"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {movimentos.length > 0 && (
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td colSpan="3" className="p-3 text-right font-bold">TOTAIS:</td>
                      <td className="p-3 text-right font-bold text-green-400">{formatarNumero(saldoInfo.totalDebito)}</td>
                      <td className="p-3 text-right font-bold text-red-400">{formatarNumero(saldoInfo.totalCredito)}</td>
                      <td className="p-3 text-right font-bold">{formatarNumero(Math.abs(saldoInfo.saldoAtual))} {saldoInfo.saldoAtual >= 0 ? "D" : "C"}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Modal de Importação */}
        <ModalImportacao
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportExcel}
          onDownloadModelo={downloadModeloExcel}
          loading={importando}
        />

        {/* Modal de Sincronização */}
        <ModalSincronizacao
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          onSync={handleSincronizar}
          loading={sincronizando}
          stats={syncStats}
        />
      </div>
    </Layout>
  );
};

export default RazaoGeral;