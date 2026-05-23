// src/pages/Contabilidade/SaldosContas.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Wallet, Search, RefreshCw, Download, Printer, FileSpreadsheet,
  ChevronLeft, ChevronRight, Building2, TrendingUp, TrendingDown,
  Filter, Calendar, Eye, FileText, BookOpen, Loader2, Upload, GitBranch,
  XCircle, CheckCircle, AlertCircle, FileCode, FileJson
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// Modal de Importação de Ficheiros
const ModalImportacao = ({ isOpen, onClose, onImport, onDownloadModelo, loading }) => {
  const [file, setFile] = useState(null);
  const [tipoFicheiro, setTipoFicheiro] = useState("excel");
  const fileInputRef = useRef(null);

  const getFormatosAceites = () => {
    switch(tipoFicheiro) {
      case "excel": return ".xlsx,.xls,.csv";
      case "pdf": return ".pdf";
      case "texto": return ".txt,.csv";
      case "xml": return ".xml";
      case "json": return ".json";
      default: return ".xlsx,.xls,.csv";
    }
  };

  const handleImport = () => {
    if (!file) {
      alert("❌ Selecione um ficheiro");
      return;
    }
    onImport(file, tipoFicheiro);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Importar Saldos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo de Ficheiro</label>
            <select
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={tipoFicheiro}
              onChange={(e) => setTipoFicheiro(e.target.value)}
            >
              <option value="excel">Excel (.xlsx, .xls, .csv)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
              <option value="xml">XML (.xml)</option>
              <option value="json">JSON (.json)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ficheiro</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={getFormatosAceites()}
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white file:bg-gray-600 file:border-0 file:text-white file:px-3 file:py-1 file:rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos suportados: Excel, CSV, PDF, XML, JSON
            </p>
          </div>
          
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-blue-300 flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} />
              <strong>Modelos de Importação:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => onDownloadModelo("excel")}
                className="text-blue-400 text-xs hover:underline flex items-center gap-1"
              >
                📥 Excel
              </button>
              <button 
                onClick={() => onDownloadModelo("csv")}
                className="text-blue-400 text-xs hover:underline flex items-center gap-1"
              >
                📥 CSV
              </button>
              <button 
                onClick={() => onDownloadModelo("xml")}
                className="text-blue-400 text-xs hover:underline flex items-center gap-1"
              >
                📥 XML
              </button>
              <button 
                onClick={() => onDownloadModelo("json")}
                className="text-blue-400 text-xs hover:underline flex items-center gap-1"
              >
                📥 JSON
              </button>
            </div>
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
          <h3 className="text-xl font-bold text-white">Sincronizar Saldos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Esta operação irá sincronizar os saldos das contas com:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Lançamentos contabilísticos
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Plano de contas PGCA
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Movimentos bancários
            </li>
          </ul>
          
          {stats && (
            <div className="bg-gray-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-400">Resultado da última sincronização:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-green-400">Contas: {stats.contas || 0}</div>
                <div className="text-blue-400">Lançamentos: {stats.lancamentos || 0}</div>
                <div className="text-yellow-400">Saldos: {stats.saldos || 0}</div>
              </div>
            </div>
          )}
          
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <p className="text-xs text-yellow-300 flex items-center gap-2">
              <AlertCircle size={14} />
              <strong>Atenção:</strong> Esta operação pode atualizar os saldos das contas.
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

