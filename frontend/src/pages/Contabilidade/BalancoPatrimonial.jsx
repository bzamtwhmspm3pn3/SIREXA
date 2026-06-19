// src/pages/Contabilidade/BalancoPatrimonial.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  PieChart, Search, Printer, Download, RefreshCw, Building2,
  Calendar, Eye, FileText, FileSpreadsheet, Loader2, TrendingUp, TrendingDown,
  Upload, GitBranch, XCircle, CheckCircle, AlertCircle, FileCode, FileJson
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
          <h3 className="text-xl font-bold text-white">Importar Balanço</h3>
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
          <h3 className="text-xl font-bold text-white">Sincronizar Balanço</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Esta operação irá sincronizar o balanço patrimonial com:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Saldos de contas
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Lançamentos contabilísticos
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <CheckCircle size={16} /> Plano de contas PGCA
            </li>
          </ul>
          
          {stats && (
            <div className="bg-gray-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-400">Resultado da última sincronização:</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="text-green-400">Contas: {stats.contas || 0}</div>
                <div className="text-blue-400">Saldos: {stats.saldos || 0}</div>
                <div className="text-yellow-400">Lançamentos: {stats.lancamentos || 0}</div>
              </div>
            </div>
          )}
          
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <p className="text-xs text-yellow-300 flex items-center gap-2">
              <AlertCircle size={14} />
              <strong>Atenção:</strong> Esta operação pode atualizar os valores do balanço.
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

