// src/pages/Contabilidade/PeriodosFiscais.jsx
import { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  Calendar, Search, RefreshCw, Download, Printer, FileSpreadsheet,
  ChevronLeft, ChevronRight, Building2, Plus, Edit, Trash2, Lock, Unlock,
  CheckCircle, XCircle, AlertCircle, Loader2, Upload, GitBranch,
  Eye, Clock, TrendingUp, TrendingDown, FileText
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

// Modal de Criar/Editar Período
const ModalPeriodo = ({ isOpen, onClose, onSave, periodo, title }) => {
  const [formData, setFormData] = useState({
    ano: new Date().getFullYear(),
    nome: "",
    dataInicio: "",
    dataFim: "",
    status: "Aberto",
    tipo: "Exercício"
  });

  useEffect(() => {
    if (periodo) {
      setFormData({
        ano: periodo.ano || new Date().getFullYear(),
        nome: periodo.nome || "",
        dataInicio: periodo.dataInicio ? new Date(periodo.dataInicio).toISOString().split("T")[0] : "",
        dataFim: periodo.dataFim ? new Date(periodo.dataFim).toISOString().split("T")[0] : "",
        status: periodo.status || "Aberto",
        tipo: periodo.tipo || "Exercício"
      });
    } else {
      setFormData({
        ano: new Date().getFullYear(),
        nome: "",
        dataInicio: `${new Date().getFullYear()}-01-01`,
        dataFim: `${new Date().getFullYear()}-12-31`,
        status: "Aberto",
        tipo: "Exercício"
      });
    }
  }, [periodo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{title || (periodo ? "Editar Período" : "Novo Período")}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ano *</label>
            <input
              type="number"
              required
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={formData.ano}
              onChange={(e) => setFormData({...formData, ano: parseInt(e.target.value)})}
              min="2000"
              max="2100"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome do Período</label>
            <input
              type="text"
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Exercício 2024, 1º Trimestre 2024"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Data Início *</label>
            <input
              type="date"
              required
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={formData.dataInicio}
              onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Data Fim *</label>
            <input
              type="date"
              required
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={formData.dataFim}
              onChange={(e) => setFormData({...formData, dataFim: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo</label>
            <select
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
            >
              <option value="Exercício">Exercício Anual</option>
              <option value="Trimestre">Trimestre</option>
              <option value="Semestre">Semestre</option>
              <option value="Mês">Mês</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="Aberto">Aberto</option>
              <option value="Fechado">Fechado</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal de Importação
const ModalImportacao = ({ isOpen, onClose, onImport, onDownloadModelo, loading }) => {
  const [file, setFile] = useState(null);
  const [tipoFicheiro, setTipoFicheiro] = useState("excel");
  const fileInputRef = useRef(null);

  const getFormatosAceites = () => {
    switch(tipoFicheiro) {
      case "excel": return ".xlsx,.xls,.csv";
      case "pdf": return ".pdf";
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
          <h3 className="text-xl font-bold text-white">Importar Períodos</h3>
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
          </div>
          
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-xs text-blue-300 flex items-center gap-2 mb-2">
              <FileSpreadsheet size={14} />
              <strong>Modelos de Importação:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onDownloadModelo("excel")} className="text-blue-400 text-xs hover:underline">📥 Excel</button>
              <button onClick={() => onDownloadModelo("csv")} className="text-blue-400 text-xs hover:underline">📥 CSV</button>
              <button onClick={() => onDownloadModelo("xml")} className="text-blue-400 text-xs hover:underline">📥 XML</button>
              <button onClick={() => onDownloadModelo("json")} className="text-blue-400 text-xs hover:underline">📥 JSON</button>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white">Cancelar</button>
            <button onClick={handleImport} disabled={loading || !file} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50">
              <Upload size={18} /> {loading ? "Importando..." : "Importar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PeriodosFiscais = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [periodoEditando, setPeriodoEditando] = useState(null);
  const [filtroAno, setFiltroAno] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const BASE_URL = "https://sirexa-api.onrender.com";
  const getHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) setEmpresaSelecionada(userEmpresaId);
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => { buscarEmpresas(); }, []);
  useEffect(() => { if (empresaSelecionada) carregarPeriodos(); }, [empresaSelecionada]);

  const buscarEmpresas = async () => {
    if (isTecnico()) { setLoadingEmpresas(false); return; }
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

  const carregarPeriodos = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/periodos?empresaId=${empresaSelecionada || userEmpresaId}`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) setPeriodos(data.dados || []);
      }
    } catch (error) { console.error("Erro ao carregar períodos:", error); }
    finally { setLoading(false); }
  };

  const salvarPeriodo = async (formData) => {
    try {
      const url = periodoEditando 
        ? `${BASE_URL}/api/contabilidade/periodos/${periodoEditando._id}`
        : `${BASE_URL}/api/contabilidade/periodos`;
      const method = periodoEditando ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({ empresaId: empresaSelecionada || userEmpresaId, ...formData })
      });
      
      if (response.ok) {
        alert(periodoEditando ? "✅ Período atualizado!" : "✅ Período criado!");
        setShowModal(false);
        setPeriodoEditando(null);
        carregarPeriodos();
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.mensagem}`);
      }
    } catch (error) { console.error("Erro ao salvar período:", error); alert("❌ Erro ao salvar período"); }
  };

  const fecharPeriodo = async (id) => {
    if (!confirm("Deseja fechar este período? Após fechado, não poderá fazer lançamentos.")) return;
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/periodos/${id}/fechar`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ empresaId: empresaSelecionada || userEmpresaId })
      });
      if (response.ok) { alert("✅ Período fechado com sucesso!"); carregarPeriodos(); }
      else { const error = await response.json(); alert(`❌ Erro: ${error.mensagem}`); }
    } catch (error) { console.error("Erro ao fechar período:", error); alert("❌ Erro ao fechar período"); }
  };

  const reabrirPeriodo = async (id) => {
    if (!confirm("Deseja reabrir este período?")) return;
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/periodos/${id}/reabrir`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ empresaId: empresaSelecionada || userEmpresaId })
      });
      if (response.ok) { alert("✅ Período reaberto com sucesso!"); carregarPeriodos(); }
      else { const error = await response.json(); alert(`❌ Erro: ${error.mensagem}`); }
    } catch (error) { console.error("Erro ao reabrir período:", error); alert("❌ Erro ao reabrir período"); }
  };

  const excluirPeriodo = async (id) => {
    if (!confirm("Deseja excluir este período? Esta ação não pode ser desfeita.")) return;
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/periodos/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ empresaId: empresaSelecionada || userEmpresaId })
      });
      if (response.ok) { alert("✅ Período excluído!"); carregarPeriodos(); }
      else { const error = await response.json(); alert(`❌ Erro: ${error.mensagem}`); }
    } catch (error) { console.error("Erro ao excluir período:", error); alert("❌ Erro ao excluir período"); }
  };

  const downloadModelo = async (formato) => {
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/modelo-periodos?formato=${formato}`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modelo_periodos.${formato === "excel" ? "xlsx" : formato}`;
        document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
        alert(`✅ Download do modelo ${formato.toUpperCase()} iniciado!`);
      }
    } catch (error) { console.error("Erro no download:", error); alert("❌ Erro ao baixar modelo"); }
  };

  const handleImportarFicheiro = async (file, tipo) => {
    setImportando(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("empresaId", empresaSelecionada || userEmpresaId);
    formData.append("tipo", tipo);
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/importar-periodos`, {
        method: "POST", headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData
      });
      const data = await response.json();
      if (response.ok && data.sucesso) { alert(`✅ ${data.mensagem}`); setShowImportModal(false); carregarPeriodos(); }
      else alert(`❌ Erro: ${data.mensagem || "Falha na importação"}`);
    } catch (error) { console.error("Erro na importação:", error); alert("❌ Erro ao importar"); }
    finally { setImportando(false); }
  };

  const exportarExcel = () => {
    setExportando(true);
    try {
      const dadosExport = periodosFiltrados.map(p => ({
        "Ano": p.ano, "Nome": p.nome, "Data Início": new Date(p.dataInicio).toLocaleDateString("pt-AO"),
        "Data Fim": new Date(p.dataFim).toLocaleDateString("pt-AO"), "Tipo": p.tipo, "Status": p.status
      }));
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Períodos Fiscais");
      XLSX.writeFile(wb, `periodos_fiscais_${new Date().toISOString().split("T")[0]}.xlsx`);
      alert("✅ Excel exportado!");
    } catch (error) { console.error("Erro ao exportar:", error); alert("❌ Erro ao exportar"); }
    finally { setExportando(false); }
  };

  const exportarCSV = () => {
    setExportando(true);
    try {
      const dadosExport = periodosFiltrados.map(p => `${p.ano},${p.nome},${new Date(p.dataInicio).toLocaleDateString("pt-AO")},${new Date(p.dataFim).toLocaleDateString("pt-AO")},${p.tipo},${p.status}`);
      const csv = ["Ano,Nome,Data Início,Data Fim,Tipo,Status", ...dadosExport].join("\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url; link.setAttribute('download', `periodos_fiscais_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      alert("✅ CSV exportado!");
    } catch (error) { console.error("Erro ao exportar CSV:", error); alert("❌ Erro ao exportar CSV"); }
    finally { setExportando(false); }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const empresaAtual = isTecnico() ? userEmpresaNome : empresas.find(e => e._id === empresaSelecionada)?.nome;
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("PERÍODOS FISCAIS", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Empresa: ${empresaAtual || "Não selecionada"}`, 14, 25);
      doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-AO")}`, 14, 32);
      const dadosTabela = periodosFiltrados.map(p => [p.ano, p.nome, new Date(p.dataInicio).toLocaleDateString("pt-AO"), new Date(p.dataFim).toLocaleDateString("pt-AO"), p.tipo, p.status]);
      autoTable(doc, { startY: 40, head: [["Ano", "Nome", "Início", "Fim", "Tipo", "Status"]], body: dadosTabela, theme: "striped", headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 8, cellPadding: 2 } });
      doc.save(`periodos_fiscais_${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✅ PDF exportado!");
    } catch (error) { console.error("Erro ao gerar PDF:", error); alert("❌ Erro ao gerar PDF"); }
    finally { setExportando(false); }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case "Aberto": return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-900 text-green-300 text-xs"><Unlock size={12} /> Aberto</span>;
      case "Fechado": return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-900 text-yellow-300 text-xs"><Lock size={12} /> Fechado</span>;
      case "Bloqueado": return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-900 text-red-300 text-xs"><Lock size={12} /> Bloqueado</span>;
      default: return <span className="px-2 py-1 rounded-full bg-gray-700 text-gray-300 text-xs">{status}</span>;
    }
  };

  const periodosFiltrados = periodos.filter(p => {
    if (filtroAno !== "todos" && p.ano !== parseInt(filtroAno)) return false;
    if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
    return true;
  });

  const anosDisponiveis = [...new Set(periodos.map(p => p.ano))].sort((a,b) => b - a);

  if (loadingEmpresas && isGestor()) {
    return <Layout title="Períodos Fiscais" showBackButton backToRoute="/contabilidade"><div className="flex justify-center items-center h-64"><Loader2 size={40} className="animate-spin text-blue-400" /></div></Layout>;
  }

  if (isGestor() && !empresaSelecionada && empresas.length > 0) {
    return (
      <Layout title="Períodos Fiscais" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64"><div className="text-center"><Building2 size={48} className="mx-auto mb-4 text-gray-500" /><p className="text-gray-400">Selecione uma empresa para continuar</p><button onClick={() => setEmpresaSelecionada(empresas[0]?._id)} className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white">Selecionar Empresa</button></div></div>
      </Layout>
    );
  }

  return (
    <Layout title="Períodos Fiscais" showBackButton backToRoute="/contabilidade">
      <div className="space-y-6 p-4">
        <EmpresaSelector empresas={empresas} empresaSelecionada={empresaSelecionada} setEmpresaSelecionada={setEmpresaSelecionada} onRefresh={buscarEmpresas} loading={loadingEmpresas} isTecnico={isTecnico()} empresaNome={userEmpresaNome} />

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3"><Calendar size={28} className="text-purple-400" /><div><h2 className="text-xl font-bold text-white">Períodos Fiscais</h2><p className="text-gray-400 text-sm">Gestão de exercícios e períodos contabilísticos</p></div></div>
            <div className="flex gap-2">
              <button onClick={() => setShowImportModal(true)} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-white flex items-center gap-2"><Upload size={16} /> Importar</button>
              <button onClick={() => { setPeriodoEditando(null); setShowModal(true); }} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white flex items-center gap-2"><Plus size={16} /> Novo Período</button>
              <button onClick={exportarExcel} disabled={exportando || periodosFiltrados.length === 0} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white"><FileSpreadsheet size={18} /> Excel</button>
              <button onClick={exportarCSV} disabled={exportando || periodosFiltrados.length === 0} className="bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg text-white"><FileText size={18} /> CSV</button>
              <button onClick={exportarPDF} disabled={exportando || periodosFiltrados.length === 0} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white"><Printer size={18} /> PDF</button>
              <button onClick={carregarPeriodos} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white"><RefreshCw size={18} /></button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            <div><label className="block text-xs text-gray-400 mb-1">Ano</label><select className="bg-gray-700 rounded-lg px-3 py-2 text-white" value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}><option value="todos">Todos os anos</option>{anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}</select></div>
            <div><label className="block text-xs text-gray-400 mb-1">Status</label><select className="bg-gray-700 rounded-lg px-3 py-2 text-white" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}><option value="todos">Todos</option><option value="Aberto">Aberto</option><option value="Fechado">Fechado</option><option value="Bloqueado">Bloqueado</option></select></div>
            <div><button onClick={carregarPeriodos} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white flex items-center gap-2"><Search size={18} /> Filtrar</button></div>
            <div className="flex-1"></div>
            <div className="bg-gray-700 rounded-lg px-3 py-2"><span className="text-sm text-gray-300">Total: {periodosFiltrados.length} períodos</span></div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700"><tr className="text-left text-gray-300"><th className="p-3">Ano</th><th className="p-3">Nome</th><th className="p-3">Data Início</th><th className="p-3">Data Fim</th><th className="p-3">Tipo</th><th className="p-3">Status</th><th className="p-3 text-center">Ações</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="7" className="text-center p-8"><Loader2 size={32} className="animate-spin mx-auto" /></td></tr> :
                 periodosFiltrados.length === 0 ? <tr><td colSpan="7" className="text-center p-8 text-gray-400">Nenhum período encontrado</td></tr> :
                 periodosFiltrados.map((p) => (
                   <tr key={p._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                     <td className="p-3 font-bold">{p.ano}</td>
                     <td className="p-3">{p.nome || `${p.tipo} ${p.ano}`}</td>
                     <td className="p-3">{new Date(p.dataInicio).toLocaleDateString("pt-AO")}</td>
                     <td className="p-3">{new Date(p.dataFim).toLocaleDateString("pt-AO")}</td>
                     <td className="p-3"><span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full">{p.tipo}</span></td>
                     <td className="p-3">{getStatusBadge(p.status)}</td>
                     <td className="p-3 text-center"><div className="flex justify-center gap-2">
                       <button onClick={() => { setPeriodoEditando(p); setShowModal(true); }} className="text-blue-400 hover:text-blue-300" title="Editar"><Edit size={16} /></button>
                       {p.status === "Aberto" && <button onClick={() => fecharPeriodo(p._id)} className="text-yellow-400 hover:text-yellow-300" title="Fechar período"><Lock size={16} /></button>}
                       {p.status === "Fechado" && <button onClick={() => reabrirPeriodo(p._id)} className="text-green-400 hover:text-green-300" title="Reabrir período"><Unlock size={16} /></button>}
                       <button onClick={() => excluirPeriodo(p._id)} className="text-red-400 hover:text-red-300" title="Excluir"><Trash2 size={16} /></button>
                     </div></td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>

        <ModalPeriodo isOpen={showModal} onClose={() => { setShowModal(false); setPeriodoEditando(null); }} onSave={salvarPeriodo} periodo={periodoEditando} title={periodoEditando ? "Editar Período" : "Novo Período"} />
        <ModalImportacao isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImportarFicheiro} onDownloadModelo={downloadModelo} loading={importando} />
      </div>
    </Layout>
  );
};

export default PeriodosFiscais;