const SaldosContas = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [saldos, setSaldos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [classeFiltro, setClasseFiltro] = useState("todas");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().split("T")[0]);
  const [totais, setTotais] = useState({ totalDebito: 0, totalCredito: 0, totalSaldoDevedor: 0, totalSaldoCredor: 0 });

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

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
      carregarSaldos();
    }
  }, [empresaSelecionada, classeFiltro, pagina, dataReferencia]);

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

  const carregarSaldos = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId: empresaSelecionada || userEmpresaId,
        dataFim: dataReferencia
      });
      
      const response = await fetch(`${BASE_URL}/api/contabilidade/relatorios/balancete?${params}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.dados) {
          let saldosLista = data.dados.balancete || [];
          
          if (classeFiltro !== "todas") {
            saldosLista = saldosLista.filter(c => c.classe === parseInt(classeFiltro));
          }
          
          setSaldos(saldosLista);
          setTotalPaginas(Math.ceil(saldosLista.length / 20));
          setTotais(data.dados.totais || { totalDebito: 0, totalCredito: 0, totalSaldoDevedor: 0, totalSaldoCredor: 0 });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar saldos:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadModelo = async (formato) => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-saldos?formato=${formato}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modelo_saldos.${formato === "excel" ? "xlsx" : formato}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert(`✅ Download do modelo ${formato.toUpperCase()} iniciado!`);
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.mensagem || "Falha no download"}`);
      }
    } catch (error) {
      console.error("Erro no download:", error);
      alert("❌ Erro ao baixar modelo");
    }
  };

  const handleImportarFicheiro = async (file, tipo) => {
    setImportando(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("empresaId", empresaSelecionada || userEmpresaId);
    formData.append("tipo", tipo);
    formData.append("formato", tipo);
    
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-saldos`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
        carregarSaldos();
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
      const response = await fetch(`${BASE_URL}/api/contabilidade/sincronizar-saldos`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada || userEmpresaId,
          dataReferencia: dataReferencia
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        setSyncStats(data.resultados);
        alert(`✅ Sincronização concluída!\n\nContas: ${data.resultados?.contas || 0}\nSaldos: ${data.resultados?.saldos || 0}`);
        carregarSaldos();
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

  const exportarExcel = () => {
    setExportando(true);
    try {
      const dadosExport = saldos.map(item => ({
        "Código": item.contaCodigo,
        "Conta": item.contaDescricao,
        "Classe": item.classe,
        "Débito (Kz)": item.debito,
        "Crédito (Kz)": item.credito,
        "Saldo (Kz)": item.saldo,
        "Natureza": item.saldo >= 0 ? "Devedor" : "Credor"
      }));
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Saldos de Contas");
      
      XLSX.writeFile(wb, `saldos_contas_${new Date().toISOString().split("T")[0]}.xlsx`);
      alert("✅ Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("❌ Erro ao exportar Excel");
    } finally {
      setExportando(false);
    }
  };

  const exportarCSV = () => {
    setExportando(true);
    try {
      const dadosExport = saldos.map(item => ({
        "Código": item.contaCodigo,
        "Conta": item.contaDescricao,
        "Classe": item.classe,
        "Débito": item.debito,
        "Crédito": item.credito,
        "Saldo": item.saldo,
        "Natureza": item.saldo >= 0 ? "Devedor" : "Credor"
      }));
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `saldos_contas_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert("✅ CSV exportado com sucesso!");
    } catch (error) { console.error("Erro ao exportar CSV:", error); alert("❌ Erro ao exportar CSV"); }
    finally { setExportando(false); }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const empresaAtual = isTecnico() ? userEmpresaNome : empresas.find(e => e._id === empresaSelecionada)?.nome;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("SALDOS DE CONTAS", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Empresa: ${empresaAtual || "Não selecionada"}`, 14, 25);
      doc.text(`Data de referência: ${new Date(dataReferencia).toLocaleDateString("pt-AO")}`, 14, 32);
      
      const dadosTabela = saldos.map(item => [
        item.contaCodigo,
        item.contaDescricao?.substring(0, 35) || "",
        item.classe,
        formatarNumero(item.debito),
        formatarNumero(item.credito),
        `${formatarNumero(Math.abs(item.saldo))} ${item.saldo >= 0 ? 'D' : 'C'}`
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [["Código", "Conta", "Cls", "Débito", "Crédito", "Saldo"]],
        body: dadosTabela,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 7, cellPadding: 2 }
      });
      
      doc.save(`saldos_contas_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  const getClasseCor = (classe) => {
    const cores = { 
      1: "text-blue-400", 2: "text-green-400", 3: "text-yellow-400", 
      4: "text-purple-400", 5: "text-pink-400", 6: "text-indigo-400", 
      7: "text-red-400", 8: "text-orange-400", 9: "text-gray-400" 
    };
    return cores[classe] || "text-gray-400";
  };

  const saldosPaginados = saldos.slice((pagina - 1) * 20, pagina * 20);

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Saldos de Contas" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Saldos de Contas" showBackButton backToRoute="/contabilidade">
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
    <Layout title="Saldos de Contas" showBackButton backToRoute="/contabilidade">
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
              <Wallet size={28} className="text-purple-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Saldos de Contas</h2>
                <p className="text-gray-400 text-sm">Posição dos saldos de todas as contas contabilísticas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowImportModal(true)} 
                className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-white flex items-center gap-2"
              >
                <Upload size={16} /> Importar
              </button>
              <button 
                onClick={() => setShowSyncModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white flex items-center gap-2"
              >
                <GitBranch size={16} /> Sincronizar
              </button>
              <button onClick={exportarExcel} disabled={exportando || saldos.length === 0} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                <FileSpreadsheet size={18} /> Excel
              </button>
              <button onClick={exportarCSV} disabled={exportando || saldos.length === 0} className="bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                <FileText size={18} /> CSV
              </button>
              <button onClick={exportarPDF} disabled={exportando || saldos.length === 0} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                <Printer size={18} /> PDF
              </button>
              <button onClick={carregarSaldos} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data de Referência</label>
              <input
                type="date"
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={dataReferencia}
                onChange={(e) => setDataReferencia(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Classe</label>
              <select
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={classeFiltro}
                onChange={(e) => setClasseFiltro(e.target.value)}
              >
                <option value="todas">Todas as Classes</option>
                <option value="1">Classe 1 - Meios Fixos</option>
                <option value="2">Classe 2 - Existências</option>
                <option value="3">Classe 3 - Terceiros</option>
                <option value="4">Classe 4 - Meios Monetários</option>
                <option value="5">Classe 5 - Capital</option>
                <option value="6">Classe 6 - Proveitos</option>
                <option value="7">Classe 7 - Custos</option>
              </select>
            </div>
            <div>
              <button onClick={carregarSaldos} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
                <Search size={18} /> Filtrar
              </button>
            </div>
            <div className="flex-1"></div>
            <div className="bg-gray-700 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-300">Total de contas: {saldos.length}</span>
            </div>
          </div>
        </div>

        {/* Cards de Totais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Total Débitos</p>
            <p className="text-lg font-bold text-green-400">{formatarNumero(totais.totalDebito)}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Total Créditos</p>
            <p className="text-lg font-bold text-red-400">{formatarNumero(totais.totalCredito)}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Saldo Devedor</p>
            <p className="text-lg font-bold text-green-400">{formatarNumero(totais.totalSaldoDevedor)}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Saldo Credor</p>
            <p className="text-lg font-bold text-red-400">{formatarNumero(totais.totalSaldoCredor)}</p>
          </div>
        </div>

        {/* Tabela de Saldos */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr className="text-left text-gray-300">
                  <th className="p-3">Código</th>
                  <th className="p-3">Conta</th>
                  <th className="p-3 text-center">Classe</th>
                  <th className="p-3 text-right">Débito (Kz)</th>
                  <th className="p-3 text-right">Crédito (Kz)</th>
                  <th className="p-3 text-right">Saldo (Kz)</th>
                  <th className="p-3 text-center">Natureza</th>
                </tr>
              </thead>
              <tbody>
                {saldosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-gray-400">
                      <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conta encontrada</p>
                    </td>
                  </tr>
                ) : (
                  saldosPaginados.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-3 font-mono text-xs">{item.contaCodigo}</td>
                      <td className="p-3">{item.contaDescricao}</td>
                      <td className="p-3 text-center"><span className={`font-semibold ${getClasseCor(item.classe)}`}>{item.classe}</span></td>
                      <td className="p-3 text-right text-green-400">{formatarNumero(item.debito)}</td>
                      <td className="p-3 text-right text-red-400">{formatarNumero(item.credito)}</td>
                      <td className="p-3 text-right font-semibold">
                        <span className={item.saldo >= 0 ? "text-green-400" : "text-red-400"}>
                          {formatarNumero(Math.abs(item.saldo))}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.saldo >= 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {item.saldo >= 0 ? "Devedor" : "Credor"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {saldosPaginados.length > 0 && (
                <tfoot className="bg-gray-700">
                  <tr>
                    <td colSpan="3" className="p-3 text-right font-bold text-white">TOTAIS:</td>
                    <td className="p-3 text-right font-bold text-green-400">{formatarNumero(totais.totalDebito)}</td>
                    <td className="p-3 text-right font-bold text-red-400">{formatarNumero(totais.totalCredito)}</td>
                    <td colSpan="2" className="p-3 text-right font-bold">{formatarNumero(totais.totalSaldoDevedor + totais.totalSaldoCredor)}</td>
                  </tr>
                </tfoot>
              )}
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

        {/* Modal de Importação */}
        <ModalImportacao
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportarFicheiro}
          onDownloadModelo={downloadModelo}
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

export default SaldosContas;