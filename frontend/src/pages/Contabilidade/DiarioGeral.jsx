// src/pages/Contabilidade/DiarioGeral.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  BookCopy, Search, RefreshCw, Download, Printer, FileSpreadsheet,
  ChevronLeft, ChevronRight, Calendar, Building2, Eye, FileText,
  Filter, XCircle, CheckCircle, AlertCircle, Loader2, Upload, GitBranch
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

  const handleDownloadModelo = () => {
    onDownloadModelo();
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
            <label className="block text-sm text-gray-400 mb-1">Ficheiro Excel (.xlsx, .xls)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white file:bg-gray-600 file:border-0 file:text-white file:px-3 file:py-1 file:rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: Data, Nº Lançamento, Descrição, Conta, Débito, Crédito
            </p>
          </div>
          
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-blue-300 flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} />
              <strong>Modelo de Excel:</strong>
            </p>
            <button 
              onClick={handleDownloadModelo}
              className="text-blue-400 text-xs hover:underline flex items-center gap-1"
            >
              📥 Baixar modelo do Diário Geral (.xlsx)
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
            Esta operação irá sincronizar os lançamentos do diário com:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Lançamentos do sistema
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Operações de Vendas
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Operações de Pagamentos
            </li>
          </ul>
          
          {stats && (
            <div className="bg-gray-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-400">Resultado da última sincronização:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-green-400">Lançamentos: {stats.lancamentos || 0}</div>
                <div className="text-blue-400">Vendas: {stats.vendas || 0}</div>
                <div className="text-orange-400">Pagamentos: {stats.pagamentos || 0}</div>
              </div>
            </div>
          )}
          
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <p className="text-xs text-yellow-300 flex items-center gap-2">
              <AlertCircle size={14} />
              <strong>Atenção:</strong> Esta operação pode criar novos registos no diário.
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

