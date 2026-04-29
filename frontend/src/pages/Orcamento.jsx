// frontend/src/pages/Orcamento.jsx - VERSÃO COM CATEGORIA CORRIGIDA
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { useAuth } from "../contexts/AuthContext";
import { 
  Plus, Search, TrendingUp, TrendingDown,
  Edit, Trash2, DollarSign, BarChart3, 
  FileText, Download, Printer, Loader2, Building, CheckCircle, 
  XCircle, Clock, AlertCircle, Eye, Target,
  Layers, Briefcase, ShoppingBag, Users, 
  Cpu, Award, Activity, Building2, X, RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Tipos de Orçamento
const TIPOS_ORCAMENTO = [
  { id: "Base Zero", nome: "Base Zero", icon: <Target size={16} />, cor: "bg-purple-600" },
  { id: "Opex", nome: "OPEX", icon: <Activity size={16} />, cor: "bg-blue-600" },
  { id: "Capex", nome: "CAPEX", icon: <Layers size={16} />, cor: "bg-indigo-600" },
  { id: "Vendas", nome: "Vendas", icon: <ShoppingBag size={16} />, cor: "bg-green-600" },
  { id: "Custos", nome: "Custos", icon: <Briefcase size={16} />, cor: "bg-red-600" },
  { id: "Fluxo Caixa", nome: "Fluxo de Caixa", icon: <DollarSign size={16} />, cor: "bg-teal-600" },
  { id: "Marketing", nome: "Marketing", icon: <TrendingUp size={16} />, cor: "bg-pink-600" },
  { id: "Pessoal", nome: "Pessoal", icon: <Users size={16} />, cor: "bg-cyan-600" },
  { id: "Tecnologia", nome: "Tecnologia", icon: <Cpu size={16} />, cor: "bg-slate-600" },
  { id: "Outros", nome: "Outros", icon: <FileText size={16} />, cor: "bg-gray-600" }
];

const CATEGORIAS = [
  "Administrativo", "Comercial", "Produção", "Marketing", 
  "Pessoal", "Infraestrutura", "Tecnologia", "Logística",
  "Jurídico", "Financeiro", "Consultoria", "Outros"
];

const CENARIOS = ["Otimista", "Pessimista", "Realista", "Aprovado"];
const STATUS = ["Rascunho", "Pendente", "Aprovado", "Rejeitado", "Em Execução", "Concluído"];

function Orcamento() {
  const navigate = useNavigate();
  const { user, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [orcamentos, setOrcamentos] = useState([]);
  const [comparacao, setComparacao] = useState(null);
  const [previsao, setPrevisao] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("lista");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    descricao: "",
    tipoOrcamento: "Base Zero",
    cenario: "Realista",
    valor: "",
    categoria: "Outros", // Valor padrão para evitar erro de required
    justificativa: "",
    observacoes: ""
  });
  const [valorInput, setValorInput] = useState("");
  
  const [filtros, setFiltros] = useState({
    tipoOrcamento: "Todos",
    cenario: "Todos",
    status: "Todos",
    busca: ""
  });
  
  const [periodo, setPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [itensPorPagina] = useState(10);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);
  const [mostrarModalDetalhes, setMostrarModalDetalhes] = useState(false);
  const [exportando, setExportando] = useState(false);

  const BASE_URL = "https://sirexa-api.onrender.com";
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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
    carregarEmpresas();
  }, []);

  // Recarregar quando dependências mudarem
  useEffect(() => {
    if (empresaSelecionada) {
      carregarTodosDados();
    }
  }, [empresaSelecionada, periodo.mes, periodo.ano]);

  // Recarregar quando filtros ou aba mudar
  useEffect(() => {
    if (empresaSelecionada) {
      if (abaAtiva === "lista") {
        carregarOrcamentos();
      } else if (abaAtiva === "comparacao") {
        carregarComparacao();
      } else if (abaAtiva === "previsao") {
        carregarPrevisao();
      } else if (abaAtiva === "dashboard") {
        carregarDashboard();
      }
    }
  }, [filtros, abaAtiva]);

  const carregarTodosDados = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      await Promise.all([
        carregarAnosDisponiveis(),
        carregarOrcamentos(),
        carregarDashboard(),
        carregarComparacao(),
        carregarPrevisao()
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMsg("❌ Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarAnosDisponiveis = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/orcamentos/anos`, { headers: getHeaders() });
      const data = await response.json();
      if (data.anos && data.anos.length > 0) {
        setAnosDisponiveis(data.anos);
      } else {
        const anoAtual = new Date().getFullYear();
        const anos = [];
        for (let i = anoAtual - 5; i <= anoAtual + 1; i++) anos.push(i);
        setAnosDisponiveis(anos);
      }
    } catch (error) {
      const anoAtual = new Date().getFullYear();
      const anos = [];
      for (let i = anoAtual - 5; i <= anoAtual + 1; i++) anos.push(i);
      setAnosDisponiveis(anos);
    }
  };

  const carregarOrcamentos = async () => {
    if (!empresaSelecionada) return;
    
    try {
      let url = `${BASE_URL}/api/orcamentos?empresaId=${empresaSelecionada}&mes=${periodo.mes}&ano=${periodo.ano}`;
      if (filtros.tipoOrcamento !== "Todos") url += `&tipoOrcamento=${encodeURIComponent(filtros.tipoOrcamento)}`;
      if (filtros.cenario !== "Todos") url += `&cenario=${encodeURIComponent(filtros.cenario)}`;
      if (filtros.status !== "Todos") url += `&status=${encodeURIComponent(filtros.status)}`;
      
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error("Erro na requisição");
      
      const data = await response.json();
      const listaOrcamentos = Array.isArray(data) ? data : [];
      setOrcamentos(listaOrcamentos);
      setPaginaActual(1);
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
      mostrarMsg("❌ Erro ao carregar orçamentos", "erro");
      setOrcamentos([]);
    }
  };

  const carregarComparacao = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const url = `${BASE_URL}/api/orcamentos/comparar?empresaId=${empresaSelecionada}&mes=${periodo.mes}&ano=${periodo.ano}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error("Erro ao carregar comparação");
      
      const data = await response.json();
      setComparacao(data);
    } catch (error) {
      console.error("Erro ao carregar comparação:", error);
      setComparacao(null);
    }
  };

  const carregarPrevisao = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const url = `${BASE_URL}/api/orcamentos/previsao?empresaId=${empresaSelecionada}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error("Erro ao carregar previsão");
      
      const data = await response.json();
      setPrevisao(data);
    } catch (error) {
      console.error("Erro ao carregar previsão:", error);
      setPrevisao(null);
    }
  };

  const carregarDashboard = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const url = `${BASE_URL}/api/orcamentos/dashboard?empresaId=${empresaSelecionada}&ano=${periodo.ano}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error("Erro ao carregar dashboard");
      
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setDashboard(null);
    }
  };

  const formatarMoedaBrasil = (valor) => {
    if (valor === undefined || valor === null || valor === "") return "";
    const numero = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(numero)) return "";
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const converterStringParaNumero = (valorStr) => {
    if (!valorStr) return 0;
    const limpo = String(valorStr).replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
  };

  const handleValorChange = (e) => {
    let value = e.target.value;
    let cleaned = value.replace(/[^\d,]/g, '');
    const partes = cleaned.split(',');
    if (partes.length > 2) {
      cleaned = partes[0] + ',' + partes.slice(1).join('');
    }
    if (cleaned.includes(',')) {
      const [inteiro, decimal] = cleaned.split(',');
      cleaned = inteiro + ',' + decimal.substring(0, 2);
    }
    setValorInput(cleaned);
    const numero = converterStringParaNumero(cleaned);
    setFormData(prev => ({ ...prev, valor: numero.toString() }));
  };

  const handleValorBlur = () => {
    if (valorInput) {
      const numero = converterStringParaNumero(valorInput);
      if (numero > 0) {
        setValorInput(formatarMoedaBrasil(numero));
        setFormData(prev => ({ ...prev, valor: numero.toString() }));
      }
    }
  };

  const criarOrcamento = async (e) => {
    e.preventDefault();
    
    if (!formData.descricao || !formData.descricao.trim()) {
      mostrarMsg("⚠️ Preencha a descrição do orçamento", "erro");
      return;
    }
    
    if (!formData.valor || formData.valor === "") {
      mostrarMsg("⚠️ Preencha o valor do orçamento", "erro");
      return;
    }
    
    const valorNumerico = parseFloat(formData.valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      mostrarMsg("⚠️ Insira um valor válido maior que zero", "erro");
      return;
    }

    // Garantir que a categoria tenha um valor válido
    const categoriaFinal = formData.categoria && formData.categoria.trim() !== "" 
      ? formData.categoria 
      : "Outros";

    setLoading(true);
    try {
      const payload = {
        descricao: formData.descricao.trim(),
        tipoOrcamento: formData.tipoOrcamento,
        cenario: formData.cenario,
        valor: valorNumerico,
        categoria: categoriaFinal,
        justificativa: formData.justificativa || "",
        observacoes: formData.observacoes || "",
        mes: periodo.mes,
        ano: periodo.ano,
        empresaId: empresaSelecionada
      };
      
      console.log("📤 Enviando payload:", payload);
      
      const response = await fetch(`${BASE_URL}/api/orcamentos`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || "Erro ao criar orçamento");
      }
      
      mostrarMsg("✅ Orçamento criado com sucesso!", "sucesso");
      
      resetForm();
      
      // Recarregar a página após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error("❌ Erro:", error);
      mostrarMsg(error.message || "❌ Erro ao criar orçamento", "erro");
      setLoading(false);
    }
  };

  const atualizarOrcamento = async (e) => {
    e.preventDefault();
    
    if (!editando) return;
    
    if (!formData.descricao || !formData.descricao.trim()) {
      mostrarMsg("⚠️ Preencha a descrição do orçamento", "erro");
      return;
    }
    
    if (!formData.valor || formData.valor === "") {
      mostrarMsg("⚠️ Preencha o valor do orçamento", "erro");
      return;
    }
    
    const valorNumerico = parseFloat(formData.valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      mostrarMsg("⚠️ Insira um valor válido maior que zero", "erro");
      return;
    }

    // Garantir que a categoria tenha um valor válido
    const categoriaFinal = formData.categoria && formData.categoria.trim() !== "" 
      ? formData.categoria 
      : "Outros";

    setLoading(true);
    try {
      const payload = {
        descricao: formData.descricao.trim(),
        tipoOrcamento: formData.tipoOrcamento,
        cenario: formData.cenario,
        valor: valorNumerico,
        categoria: categoriaFinal,
        justificativa: formData.justificativa || "",
        observacoes: formData.observacoes || "",
        mes: periodo.mes,
        ano: periodo.ano
      };
      
      const response = await fetch(`${BASE_URL}/api/orcamentos/${editando}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || "Erro ao atualizar orçamento");
      }
      
      mostrarMsg("✅ Orçamento atualizado com sucesso!", "sucesso");
      
      resetForm();
      
      // Recarregar a página após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error("❌ Erro:", error);
      mostrarMsg(error.message || "❌ Erro ao atualizar orçamento", "erro");
      setLoading(false);
    }
  };

  const excluirOrcamento = async (id, e) => {
    if (e) e.stopPropagation();
    
    if (!window.confirm("🛑 Tem certeza que deseja excluir este orçamento?")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/orcamentos/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Erro ao excluir");
      mostrarMsg("✅ Orçamento excluído com sucesso!", "sucesso");
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error("Erro ao excluir:", error);
      mostrarMsg("❌ Erro ao excluir orçamento", "erro");
      setLoading(false);
    }
  };

  const aprovarOrcamento = async (id, e) => {
    if (e) e.stopPropagation();
    
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/orcamentos/${id}/aprovar`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Erro ao aprovar");
      mostrarMsg("✅ Orçamento aprovado com sucesso!", "sucesso");
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      mostrarMsg("❌ Erro ao aprovar orçamento", "erro");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: "",
      tipoOrcamento: "Base Zero",
      cenario: "Realista",
      valor: "",
      categoria: "Outros",
      justificativa: "",
      observacoes: ""
    });
    setValorInput("");
    setEditando(null);
    setMostrarForm(false);
  };

  const editarOrcamento = (orcamento, e) => {
    if (e) e.stopPropagation();
    setEditando(orcamento._id);
    setFormData({
      descricao: orcamento.descricao,
      tipoOrcamento: orcamento.tipoOrcamento,
      cenario: orcamento.cenario,
      valor: orcamento.valor.toString(),
      categoria: orcamento.categoria || "Outros",
      justificativa: orcamento.justificativa || "",
      observacoes: orcamento.observacoes || ""
    });
    setValorInput(formatarMoedaBrasil(orcamento.valor));
    setMostrarForm(true);
  };

  const mostrarMsg = (msg, tipo) => {
    setMensagem(msg);
    setTipoMensagem(tipo);
    setTimeout(() => setMensagem(""), 3000);
  };

  const formatarNumero = (valor) => {
    if (!valor && valor !== 0) return "0,00";
    return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarMoeda = (valor) => `${formatarNumero(valor)} Kz`;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Aprovado': return <CheckCircle size={14} className="text-green-400" />;
      case 'Pendente': return <Clock size={14} className="text-yellow-400" />;
      case 'Rejeitado': return <XCircle size={14} className="text-red-400" />;
      case 'Em Execução': return <Activity size={14} className="text-blue-400" />;
      default: return <AlertCircle size={14} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aprovado': return "bg-green-900 text-green-300";
      case 'Pendente': return "bg-yellow-900 text-yellow-300";
      case 'Rejeitado': return "bg-red-900 text-red-300";
      case 'Em Execução': return "bg-blue-900 text-blue-300";
      default: return "bg-gray-700 text-gray-300";
    }
  };

  const exportarPDF = async () => {
    if (orcamentosFiltrados.length === 0) {
      mostrarMsg("📄 Nenhum orçamento para exportar", "erro");
      return;
    }
    
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const empresaAtual = isTecnico() 
        ? { nome: userEmpresaNome }
        : empresas.find(e => e._id === empresaSelecionada);
      
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE ORÇAMENTOS", pageWidth / 2, 25, { align: "center" });
      doc.setFontSize(12);
      doc.text(empresaAtual?.nome || "Empresa", pageWidth / 2, 38, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      let yPos = 60;
      doc.text(`Período: ${meses[periodo.mes - 1]} de ${periodo.ano}`, 20, yPos);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, yPos + 8);
      yPos += 25;
      
      const tableData = orcamentosFiltrados.map(o => [
        o.descricao,
        o.tipoOrcamento,
        o.cenario,
        formatarMoeda(o.valor),
        o.status,
        o.categoria || "-"
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Descrição", "Tipo", "Cenário", "Valor", "Status", "Categoria"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
      });
      
      doc.save(`orcamentos_${periodo.ano}.pdf`);
      mostrarMsg("✅ PDF exportado!", "sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMsg("❌ Erro ao exportar PDF", "erro");
    } finally {
      setExportando(false);
    }
  };

  const exportarExcel = () => {
    if (orcamentosFiltrados.length === 0) {
      mostrarMsg("📄 Nenhum orçamento para exportar", "erro");
      return;
    }
    
    const dados = [
      ["RELATÓRIO DE ORÇAMENTOS"],
      [`Período: ${meses[periodo.mes - 1]} de ${periodo.ano}`],
      [],
      ["Descrição", "Tipo", "Cenário", "Valor (Kz)", "Status", "Categoria"]
    ];
    
    orcamentosFiltrados.forEach(o => {
      dados.push([
        o.descricao,
        o.tipoOrcamento,
        o.cenario,
        o.valor,
        o.status,
        o.categoria || "-"
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(dados);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orçamentos");
    XLSX.writeFile(wb, `orcamentos_${periodo.ano}.xlsx`);
    mostrarMsg("✅ Excel exportado!", "sucesso");
  };

  const orcamentosFiltrados = orcamentos.filter(o => {
    const matchBusca = !filtros.busca || 
      o.descricao?.toLowerCase().includes(filtros.busca.toLowerCase());
    const matchTipo = filtros.tipoOrcamento === "Todos" || o.tipoOrcamento === filtros.tipoOrcamento;
    const matchCenario = filtros.cenario === "Todos" || o.cenario === filtros.cenario;
    const matchStatus = filtros.status === "Todos" || o.status === filtros.status;
    
    return matchBusca && matchTipo && matchCenario && matchStatus;
  });

  const paginados = orcamentosFiltrados.slice((paginaActual - 1) * itensPorPagina, paginaActual * itensPorPagina);
  const totalPaginas = Math.ceil(orcamentosFiltrados.length / itensPorPagina);

  // Gráficos
  const dadosEvolucao = {
    labels: dashboard?.totaisPorMes ? Object.keys(dashboard.totaisPorMes) : [],
    datasets: [{
      label: "Orçamentos",
      data: dashboard?.totaisPorMes ? Object.values(dashboard.totaisPorMes) : [],
      backgroundColor: "rgba(59, 130, 246, 0.6)",
      borderColor: "rgb(59, 130, 246)",
      borderWidth: 1
    }]
  };

  const dadosDistribuicao = {
    labels: dashboard?.distribuicao?.map(d => d.tipo) || [],
    datasets: [{
      data: dashboard?.distribuicao?.map(d => d.valor) || [],
      backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec489a"]
    }]
  };

  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { 
      legend: { 
        position: 'top', 
        labels: { color: '#374151' } 
      } 
    }
  };

  if (loadingEmpresas) {
    return (
      <Layout title="Orçamentos Empresariais" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Orçamentos Empresariais" showBackButton={true} backToRoute="/menu">
      {mensagem && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            tipoMensagem === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            {tipoMensagem === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem}</span>
          </div>
        </div>
      )}

      <div className="space-y-6 p-4">
        {isTecnico() && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Eye size={18} />
              <span className="text-sm">Operando como Técnico | Empresa: <strong>{userEmpresaNome}</strong></span>
            </div>
          </div>
        )}

        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => window.location.reload()}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const idx = anosDisponiveis.indexOf(periodo.ano);
                    if (idx > 0) setPeriodo({ ...periodo, ano: anosDisponiveis[idx - 1] });
                  }} disabled={anosDisponiveis.indexOf(periodo.ano) === 0}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-2 rounded-lg text-white">◀</button>
                  <select value={periodo.ano} onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}
                    className="px-4 py-2 rounded bg-gray-700 text-white">
                    {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                  <button onClick={() => {
                    const idx = anosDisponiveis.indexOf(periodo.ano);
                    if (idx < anosDisponiveis.length - 1) setPeriodo({ ...periodo, ano: anosDisponiveis[idx + 1] });
                  }} disabled={anosDisponiveis.indexOf(periodo.ano) === anosDisponiveis.length - 1}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-2 rounded-lg text-white">▶</button>
                </div>
                <select value={periodo.mes} onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })}
                  className="px-4 py-2 rounded bg-gray-700 text-white">
                  {meses.map((mes, idx) => <option key={idx} value={idx+1}>{mes}</option>)}
                </select>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-white flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Recarregar
                </button>
              </div>
            </div>

            <div className="border-b border-gray-700">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "lista", nome: "📋 Lista", icon: <FileText size={16} /> },
                  { id: "dashboard", nome: "📊 Dashboard", icon: <BarChart3 size={16} /> },
                  { id: "comparacao", nome: "📈 Comparação", icon: <TrendingUp size={16} /> },
                  { id: "previsao", nome: "🔮 Previsões", icon: <Target size={16} /> }
                ].map(aba => (
                  <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                    className={`px-4 py-2 rounded-t-lg flex items-center gap-2 transition ${
                      abaAtiva === aba.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}>
                    {aba.icon} {aba.nome}
                  </button>
                ))}
              </div>
            </div>

            {abaAtiva === "lista" && (
              <>
                <div className="flex justify-between gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Pesquisar..." className="w-full pl-10 p-2 rounded bg-gray-700 text-white"
                      value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg">
                      <Download size={18} />
                    </button>
                    <button onClick={exportarPDF} disabled={exportando} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg disabled:opacity-50">
                      {exportando ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                    </button>
                    <button onClick={() => setMostrarForm(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2">
                      <Plus size={18} /> Novo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select className="p-2 rounded bg-gray-700 text-white" value={filtros.tipoOrcamento} onChange={(e) => setFiltros({ ...filtros, tipoOrcamento: e.target.value })}>
                    <option value="Todos">Todos os Tipos</option>
                    {TIPOS_ORCAMENTO.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                  <select className="p-2 rounded bg-gray-700 text-white" value={filtros.cenario} onChange={(e) => setFiltros({ ...filtros, cenario: e.target.value })}>
                    <option value="Todos">Todos os Cenários</option>
                    {CENARIOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="p-2 rounded bg-gray-700 text-white" value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
                    <option value="Todos">Todos os Status</option>
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {dashboard && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4 text-center">
                      <DollarSign className="mx-auto mb-2 text-blue-400" size={24} />
                      <p className="text-2xl font-bold text-blue-400">{formatarMoeda(dashboard.totalGeral)}</p>
                      <p className="text-sm text-gray-300">Total Orçado</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-4 text-center">
                      <FileText className="mx-auto mb-2 text-green-400" size={24} />
                      <p className="text-2xl font-bold text-green-400">{dashboard.totalOrcamentos}</p>
                      <p className="text-sm text-gray-300">Total</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-4 text-center">
                      <Target className="mx-auto mb-2 text-purple-400" size={24} />
                      <p className="text-2xl font-bold text-purple-400">{Object.keys(dashboard.totaisPorTipo || {}).length}</p>
                      <p className="text-sm text-gray-300">Tipos</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900 to-amber-800 rounded-lg p-4 text-center">
                      <Award className="mx-auto mb-2 text-amber-400" size={24} />
                      <p className="text-2xl font-bold text-amber-400">{dashboard.totaisPorCenario?.Aprovado ? formatarMoeda(dashboard.totaisPorCenario.Aprovado) : "0 Kz"}</p>
                      <p className="text-sm text-gray-300">Aprovado</p>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-4 text-left font-semibold text-gray-700">Descrição</th>
                          <th className="p-4 text-left font-semibold text-gray-700">Tipo</th>
                          <th className="p-4 text-left font-semibold text-gray-700">Cenário</th>
                          <th className="p-4 text-right font-semibold text-gray-700">Valor</th>
                          <th className="p-4 text-center font-semibold text-gray-700">Status</th>
                          <th className="p-4 text-center font-semibold text-gray-700">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan="6" className="p-12 text-center"><Loader2 size={32} className="animate-spin mx-auto" /></td></tr>
                        ) : paginados.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-12 text-center text-gray-500">
                              <FileText className="mx-auto mb-2" size={32} />
                              <p>Nenhum orçamento encontrado</p>
                              <button onClick={() => setMostrarForm(true)} className="mt-2 text-blue-500 hover:text-blue-600">+ Criar primeiro orçamento</button>
                            </td>
                          </tr>
                        ) : (
                          paginados.map(o => {
                            const tipoInfo = TIPOS_ORCAMENTO.find(t => t.id === o.tipoOrcamento);
                            return (
                              <tr key={o._id} className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer" 
                                  onClick={() => { setOrcamentoSelecionado(o); setMostrarModalDetalhes(true); }}>
                                <td className="p-4 font-medium text-gray-800">{o.descricao}</td>
                                <td className="p-4">
                                  <span className={`${tipoInfo?.cor} text-white px-2 py-1 rounded-lg text-xs inline-flex items-center gap-1`}>
                                    {tipoInfo?.icon} {tipoInfo?.nome}
                                  </span>
                                </td>
                                <td className="p-4 text-gray-600">{o.cenario}</td>
                                <td className="p-4 text-right font-bold text-blue-600">{formatarMoeda(o.valor)}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs inline-flex items-center gap-1 ${getStatusColor(o.status)}`}>
                                    {getStatusIcon(o.status)} {o.status}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={(e) => editarOrcamento(o, e)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                                      <Edit size={16} />
                                    </button>
                                    <button onClick={(e) => excluirOrcamento(o._id, e)} className="text-red-600 hover:text-red-800 p-1" title="Excluir">
                                      <Trash2 size={16} />
                                    </button>
                                    {o.status === "Pendente" && (
                                      <button onClick={(e) => aprovarOrcamento(o._id, e)} className="text-green-600 hover:text-green-800 p-1" title="Aprovar">
                                        <CheckCircle size={16} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div className="p-4 bg-gray-100 flex justify-between items-center">
                      <button onClick={() => setPaginaActual(p => Math.max(1, p-1))} disabled={paginaActual === 1} 
                        className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg disabled:opacity-50">◀ Anterior</button>
                      <span className="text-sm text-gray-600">Página {paginaActual} de {totalPaginas}</span>
                      <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p+1))} disabled={paginaActual === totalPaginas} 
                        className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg disabled:opacity-50">Próxima ▶</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {abaAtiva === "dashboard" && dashboard && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Evolução Mensal</h3>
                    <div className="h-80"><Bar data={dadosEvolucao} options={opcoesGrafico} /></div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">🥧 Distribuição</h3>
                    <div className="h-80"><Pie data={dadosDistribuicao} options={opcoesGrafico} /></div>
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === "comparacao" && comparacao && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Comparação Orçado vs Realizado</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left text-gray-700">Tipo</th>
                        <th className="p-3 text-right text-gray-700">Orçado (Kz)</th>
                        <th className="p-3 text-right text-gray-700">Realizado (Kz)</th>
                        <th className="p-3 text-center text-gray-700">Execução (%)</th>
                        <th className="p-3 text-center text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparacao.comparacao?.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="p-3 font-medium text-gray-800">{item.tipo}</td>
                          <td className="p-3 text-right text-gray-600">{formatarMoeda(item.orcado)}</td>
                          <td className="p-3 text-right text-gray-600">{formatarMoeda(item.realizado)}</td>
                          <td className="p-3 text-center font-bold" style={{ color: item.percentual > 100 ? '#dc2626' : '#10b981' }}>
                            {item.percentual}%
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.percentual > 100 ? 'bg-red-100 text-red-700' : 
                              item.percentual >= 80 ? 'bg-green-100 text-green-700' : 
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.percentual > 100 ? 'Acima do Orçado' : 
                               item.percentual >= 80 ? 'Dentro do Orçado' : 
                               'Abaixo do Orçado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {comparacao.resumo && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Resumo Geral</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Orçado</p>
                        <p className="text-lg font-bold text-blue-600">{formatarMoeda(comparacao.resumo.totalOrcado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Realizado</p>
                        <p className="text-lg font-bold text-green-600">{formatarMoeda(comparacao.resumo.totalRealizado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Execução Geral</p>
                        <p className={`text-lg font-bold ${comparacao.resumo.percentualGeral > 100 ? 'text-red-600' : 'text-green-600'}`}>
                          {comparacao.resumo.percentualGeral}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {abaAtiva === "previsao" && previsao && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🔮 Previsões Futuras</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Média Histórica</p>
                    <p className="text-2xl font-bold text-blue-600">{formatarMoeda(previsao.estatisticas?.media)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Tendência</p>
                    <p className={`text-2xl font-bold ${previsao.estatisticas?.variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {previsao.estatisticas?.variacao}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Próximos Meses</p>
                    <p className="text-2xl font-bold text-purple-600">{previsao.previsoes?.length}</p>
                  </div>
                </div>
                {previsao.previsoes && previsao.previsoes.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 text-left text-gray-700">Período</th>
                          <th className="p-3 text-right text-gray-700">Valor Previsto (Kz)</th>
                          <th className="p-3 text-right text-gray-700">Mínimo (Kz)</th>
                          <th className="p-3 text-right text-gray-700">Máximo (Kz)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previsao.previsoes.map((p, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="p-3 font-medium text-gray-800">{meses[p.mes - 1]}/{p.ano}</td>
                            <td className="p-3 text-right text-blue-600 font-bold">{formatarMoeda(p.valor)}</td>
                            <td className="p-3 text-right text-gray-600">{formatarMoeda(p.intervaloConfianca?.inferior)}</td>
                            <td className="p-3 text-right text-gray-600">{formatarMoeda(p.intervaloConfianca?.superior)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Formulário */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    {editando ? <Edit className="text-white" size={20} /> : <Plus className="text-white" size={20} />}
                  </div>
                  <h2 className="text-xl font-bold text-white">{editando ? "✏️ Editar" : "➕ Novo Orçamento"}</h2>
                </div>
                <button onClick={resetForm} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            <form onSubmit={editando ? atualizarOrcamento : criarOrcamento} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição *</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-400" 
                  value={formData.descricao} 
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo *</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.tipoOrcamento} 
                    onChange={(e) => setFormData({...formData, tipoOrcamento: e.target.value})}
                  >
                    {TIPOS_ORCAMENTO.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cenário</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.cenario} 
                    onChange={(e) => setFormData({...formData, cenario: e.target.value})}
                  >
                    {CENARIOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Valor (Kz) *</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:ring-2 focus:ring-blue-400 text-right" 
                    placeholder="Ex: 250.000,00"
                    value={valorInput} 
                    onChange={handleValorChange} 
                    onBlur={handleValorBlur}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Categoria *</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.categoria} 
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Justificativa</label>
                <textarea 
                  rows={2} 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                  value={formData.justificativa} 
                  onChange={(e) => setFormData({...formData, justificativa: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
                <textarea 
                  rows={2} 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                  value={formData.observacoes} 
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  {loading ? "Processando..." : (editando ? "Atualizar" : "Criar")}
                </button>
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-semibold text-white transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {mostrarModalDetalhes && orcamentoSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Detalhes do Orçamento</h2>
                <button onClick={() => setMostrarModalDetalhes(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-400">Descrição</p>
                <p className="font-semibold text-white">{orcamentoSelecionado.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Tipo</p>
                  <p className="text-white">{orcamentoSelecionado.tipoOrcamento}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cenário</p>
                  <p className="text-white">{orcamentoSelecionado.cenario}</p>
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3">
                <p className="text-sm text-gray-400">Valor</p>
                <p className="text-2xl font-bold text-amber-400">{formatarMoeda(orcamentoSelecionado.valor)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Categoria</p>
                <p className="text-white">{orcamentoSelecionado.categoria || "Não informada"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs inline-flex items-center gap-1 ${getStatusColor(orcamentoSelecionado.status)}`}>
                  {getStatusIcon(orcamentoSelecionado.status)} {orcamentoSelecionado.status}
                </span>
              </div>
              {orcamentoSelecionado.justificativa && (
                <div>
                  <p className="text-sm text-gray-400">Justificativa</p>
                  <p className="text-white text-sm">{orcamentoSelecionado.justificativa}</p>
                </div>
              )}
              <button onClick={() => setMostrarModalDetalhes(false)} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold text-white mt-4">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
      `}</style>
    </Layout>
  );
}

export default Orcamento;