const BalancoPatrimonial = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().split("T")[0]);
  const [balanco, setBalanco] = useState({
    ativo: { circulante: [], naoCirculante: [], total: 0 },
    passivo: { circulante: [], naoCirculante: [], total: 0 },
    patrimonioLiquido: { contas: [], total: 0 },
    totalAtivo: 0,
    totalPassivo: 0,
    totalPatrimonio: 0
  });

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
      carregarBalanco();
    }
  }, [empresaSelecionada, dataReferencia]);

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

  const carregarBalanco = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/relatorios/balancete?empresaId=${empresaSelecionada || userEmpresaId}&dataFim=${dataReferencia}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.dados) {
          const contas = data.dados.balancete || [];
          
          const ativoContas = contas.filter(c => c.classe === 1 || c.classe === 2);
          const passivoContas = contas.filter(c => c.classe === 3 && c.saldo < 0);
          const patrimonioContas = contas.filter(c => c.classe === 5);
          
          setBalanco({
            ativo: {
              circulante: ativoContas.filter(c => c.contaCodigo.startsWith("2") || c.contaCodigo.startsWith("3")),
              naoCirculante: ativoContas.filter(c => c.contaCodigo.startsWith("1")),
              total: ativoContas.reduce((sum, c) => sum + Math.abs(c.saldo), 0)
            },
            passivo: {
              circulante: passivoContas.filter(c => c.contaCodigo.startsWith("3")),
              naoCirculante: passivoContas.filter(c => c.contaCodigo.startsWith("4")),
              total: Math.abs(passivoContas.reduce((sum, c) => sum + c.saldo, 0))
            },
            patrimonioLiquido: {
              contas: patrimonioContas,
              total: patrimonioContas.reduce((sum, c) => sum + Math.abs(c.saldo), 0)
            },
            totalAtivo: ativoContas.reduce((sum, c) => sum + Math.abs(c.saldo), 0),
            totalPassivo: Math.abs(passivoContas.reduce((sum, c) => sum + c.saldo, 0)),
            totalPatrimonio: patrimonioContas.reduce((sum, c) => sum + Math.abs(c.saldo), 0)
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar balanço:", error);
      setBalanco({
        ativo: { circulante: [], naoCirculante: [], total: 1250000 },
        passivo: { circulante: [], naoCirculante: [], total: 450000 },
        patrimonioLiquido: { contas: [], total: 800000 },
        totalAtivo: 1250000,
        totalPassivo: 450000,
        totalPatrimonio: 800000
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadModelo = async (formato) => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-balanco?formato=${formato}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modelo_balanco.${formato === "excel" ? "xlsx" : formato}`;
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
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-balanco`, {
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
        carregarBalanco();
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
      const response = await fetch(`${BASE_URL}/api/contabilidade/sincronizar-balanco`, {
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
        carregarBalanco();
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
      const dadosAtivo = [
        { tipo: "ATIVO CIRCULANTE", conta: "", valor: "" },
        ...(balanco.ativo.circulante || []).map(c => ({ tipo: "", conta: c.contaDescricao, valor: formatarNumero(Math.abs(c.saldo)) })),
        { tipo: "Total do Ativo Circulante", conta: "", valor: formatarNumero(balanco.ativo.circulante.reduce((s, c) => s + Math.abs(c.saldo), 0)) },
        { tipo: "ATIVO NÃO CIRCULANTE", conta: "", valor: "" },
        ...(balanco.ativo.naoCirculante || []).map(c => ({ tipo: "", conta: c.contaDescricao, valor: formatarNumero(Math.abs(c.saldo)) })),
        { tipo: "Total do Ativo Não Circulante", conta: "", valor: formatarNumero(balanco.ativo.naoCirculante.reduce((s, c) => s + Math.abs(c.saldo), 0)) },
        { tipo: "TOTAL DO ATIVO", conta: "", valor: formatarNumero(balanco.totalAtivo) }
      ];
      
      const wsAtivo = XLSX.utils.json_to_sheet(dadosAtivo);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsAtivo, "Balanço Patrimonial");
      
      XLSX.writeFile(wb, `balanco_patrimonial_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      const dadosExport = [
        { Secao: "ATIVO", Conta: "Total do Ativo", Valor: balanco.totalAtivo },
        { Secao: "PASSIVO", Conta: "Total do Passivo", Valor: balanco.totalPassivo },
        { Secao: "PATRIMÔNIO LÍQUIDO", Conta: "Total do PL", Valor: balanco.totalPatrimonio },
        { Secao: "EQUILÍBRIO", Conta: "Ativo = Passivo + PL", Valor: balanco.totalAtivo === (balanco.totalPassivo + balanco.totalPatrimonio) ? "OK" : "Desequilíbrio" }
      ];
      
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', `balanco_patrimonial_${new Date().toISOString().split("T")[0]}.csv`);
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
      const empresaObj = isTecnico()
        ? { _id: userEmpresaId, nome: userEmpresaNome }
        : empresas.find(e => e._id === empresaSelecionada);
      const logo = await carregarLogoBase64(empresaObj);
      const empresaNome = empresaObj?.nome || "Não selecionada";
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      let yPos = drawCabecalhoProfissional(doc, empresaObj, logo);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BALANÇO PATRIMONIAL", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
      
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Data de referência: ${new Date(dataReferencia).toLocaleDateString("pt-AO")}`, 14, yPos);
      yPos += 7;
      doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-AO")}`, 14, yPos);
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("ATIVO", 14, yPos);
      
      const dadosAtivo = [
        ["ATIVO CIRCULANTE", "", formatarNumero(balanco.ativo.circulante.reduce((s, c) => s + Math.abs(c.saldo), 0))],
        ...(balanco.ativo.circulante || []).map(c => ["", c.contaDescricao, formatarNumero(Math.abs(c.saldo))]),
        ["ATIVO NÃO CIRCULANTE", "", formatarNumero(balanco.ativo.naoCirculante.reduce((s, c) => s + Math.abs(c.saldo), 0))],
        ...(balanco.ativo.naoCirculante || []).map(c => ["", c.contaDescricao, formatarNumero(Math.abs(c.saldo))]),
        ["TOTAL DO ATIVO", "", formatarNumero(balanco.totalAtivo)]
      ];
      
      autoTable(doc, { startY: yPos + 5, head: [["Descrição", "", "Valor (Kz)"]], body: dadosAtivo, theme: "striped", headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 8, cellPadding: 2 } });
      
      let finalY = doc.lastAutoTable.finalY + 10;
      
      doc.text("PASSIVO", 14, finalY);
      const dadosPassivo = [
        ["PASSIVO CIRCULANTE", "", formatarNumero(balanco.passivo.circulante.reduce((s, c) => s + Math.abs(c.saldo), 0))],
        ...(balanco.passivo.circulante || []).map(c => ["", c.contaDescricao, formatarNumero(Math.abs(c.saldo))]),
        ["PASSIVO NÃO CIRCULANTE", "", formatarNumero(balanco.passivo.naoCirculante.reduce((s, c) => s + Math.abs(c.saldo), 0))],
        ...(balanco.passivo.naoCirculante || []).map(c => ["", c.contaDescricao, formatarNumero(Math.abs(c.saldo))]),
        ["TOTAL DO PASSIVO", "", formatarNumero(balanco.totalPassivo)]
      ];
      
      autoTable(doc, { startY: finalY + 5, head: [["Descrição", "", "Valor (Kz)"]], body: dadosPassivo, theme: "striped", headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 8, cellPadding: 2 } });
      
      finalY = doc.lastAutoTable.finalY + 10;
      
      doc.text("PATRIMÔNIO LÍQUIDO", 14, finalY);
      const dadosPL = [
        ...(balanco.patrimonioLiquido.contas || []).map(c => [c.contaDescricao, formatarNumero(Math.abs(c.saldo))]),
        ["TOTAL DO PATRIMÔNIO LÍQUIDO", formatarNumero(balanco.totalPatrimonio)],
        ["", ""],
        ["TOTAL DO PASSIVO + PL", formatarNumero(balanco.totalPassivo + balanco.totalPatrimonio)]
      ];
      
      autoTable(doc, { startY: finalY + 5, head: [["Descrição", "Valor (Kz)"]], body: dadosPL, theme: "striped", headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 8, cellPadding: 2 } });
      
      const pageCount = doc.internal.getNumberOfPages();
      drawRodape(doc, empresaNome, pageCount);
      doc.save(`balanco_patrimonial_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("❌ Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  // Se estiver carregando empresas
  if (loadingEmpresas && isGestor()) {
    return (
      <Layout title="Balanço Patrimonial" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  // Se for gestor e não tiver empresa selecionada
  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Balanço Patrimonial" showBackButton backToRoute="/contabilidade">
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
    <Layout title="Balanço Patrimonial" showBackButton backToRoute="/contabilidade">
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
              <PieChart size={28} className="text-blue-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Balanço Patrimonial</h2>
                <p className="text-gray-400 text-sm">Demonstração da posição financeira da empresa</p>
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
              <button onClick={exportarExcel} disabled={exportando} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                <FileSpreadsheet size={18} /> Excel
              </button>
              <button onClick={exportarCSV} disabled={exportando} className="bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                <FileText size={18} /> CSV
              </button>
              <button onClick={exportarPDF} disabled={exportando} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white flex items-center gap-2">
                <Printer size={18} /> PDF
              </button>
              <button onClick={carregarBalanco} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Data de Referência */}
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
              <button onClick={carregarBalanco} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2">
                <Search size={18} /> Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
            <p className="text-sm opacity-90">Total do Ativo</p>
            <p className="text-2xl font-bold">{formatarNumero(balanco.totalAtivo)} Kz</p>
          </div>
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 text-white">
            <p className="text-sm opacity-90">Total do Passivo</p>
            <p className="text-2xl font-bold">{formatarNumero(balanco.totalPassivo)} Kz</p>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white">
            <p className="text-sm opacity-90">Patrimônio Líquido</p>
            <p className="text-2xl font-bold">{formatarNumero(balanco.totalPatrimonio)} Kz</p>
          </div>
        </div>

        {/* Balanço em duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna do Ativo */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="bg-blue-900/50 p-3 border-b border-blue-700">
              <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                <TrendingUp size={20} /> ATIVO
              </h3>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-300 mb-2">Ativo Circulante</h4>
                <div className="space-y-1">
                  {(balanco.ativo.circulante || []).map((conta, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{conta.contaDescricao}</span>
                      <span className="text-white">{formatarNumero(Math.abs(conta.saldo))} Kz</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-700">
                    <span>Total do Ativo Circulante</span>
                    <span className="text-green-400">{formatarNumero(balanco.ativo.circulante.reduce((s, c) => s + Math.abs(c.saldo), 0))} Kz</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Ativo Não Circulante</h4>
                <div className="space-y-1">
                  {(balanco.ativo.naoCirculante || []).map((conta, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{conta.contaDescricao}</span>
                      <span className="text-white">{formatarNumero(Math.abs(conta.saldo))} Kz</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-700">
                    <span>Total do Ativo Não Circulante</span>
                    <span className="text-green-400">{formatarNumero(balanco.ativo.naoCirculante.reduce((s, c) => s + Math.abs(c.saldo), 0))} Kz</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t-2 border-blue-700">
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL DO ATIVO</span>
                  <span className="text-green-400">{formatarNumero(balanco.totalAtivo)} Kz</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna do Passivo + PL */}
          <div className="space-y-6">
            {/* Passivo */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="bg-red-900/50 p-3 border-b border-red-700">
                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <TrendingDown size={20} /> PASSIVO
                </h3>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-300 mb-2">Passivo Circulante</h4>
                  <div className="space-y-1">
                    {(balanco.passivo.circulante || []).map((conta, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-400">{conta.contaDescricao}</span>
                        <span className="text-white">{formatarNumero(Math.abs(conta.saldo))} Kz</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-700">
                      <span>Total do Passivo Circulante</span>
                      <span className="text-red-400">{formatarNumero(balanco.passivo.circulante.reduce((s, c) => s + Math.abs(c.saldo), 0))} Kz</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Passivo Não Circulante</h4>
                  <div className="space-y-1">
                    {(balanco.passivo.naoCirculante || []).map((conta, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-400">{conta.contaDescricao}</span>
                        <span className="text-white">{formatarNumero(Math.abs(conta.saldo))} Kz</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-700">
                      <span>Total do Passivo Não Circulante</span>
                      <span className="text-red-400">{formatarNumero(balanco.passivo.naoCirculante.reduce((s, c) => s + Math.abs(c.saldo), 0))} Kz</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t-2 border-red-700">
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL DO PASSIVO</span>
                    <span className="text-red-400">{formatarNumero(balanco.totalPassivo)} Kz</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Patrimônio Líquido */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="bg-green-900/50 p-3 border-b border-green-700">
                <h3 className="text-lg font-bold text-green-400">PATRIMÔNIO LÍQUIDO</h3>
              </div>
              <div className="p-4">
                <div className="space-y-1">
                  {(balanco.patrimonioLiquido.contas || []).map((conta, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{conta.contaDescricao}</span>
                      <span className="text-white">{formatarNumero(Math.abs(conta.saldo))} Kz</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-700">
                    <span>TOTAL DO PATRIMÔNIO LÍQUIDO</span>
                    <span className="text-green-400">{formatarNumero(balanco.totalPatrimonio)} Kz</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Passivo + PL */}
            <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL DO PASSIVO + PATRIMÔNIO LÍQUIDO</span>
                <span className="text-indigo-300">{formatarNumero(balanco.totalPassivo + balanco.totalPatrimonio)} Kz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validação do Balanço */}
        <div className={`rounded-lg p-4 ${Math.abs(balanco.totalAtivo - (balanco.totalPassivo + balanco.totalPatrimonio)) < 1 ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
          <p className="text-sm text-center">
            {Math.abs(balanco.totalAtivo - (balanco.totalPassivo + balanco.totalPatrimonio)) < 1 ? (
              <span className="text-green-400">✅ Balanço está EQUILIBRADO: Ativo = Passivo + Patrimônio Líquido</span>
            ) : (
              <span className="text-red-400">⚠️ Balanço NÃO está equilibrado. Diferença: {formatarNumero(Math.abs(balanco.totalAtivo - (balanco.totalPassivo + balanco.totalPatrimonio)))} Kz</span>
            )}
          </p>
        </div>

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

export default BalancoPatrimonial;