const DiarioGeral = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [movimentosDetalhados, setMovimentosDetalhados] = useState([]);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    conta: ""
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
      carregarDiario();
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

  const carregarDiario = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId: empresaSelecionada || userEmpresaId,
        pagina,
        limite: 30
      });
      
      if (filtros.dataInicio) params.append("dataInicio", filtros.dataInicio);
      if (filtros.dataFim) params.append("dataFim", filtros.dataFim);
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/lancamentos?${params}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) {
          setLancamentos(data.dados || []);
          setTotalPaginas(data.paginacao?.totalPaginas || 1);
          setTotalRegistros(data.paginacao?.total || 0);
          
          const movimentos = [];
          (data.dados || []).forEach(lanc => {
            lanc.partidas?.forEach(partida => {
              movimentos.push({
                data: lanc.dataLancamento,
                numeroLancamento: lanc.numeroLancamento,
                descricao: lanc.descricao,
                contaCodigo: partida.contaCodigo,
                contaDescricao: partida.contaDescricao,
                debito: partida.debito || 0,
                credito: partida.credito || 0,
                status: lanc.status
              });
            });
          });
          setMovimentosDetalhados(movimentos);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar diário:", error);
    } finally {
      setLoading(false);
    }
  };

  // Download do modelo Excel
  const downloadModeloExcel = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-excel-diario`, {
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
        a.download = 'modelo_diario_geral.xlsx';
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
  const handleImportExcel = async (file) => {
    setImportando(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("empresaId", empresaSelecionada || userEmpresaId);
    formData.append("tipo", "diario");
    
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-excel-diario`, {
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
        carregarDiario();
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

  // Sincronizar com sistema
  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/sincronizar-diario`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada || userEmpresaId
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        setSyncStats(data.resultados);
        alert(`✅ Sincronização concluída!\n\nLançamentos: ${data.resultados?.lancamentos || 0}\nVendas: ${data.resultados?.vendas || 0}\nPagamentos: ${data.resultados?.pagamentos || 0}`);
        carregarDiario();
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
      const dadosExport = movimentosDetalhados.map(mov => ({
        "Data": formatarData(mov.data),
        "Nº Lançamento": mov.numeroLancamento,
        "Descrição": mov.descricao,
        "Conta": `${mov.contaCodigo} - ${mov.contaDescricao}`,
        "Débito (Kz)": mov.debito,
        "Crédito (Kz)": mov.credito,
        "Status": mov.status
      }));
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Diário Geral");
      
      XLSX.writeFile(wb, `diario_geral_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      
      let yPos = drawCabecalhoProfissional(doc, empresaObj, logo);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("DIÁRIO GERAL", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
      
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Período: ${filtros.dataInicio || "Início"} a ${filtros.dataFim || "Actual"}`, 14, yPos);
      yPos += 7;
      doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-AO")}`, 14, yPos);
      
      const dadosTabela = movimentosDetalhados.map(mov => [
        formatarData(mov.data),
        mov.numeroLancamento,
        mov.descricao?.substring(0, 35) || "",
        `${mov.contaCodigo}`,
        formatarNumero(mov.debito),
        formatarNumero(mov.credito)
      ]);
      
      autoTable(doc, {
        startY: yPos + 6,
        head: [["Data", "Nº", "Descrição", "Conta", "Débito", "Crédito"]],
        body: dadosTabela,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      drawRodape(doc, empresaNome, pageCount);
      doc.save(`diario_geral_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  const totais = movimentosDetalhados.reduce((acc, mov) => ({
    totalDebito: acc.totalDebito + mov.debito,
    totalCredito: acc.totalCredito + mov.credito
  }), { totalDebito: 0, totalCredito: 0 });

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Diário Geral" showBackButton backToRoute="/menu">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Diário Geral" showBackButton backToRoute="/contabilidade">
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
    <Layout title="Diário Geral" showBackButton backToRoute="/contabilidade">
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
              <BookCopy size={28} className="text-teal-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Diário Geral</h2>
                <p className="text-gray-400 text-sm">Registo cronológico de todos os lançamentos contabilísticos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 text-sm"
              >
                <Upload size={16} /> Importar
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 text-sm"
              >
                <GitBranch size={16} /> Sincronizar
              </button>
              <button onClick={exportarExcel} disabled={exportando || movimentosDetalhados.length === 0} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50">
                <FileSpreadsheet size={18} /> Excel
              </button>
              <button onClick={exportarPDF} disabled={exportando || movimentosDetalhados.length === 0} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50">
                <Printer size={18} /> PDF
              </button>
              <button onClick={carregarDiario} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input type="date" className="bg-gray-700 rounded-lg px-3 py-2 text-white" value={filtros.dataInicio} onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input type="date" className="bg-gray-700 rounded-lg px-3 py-2 text-white" value={filtros.dataFim} onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})} />
            </div>
            <div>
              <button onClick={carregarDiario} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
                <Search size={18} /> Filtrar
              </button>
            </div>
            <div className="flex-1"></div>
            <div className="bg-gray-700 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-300">Total de registos: {totalRegistros}</span>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Total Débitos</p>
            <p className="text-xl font-bold text-green-400">{formatarNumero(totais.totalDebito)} Kz</p>
          </div>
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Total Créditos</p>
            <p className="text-xl font-bold text-red-400">{formatarNumero(totais.totalCredito)} Kz</p>
          </div>
        </div>

        {/* Tabela do Diário */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr className="text-left text-gray-300">
                  <th className="p-3">Data</th>
                  <th className="p-3">Nº Lançamento</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Conta</th>
                  <th className="p-3 text-right">Débito (Kz)</th>
                  <th className="p-3 text-right">Crédito (Kz)</th>
                </tr>
              </thead>
              <tbody>
                {movimentosDetalhados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-gray-400">
                      <BookCopy size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhum registo encontrado no diário</p>
                    </td>
                  </tr>
                ) : (
                  movimentosDetalhados.map((mov, idx) => (
                    <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3">{formatarData(mov.data)}</td>
                      <td className="p-3 font-mono text-xs">{mov.numeroLancamento}</td>
                      <td className="p-3 max-w-xs truncate">{mov.descricao}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs">{mov.contaCodigo}</span>
                        <span className="text-gray-400 text-xs ml-1">- {mov.contaDescricao}</span>
                      </td>
                      <td className="p-3 text-right text-green-400">{mov.debito > 0 ? formatarNumero(mov.debito) : "—"}</td>
                      <td className="p-3 text-right text-red-400">{mov.credito > 0 ? formatarNumero(mov.credito) : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {movimentosDetalhados.length > 0 && (
                <tfoot className="bg-gray-700">
                  <tr>
                    <td colSpan="4" className="p-3 text-right font-bold text-white">TOTAIS:</td>
                    <td className="p-3 text-right font-bold text-green-400">{formatarNumero(totais.totalDebito)}</td>
                    <td className="p-3 text-right font-bold text-red-400">{formatarNumero(totais.totalCredito)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex justify-between items-center">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-2">
              <ChevronLeft size={18} /> Anterior
            </button>
            <span className="text-gray-400">Página {pagina} de {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white disabled:opacity-50 flex items-center gap-2">
              Próxima <ChevronRight size={18} />
            </button>
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

export default DiarioGeral;