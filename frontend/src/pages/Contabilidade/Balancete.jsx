// src/pages/Contabilidade/Balancete.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  TrendingUp, Search, Printer, Download, RefreshCw, Building2,
  ChevronLeft, ChevronRight, Calendar, PieChart, Eye, FileText, FileSpreadsheet,
  Loader2, Upload, GitBranch, XCircle, CheckCircle, AlertCircle, FileCode, FileJson
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { carregarLogoBase64, drawCabecalhoProfissional, drawRodape } from '../../utils/pdfUtils';
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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
const ModalImportacao = ({ isOpen, onClose, onImport, onDownloadModelo, loading, formatos }) => {
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
          <h3 className="text-xl font-bold text-white">Importar Balancete</h3>
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
              <option value="pdf">PDF (.pdf)</option>
              <option value="texto">Texto (.txt, .csv)</option>
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
          <h3 className="text-xl font-bold text-white">Sincronizar Balancete</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Esta operação irá sincronizar o balancete com:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Lançamentos contabilísticos
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Plano de contas oficial PGCA
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Vendas e Pagamentos
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Relatórios financeiros
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
              <strong>Atenção:</strong> Esta operação pode atualizar os saldos do balancete.
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

const Balancete = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [balancete, setBalancete] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [periodo, setPeriodo] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dataFim: new Date().toISOString().split("T")[0]
  });
  const [totais, setTotais] = useState({ totalDebito: 0, totalCredito: 0, totalSaldoDevedor: 0, totalSaldoCredor: 0 });
  const [modoVisualizacao, setModoVisualizacao] = useState("tabela");

  const BASE_URL = "https://sirexa-api.onrender.com";
  const getHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) setEmpresaSelecionada(userEmpresaId);
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => { 
    buscarEmpresas(); 
  }, []);

  useEffect(() => {
    if (empresaSelecionada) carregarBalancete();
  }, [empresaSelecionada, periodo]);

  const buscarEmpresas = async () => {
    if (isTecnico()) { 
      setLoadingEmpresas(false); 
      return; 
    }
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (response.status === 403) { setEmpresas([]); return; }
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) setEmpresaSelecionada(lista[0]._id);
    } catch (error) { console.error("Erro ao buscar empresas:", error); }
    finally { setLoadingEmpresas(false); }
  };

  const carregarBalancete = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        empresaId: empresaSelecionada || userEmpresaId, 
        dataInicio: periodo.dataInicio, 
        dataFim: periodo.dataFim 
      });
      const response = await fetch(`${BASE_URL}/api/contabilidade/relatorios/balancete?${params}`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.dados) {
          setBalancete(data.dados.balancete || []);
          setTotais(data.dados.totais || { totalDebito: 0, totalCredito: 0, totalSaldoDevedor: 0, totalSaldoCredor: 0 });
        }
      }
    } catch (error) { console.error("Erro ao carregar balancete:", error); }
    finally { setLoading(false); }
  };

  const downloadModelo = async (formato) => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-balancete?formato=${formato}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modelo_balancete.${formato === "excel" ? "xlsx" : formato}`;
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
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-balancete`, {
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
        carregarBalancete();
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
      const response = await fetch(`${BASE_URL}/api/contabilidade/sincronizar-balancete`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada || userEmpresaId,
          periodo: periodo
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        setSyncStats(data.resultados);
        alert(`✅ Sincronização concluída!\n\nContas: ${data.resultados?.contas || 0}\nLançamentos: ${data.resultados?.lancamentos || 0}`);
        carregarBalancete();
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
      const dadosExport = balancete.map(item => ({
        "Código": item.contaCodigo,
        "Conta": item.contaDescricao,
        "Classe": item.classe,
        "Débito (Kz)": item.debito,
        "Crédito (Kz)": item.credito,
        "Saldo (Kz)": item.saldo
      }));
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Balancete");
      XLSX.writeFile(wb, `balancete_${new Date().toISOString().split("T")[0]}.xlsx`);
      alert("✅ Excel exportado com sucesso!");
    } catch (error) { console.error("Erro ao exportar Excel:", error); alert("❌ Erro ao exportar Excel"); }
    finally { setExportando(false); }
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
      
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("BALANCETE DE VERIFICAÇÃO", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
      
      yPos += 7;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Período: ${periodo.dataInicio} a ${periodo.dataFim}`, 14, yPos);
      
      const dadosTabela = balancete.map(item => [item.contaCodigo, item.contaDescricao?.substring(0, 40), item.classe, formatarNumero(item.debito), formatarNumero(item.credito), `${formatarNumero(Math.abs(item.saldo))} ${item.saldo >= 0 ? 'D' : 'C'}`]);
      autoTable(doc, { startY: yPos + 6, head: [["Código", "Conta", "Cls", "Débito", "Crédito", "Saldo"]], body: dadosTabela, theme: "striped", headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 7, cellPadding: 2 }, columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } } });
      
      const pageCount = doc.internal.getNumberOfPages();
      drawRodape(doc, empresaNome, pageCount);
      doc.save(`balancete_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado com sucesso!");
    } catch (error) { console.error("Erro ao gerar PDF:", error); alert("❌ Erro ao gerar PDF"); }
    finally { setExportando(false); }
  };

  const exportarCSV = () => {
    setExportando(true);
    try {
      const dadosExport = balancete.map(item => ({
        "Código": item.contaCodigo,
        "Conta": item.contaDescricao,
        "Classe": item.classe,
        "Débito": item.debito,
        "Crédito": item.credito,
        "Saldo": item.saldo
      }));
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `balancete_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert("✅ CSV exportado com sucesso!");
    } catch (error) { console.error("Erro ao exportar CSV:", error); alert("❌ Erro ao exportar CSV"); }
    finally { setExportando(false); }
  };

  const chartData = { 
    labels: balancete.slice(0, 15).map(i => i.contaCodigo), 
    datasets: [{ 
      label: 'Saldo (Kz)', 
      data: balancete.slice(0, 15).map(i => Math.abs(i.saldo)), 
      backgroundColor: balancete.slice(0, 15).map(i => i.saldo >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'), 
      borderColor: balancete.slice(0, 15).map(i => i.saldo >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'), 
      borderWidth: 1 
    }] 
  };
  
  const chartOptions = { 
    responsive: true, 
    maintainAspectRatio: true, 
    plugins: { 
      legend: { position: 'top', labels: { color: '#9CA3AF' } }, 
      tooltip: { callbacks: { label: (ctx) => `${formatarNumero(ctx.raw)} Kz` } } 
    }, 
    scales: { 
      y: { ticks: { callback: (v) => `${formatarNumero(v)} Kz`, color: '#9CA3AF' }, grid: { color: '#374151' } }, 
      x: { ticks: { color: '#9CA3AF', rotation: 45 }, grid: { display: false } } 
    } 
  };

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Balancete de Verificação" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Balancete de Verificação" showBackButton backToRoute="/contabilidade">
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
    <Layout title="Balancete de Verificação" showBackButton backToRoute="/contabilidade">
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

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp size={28} className="text-yellow-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Balancete de Verificação</h2>
                <p className="text-gray-400 text-sm">Relação de contas com débitos, créditos e saldos</p>
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
              <button onClick={() => setModoVisualizacao(modoVisualizacao === "tabela" ? "grafico" : "tabela")} className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-white">
                <PieChart size={18} /> {modoVisualizacao === "tabela" ? "Gráfico" : "Tabela"}
              </button>
              <button onClick={exportarExcel} disabled={exportando || balancete.length === 0} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white">
                <FileSpreadsheet size={18} /> Excel
              </button>
              <button onClick={exportarCSV} disabled={exportando || balancete.length === 0} className="bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg text-white">
                <FileText size={18} /> CSV
              </button>
              <button onClick={exportarPDF} disabled={exportando || balancete.length === 0} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white">
                <Printer size={18} /> PDF
              </button>
              <button onClick={carregarBalancete} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input type="date" className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" value={periodo.dataInicio} onChange={(e) => setPeriodo({...periodo, dataInicio: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input type="date" className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" value={periodo.dataFim} onChange={(e) => setPeriodo({...periodo, dataFim: e.target.value})} />
            </div>
            <div className="flex items-end">
              <button onClick={carregarBalancete} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white w-full">
                <Search size={18} className="inline mr-2" /> Actualizar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Total Débitos</p>
            <p className="text-xl font-bold text-green-400">{formatarNumero(totais.totalDebito)}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Total Créditos</p>
            <p className="text-xl font-bold text-red-400">{formatarNumero(totais.totalCredito)}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Saldo Devedor</p>
            <p className="text-xl font-bold text-green-400">{formatarNumero(totais.totalSaldoDevedor)}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Saldo Credor</p>
            <p className="text-xl font-bold text-red-400">{formatarNumero(totais.totalSaldoCredor)}</p>
          </div>
        </div>

        {modoVisualizacao === "grafico" && balancete.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-md font-semibold text-white mb-4">Gráfico de Saldos por Conta</h3>
            <div className="h-96"><Bar data={chartData} options={chartOptions} /></div>
          </div>
        )}

        {modoVisualizacao === "tabela" && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr className="text-left text-gray-300">
                    <th className="p-3">Código</th>
                    <th className="p-3">Conta</th>
                    <th className="p-3 text-right">Classe</th>
                    <th className="p-3 text-right">Débito (Kz)</th>
                    <th className="p-3 text-right">Crédito (Kz)</th>
                    <th className="p-3 text-right">Saldo (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center p-8"><Loader2 size={32} className="animate-spin mx-auto" /></td></tr>
                  ) : balancete.length === 0 ? (
                    <tr><td colSpan="6" className="text-center p-8 text-gray-400">Nenhum lançamento encontrado</td></tr>
                  ) : (
                    balancete.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3 font-mono text-xs">{item.contaCodigo}</td>
                        <td className="p-3">{item.contaDescricao}</td>
                        <td className="p-3 text-right">
                          <span className={`font-semibold ${item.classe === 1 ? "text-blue-400" : item.classe === 2 ? "text-green-400" : item.classe === 3 ? "text-yellow-400" : item.classe === 4 ? "text-purple-400" : item.classe === 5 ? "text-pink-400" : item.classe === 6 ? "text-indigo-400" : "text-red-400"}`}>
                            {item.classe}
                          </span>
                        </td>
                        <td className="p-3 text-right text-green-400">{formatarNumero(item.debito)}</td>
                        <td className="p-3 text-right text-red-400">{formatarNumero(item.credito)}</td>
                        <td className="p-3 text-right">
                          <span className={item.saldo >= 0 ? "text-green-400" : "text-red-400"}>
                            {formatarNumero(Math.abs(item.saldo))} {item.saldo >= 0 ? "D" : "C"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {balancete.length > 0 && (
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td colSpan="3" className="p-3 text-right font-bold text-white">TOTAIS:</td>
                      <td className="p-3 text-right font-bold text-green-400">{formatarNumero(totais.totalDebito)}</td>
                      <td className="p-3 text-right font-bold text-red-400">{formatarNumero(totais.totalCredito)}</td>
                      <td className="p-3 text-right font-bold">{formatarNumero(totais.totalSaldoDevedor + totais.totalSaldoCredor)}</td>
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
          onImport={handleImportarFicheiro}
          onDownloadModelo={downloadModelo}
          loading={importando}
          formatos={["excel", "csv", "pdf", "xml", "json"]}
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

export default Balancete;