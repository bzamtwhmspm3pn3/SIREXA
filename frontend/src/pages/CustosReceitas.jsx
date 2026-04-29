import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { useAuth } from "../contexts/AuthContext";
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  PieChart,
  Loader2,
  RefreshCw,
  Calendar,
  BarChart3,
  Filter,
  Download,
  Building2,
  Eye,
  FileText,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from "lucide-react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from "chart.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const CustosReceitas = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [vendas, setVendas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroCategoriaReceita, setFiltroCategoriaReceita] = useState("todas");
  const [filtroCategoriaCusto, setFiltroCategoriaCusto] = useState("todas");
  const [filtroStatusCusto, setFiltroStatusCusto] = useState("todos");
  const [paginaReceitas, setPaginaReceitas] = useState(1);
  const [paginaCustos, setPaginaCustos] = useState(1);
  const [itensPorPagina] = useState(10);
  const [resumo, setResumo] = useState({
    totalReceitas: 0,
    totalCustos: 0,
    resultado: 0,
    quantidadeReceitas: 0,
    quantidadeCustos: 0,
    custosPagos: 0,
    custosPendentes: 0,
    custosAtrasados: 0
  });
  const [dadosMes, setDadosMes] = useState({ meses: [], receitasPorMes: [], custosPorMes: [] });
  const [dadosCategoria, setDadosCategoria] = useState({ categoriasReceitas: {}, categoriasCustos: {} });
  const [todasReceitas, setTodasReceitas] = useState([]);
  const [todosCustos, setTodosCustos] = useState([]);
  const [exportando, setExportando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("receitas");

  const BASE_URL = "https://sirexa-api.onrender.com";
  
  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Lista de categorias
  const categoriasReceitas = ["Vendas", "Prestação de Serviços"];
  const categoriasCustos = ["Salários", "Manutenção", "Abastecimento", "Fornecedores", "Impostos", "Outros"];
  const statusCustos = [
    { id: "todos", nome: "Todos", icon: <Filter size={14} /> },
    { id: "Pago", nome: "Pagos", icon: <CheckCircle size={14} className="text-green-400" /> },
    { id: "Pendente", nome: "Pendentes", icon: <Clock size={14} className="text-yellow-400" /> },
    { id: "Atrasado", nome: "Atrasados", icon: <AlertCircle size={14} className="text-red-400" /> },
    { id: "Cancelado", nome: "Cancelados", icon: <XCircle size={14} className="text-gray-400" /> }
  ];

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

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
      carregarDados();
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    if (vendas.length > 0 || pagamentos.length > 0) {
      processarDados();
    }
  }, [vendas, pagamentos]);

  useEffect(() => {
    aplicarFiltros();
  }, [filtroDataInicio, filtroDataFim, filtroCategoriaReceita, filtroCategoriaCusto, filtroStatusCusto, todasReceitas, todosCustos]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem(texto);
    setTipoMensagem(tipo);
    setTimeout(() => {
      setMensagem("");
      setTipoMensagem("");
    }, 3000);
  };

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
      mostrarMensagem("❌ Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  async function carregarDados() {
    setLoading(true);
    try {
      const vendasRes = await fetch(`${BASE_URL}/api/vendas/historico/${empresaSelecionada}`, { 
        headers: getHeaders() 
      });
      let vendasData = [];
      if (vendasRes.ok) {
        const data = await vendasRes.json();
        vendasData = data.dados || [];
      }
      
      const pagamentosRes = await fetch(`${BASE_URL}/api/pagamentos?empresaId=${empresaSelecionada}`, { 
        headers: getHeaders() 
      });
      let pagamentosData = [];
      if (pagamentosRes.ok) {
        const data = await pagamentosRes.json();
        pagamentosData = data.dados || [];
      }
      
      setVendas(vendasData);
      setPagamentos(pagamentosData);
      mostrarMensagem("✅ Dados carregados com sucesso!", "sucesso");
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      mostrarMensagem("❌ Erro ao carregar dados", "erro");
    } finally {
      setLoading(false);
    }
  }

  function processarDados() {
    // Processar Receitas (Vendas)
    const receitas = vendas.map(v => {
      const dataObj = new Date(v.data);
      let categoria = "Vendas";
      if (v.tipoFactura === "Prestação de Serviço") {
        categoria = "Prestação de Serviços";
      }
      
      return {
        id: v._id,
        referencia: v.numeroFactura,
        descricao: v.cliente,
        valor: v.total || 0,
        data: v.data,
        categoria: categoria,
        tipo: "Receita",
        mes: dataObj.getMonth() + 1,
        ano: dataObj.getFullYear(),
        status: "Realizada",
        dataOriginal: v.data,
        numeroDocumento: v.numeroFactura
      };
    });
    
    // Processar Custos (Pagamentos)
    const custos = pagamentos.map(p => {
      const dataObj = new Date(p.dataVencimento || p.dataPagamento);
      let categoria = "Outros";
      
      if (p.tipo === "Folha Salarial") categoria = "Salários";
      else if (p.tipo === "Manutenção") categoria = "Manutenção";
      else if (p.tipo === "Abastecimento") categoria = "Abastecimento";
      else if (p.tipo === "Fornecedor") categoria = "Fornecedores";
      else if (p.tipo === "Imposto") categoria = "Impostos";
      
      // Determinar status visual
      let statusIcon = null;
      let statusColor = "";
      if (p.status === "Pago") {
        statusIcon = <CheckCircle size={14} />;
        statusColor = "text-green-400";
      } else if (p.status === "Pendente") {
        statusIcon = <Clock size={14} />;
        statusColor = "text-yellow-400";
      } else if (p.status === "Atrasado") {
        statusIcon = <AlertCircle size={14} />;
        statusColor = "text-red-400";
      } else if (p.status === "Cancelado") {
        statusIcon = <XCircle size={14} />;
        statusColor = "text-gray-400";
      }
      
      return {
        id: p._id,
        referencia: p.referencia,
        descricao: p.beneficiario,
        valor: p.valor || 0,
        data: p.dataPagamento || p.dataVencimento,
        vencimento: p.dataVencimento,
        categoria: categoria,
        tipo: "Custo",
        mes: dataObj.getMonth() + 1,
        ano: dataObj.getFullYear(),
        status: p.status || "Pendente",
        statusIcon,
        statusColor,
        dataOriginal: p.dataPagamento || p.dataVencimento,
        formaPagamento: p.formaPagamento,
        documentoReferencia: p.referencia
      };
    });
    
    setTodasReceitas(receitas);
    setTodosCustos(custos);
  }

  function aplicarFiltros() {
    // Filtrar Receitas
    let receitasFiltradas = [...todasReceitas];
    
    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio);
      receitasFiltradas = receitasFiltradas.filter(r => new Date(r.data) >= inicio);
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim);
      receitasFiltradas = receitasFiltradas.filter(r => new Date(r.data) <= fim);
    }
    if (filtroCategoriaReceita !== "todas") {
      receitasFiltradas = receitasFiltradas.filter(r => r.categoria === filtroCategoriaReceita);
    }
    
    // Filtrar Custos
    let custosFiltrados = [...todosCustos];
    
    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio);
      custosFiltrados = custosFiltrados.filter(c => new Date(c.data) >= inicio);
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim);
      custosFiltrados = custosFiltrados.filter(c => new Date(c.data) <= fim);
    }
    if (filtroCategoriaCusto !== "todas") {
      custosFiltrados = custosFiltrados.filter(c => c.categoria === filtroCategoriaCusto);
    }
    if (filtroStatusCusto !== "todos") {
      custosFiltrados = custosFiltrados.filter(c => c.status === filtroStatusCusto);
    }
    
    // Calcular resumos
    const totalReceitas = receitasFiltradas.reduce((acc, r) => acc + r.valor, 0);
    const totalCustos = custosFiltrados.reduce((acc, c) => acc + c.valor, 0);
    const resultado = totalReceitas - totalCustos;
    
    // Estatísticas de custos
    const custosPagos = custosFiltrados.filter(c => c.status === "Pago").length;
    const custosPendentes = custosFiltrados.filter(c => c.status === "Pendente").length;
    const custosAtrasados = custosFiltrados.filter(c => c.status === "Atrasado").length;
    
    setResumo({
      totalReceitas,
      totalCustos,
      resultado,
      quantidadeReceitas: receitasFiltradas.length,
      quantidadeCustos: custosFiltrados.length,
      custosPagos,
      custosPendentes,
      custosAtrasados
    });
    
    // Dados por mês
    const mesesAbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const receitasPorMes = new Array(12).fill(0);
    const custosPorMes = new Array(12).fill(0);
    
    receitasFiltradas.forEach(r => {
      if (r.mes && r.mes >= 1 && r.mes <= 12) {
        receitasPorMes[r.mes - 1] += r.valor;
      }
    });
    
    custosFiltrados.forEach(c => {
      if (c.mes && c.mes >= 1 && c.mes <= 12) {
        custosPorMes[c.mes - 1] += c.valor;
      }
    });
    
    setDadosMes({ meses: mesesAbr, receitasPorMes, custosPorMes });
    
    // Dados por categoria
    const categoriasReceitas = {};
    const categoriasCustos = {};
    
    receitasFiltradas.forEach(r => {
      categoriasReceitas[r.categoria] = (categoriasReceitas[r.categoria] || 0) + r.valor;
    });
    
    custosFiltrados.forEach(c => {
      categoriasCustos[c.categoria] = (categoriasCustos[c.categoria] || 0) + c.valor;
    });
    
    setDadosCategoria({ categoriasReceitas, categoriasCustos });
    setPaginaReceitas(1);
    setPaginaCustos(1);
  }

  const getStatusCss = (status) => {
    switch(status) {
      case "Pago": return "bg-green-900 text-green-300";
      case "Pendente": return "bg-yellow-900 text-yellow-300";
      case "Atrasado": return "bg-red-900 text-red-300";
      case "Cancelado": return "bg-gray-700 text-gray-400";
      default: return "bg-gray-700 text-gray-400";
    }
  };

  const exportarExcel = () => {
    // Exportar Receitas
    let receitasExport = [...todasReceitas];
    if (filtroDataInicio) receitasExport = receitasExport.filter(r => new Date(r.data) >= new Date(filtroDataInicio));
    if (filtroDataFim) receitasExport = receitasExport.filter(r => new Date(r.data) <= new Date(filtroDataFim));
    if (filtroCategoriaReceita !== "todas") receitasExport = receitasExport.filter(r => r.categoria === filtroCategoriaReceita);
    
    // Exportar Custos
    let custosExport = [...todosCustos];
    if (filtroDataInicio) custosExport = custosExport.filter(c => new Date(c.data) >= new Date(filtroDataInicio));
    if (filtroDataFim) custosExport = custosExport.filter(c => new Date(c.data) <= new Date(filtroDataFim));
    if (filtroCategoriaCusto !== "todas") custosExport = custosExport.filter(c => c.categoria === filtroCategoriaCusto);
    if (filtroStatusCusto !== "todos") custosExport = custosExport.filter(c => c.status === filtroStatusCusto);
    
    const planilhaReceitas = receitasExport.map(item => ({
      "Referência": item.referencia,
      "Descrição": item.descricao,
      "Categoria": item.categoria,
      "Valor (Kz)": item.valor,
      "Data": new Date(item.data).toLocaleDateString("pt-AO"),
      "Status": item.status
    }));
    
    const planilhaCustos = custosExport.map(item => ({
      "Referência": item.referencia,
      "Descrição": item.descricao,
      "Categoria": item.categoria,
      "Valor (Kz)": item.valor,
      "Data Vencimento": item.vencimento ? new Date(item.vencimento).toLocaleDateString("pt-AO") : "—",
      "Data Pagamento": item.data ? new Date(item.data).toLocaleDateString("pt-AO") : "—",
      "Status": item.status,
      "Forma Pagamento": item.formaPagamento || "—"
    }));
    
    const wb = XLSX.utils.book_new();
    if (planilhaReceitas.length) {
      const wsReceitas = XLSX.utils.json_to_sheet(planilhaReceitas);
      XLSX.utils.book_append_sheet(wb, wsReceitas, "Receitas");
    }
    if (planilhaCustos.length) {
      const wsCustos = XLSX.utils.json_to_sheet(planilhaCustos);
      XLSX.utils.book_append_sheet(wb, wsCustos, "Custos");
    }
    
    XLSX.writeFile(wb, `custos_receitas_${new Date().toISOString().split("T")[0]}.xlsx`);
    mostrarMensagem("✅ Excel exportado com sucesso!", "sucesso");
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RELATÓRIO DE CUSTOS E RECEITAS", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const empresaAtual = isTecnico() ? userEmpresaNome : empresas.find(e => e._id === empresaSelecionada)?.nome;
      doc.text(`Empresa: ${empresaAtual || "Não selecionada"}`, 20, yPos + 5);
      doc.text(`Período: ${filtroDataInicio || "Início"} a ${filtroDataFim || "Actual"}`, 20, yPos + 12);
      doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-AO")}`, 20, yPos + 19);
      yPos += 30;
      
      // Resumo Financeiro
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESUMO FINANCEIRO", 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Total de Receitas: ${formatarNumero(resumo.totalReceitas)} Kz`, 20, yPos + 5);
      doc.text(`Total de Custos: ${formatarNumero(resumo.totalCustos)} Kz`, 20, yPos + 12);
      doc.text(`Resultado: ${formatarNumero(Math.abs(resumo.resultado))} Kz (${resumo.resultado >= 0 ? 'Positivo' : 'Negativo'})`, 20, yPos + 19);
      doc.text(`Margem de Lucro: ${resumo.totalReceitas > 0 ? ((resumo.resultado / resumo.totalReceitas) * 100).toFixed(2) : '0.00'}%`, 20, yPos + 26);
      yPos += 40;
      
      // Estatísticas de Custos
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("ESTATÍSTICAS DE PAGAMENTOS", 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`✅ Pagos: ${resumo.custosPagos}`, 20, yPos + 5);
      doc.text(`⏳ Pendentes: ${resumo.custosPendentes}`, 80, yPos + 5);
      doc.text(`⚠️ Atrasados: ${resumo.custosAtrasados}`, 140, yPos + 5);
      yPos += 25;
      
      // Tabela de Receitas
      let receitasFiltradas = [...todasReceitas];
      if (filtroDataInicio) receitasFiltradas = receitasFiltradas.filter(r => new Date(r.data) >= new Date(filtroDataInicio));
      if (filtroDataFim) receitasFiltradas = receitasFiltradas.filter(r => new Date(r.data) <= new Date(filtroDataFim));
      if (filtroCategoriaReceita !== "todas") receitasFiltradas = receitasFiltradas.filter(r => r.categoria === filtroCategoriaReceita);
      
      const dadosReceitas = receitasFiltradas.slice(0, 50).map(r => [
        r.referencia,
        r.descricao.substring(0, 30),
        r.categoria,
        formatarNumero(r.valor),
        new Date(r.data).toLocaleDateString("pt-AO")
      ]);
      
      if (dadosReceitas.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [["Ref.", "Cliente", "Categoria", "Valor (Kz)", "Data"]],
          body: dadosReceitas,
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 50 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 25 }
          }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }
      
      // Tabela de Custos
      let custosFiltrados = [...todosCustos];
      if (filtroDataInicio) custosFiltrados = custosFiltrados.filter(c => new Date(c.data) >= new Date(filtroDataInicio));
      if (filtroDataFim) custosFiltrados = custosFiltrados.filter(c => new Date(c.data) <= new Date(filtroDataFim));
      if (filtroCategoriaCusto !== "todas") custosFiltrados = custosFiltrados.filter(c => c.categoria === filtroCategoriaCusto);
      if (filtroStatusCusto !== "todos") custosFiltrados = custosFiltrados.filter(c => c.status === filtroStatusCusto);
      
      const dadosCustos = custosFiltrados.slice(0, 50).map(c => [
        c.referencia,
        c.descricao.substring(0, 30),
        c.categoria,
        formatarNumero(c.valor),
        c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-AO") : "—",
        c.status
      ]);
      
      if (dadosCustos.length > 0) {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        autoTable(doc, {
          startY: yPos,
          head: [["Ref.", "Beneficiário", "Categoria", "Valor (Kz)", "Vencimento", "Status"]],
          body: dadosCustos,
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 45 },
            2: { cellWidth: 25 },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 }
          }
        });
      }
      
      doc.save(`relatorio_custos_receitas_${new Date().toISOString().split("T")[0]}.pdf`);
      mostrarMensagem("✅ PDF exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("❌ Erro ao gerar PDF", "erro");
    } finally {
      setExportando(false);
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

  // Paginação Receitas
  const receitasFiltradas = (() => {
    let items = [...todasReceitas];
    if (filtroDataInicio) items = items.filter(r => new Date(r.data) >= new Date(filtroDataInicio));
    if (filtroDataFim) items = items.filter(r => new Date(r.data) <= new Date(filtroDataFim));
    if (filtroCategoriaReceita !== "todas") items = items.filter(r => r.categoria === filtroCategoriaReceita);
    return items.sort((a, b) => new Date(b.data) - new Date(a.data));
  })();
  
  const indexInicialReceitas = (paginaReceitas - 1) * itensPorPagina;
  const itensVisiveisReceitas = receitasFiltradas.slice(indexInicialReceitas, indexInicialReceitas + itensPorPagina);
  const paginasTotalReceitas = Math.ceil(receitasFiltradas.length / itensPorPagina);
  
  // Paginação Custos
  const custosFiltrados = (() => {
    let items = [...todosCustos];
    if (filtroDataInicio) items = items.filter(c => new Date(c.data) >= new Date(filtroDataInicio));
    if (filtroDataFim) items = items.filter(c => new Date(c.data) <= new Date(filtroDataFim));
    if (filtroCategoriaCusto !== "todas") items = items.filter(c => c.categoria === filtroCategoriaCusto);
    if (filtroStatusCusto !== "todos") items = items.filter(c => c.status === filtroStatusCusto);
    return items.sort((a, b) => new Date(b.data) - new Date(a.data));
  })();
  
  const indexInicialCustos = (paginaCustos - 1) * itensPorPagina;
  const itensVisiveisCustos = custosFiltrados.slice(indexInicialCustos, indexInicialCustos + itensPorPagina);
  const paginasTotalCustos = Math.ceil(custosFiltrados.length / itensPorPagina);

  const barChartData = {
    labels: dadosMes.meses,
    datasets: [
      {
        label: 'Receitas',
        data: dadosMes.receitasPorMes,
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: 'Custos',
        data: dadosMes.custosPorMes,
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        borderRadius: 8,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top', labels: { color: '#9CA3AF' } },
      tooltip: { callbacks: { label: (ctx) => `${formatarNumero(ctx.raw)} Kz` } }
    },
    scales: {
      y: { ticks: { callback: (v) => `${formatarNumero(v)} Kz`, color: '#9CA3AF' }, grid: { color: '#374151' } },
      x: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
    }
  };

  const pieChartReceitasData = {
    labels: Object.keys(dadosCategoria.categoriasReceitas).length ? Object.keys(dadosCategoria.categoriasReceitas) : ["Sem dados"],
    datasets: [{
      data: Object.values(dadosCategoria.categoriasReceitas).length ? Object.values(dadosCategoria.categoriasReceitas) : [1],
      backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec489a', '#14b8a6', '#f97316'],
      borderColor: '#1f2937',
      borderWidth: 2,
    }]
  };
  
  const pieChartCustosData = {
    labels: Object.keys(dadosCategoria.categoriasCustos).length ? Object.keys(dadosCategoria.categoriasCustos) : ["Sem dados"],
    datasets: [{
      data: Object.values(dadosCategoria.categoriasCustos).length ? Object.values(dadosCategoria.categoriasCustos) : [1],
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#a855f7', '#ec489a', '#14b8a6', '#3b82f6'],
      borderColor: '#1f2937',
      borderWidth: 2,
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#9CA3AF' } },
      tooltip: { callbacks: { label: (ctx) => `${formatarNumero(ctx.raw)} Kz` } }
    }
  };

  if (loadingEmpresas) {
    return (
      <Layout title="Custos e Receitas" showBackButton={true} backToRoute="/menu">
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Custos e Receitas" showBackButton={true} backToRoute="/menu">
      <div className="space-y-6 p-4">
        {/* Mensagem Toast */}
        {mensagem && (
          <div className={`fixed top-20 right-4 z-50 animate-fade-in-out px-4 py-3 rounded-lg shadow-lg ${
            tipoMensagem === "sucesso" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {mensagem}
          </div>
        )}

        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => carregarDados()}
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
            {/* Mensagem para Técnico */}
            {isTecnico() && (
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <Eye size={18} />
                  <span className="text-sm">
                    Trabalhando com a empresa: <strong>{userEmpresaNome}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-between gap-2 flex-wrap">
              <button onClick={() => carregarDados()} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                <RefreshCw size={18} /> Actualizar
              </button>
              <div className="flex gap-2">
                <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
                  <Download size={18} /> Excel
                </button>
                <button onClick={exportarPDF} disabled={exportando} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50">
                  <Printer size={18} /> {exportando ? "Gerando..." : "PDF"}
                </button>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-xl p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-90">Total Receitas</p>
                    <p className="text-2xl font-bold">{formatarNumero(resumo.totalReceitas)} Kz</p>
                    <p className="text-xs opacity-75">{resumo.quantidadeReceitas} operações</p>
                  </div>
                  <TrendingUp size={28} className="opacity-80" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-red-700 to-red-600 rounded-xl p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-90">Total Custos</p>
                    <p className="text-2xl font-bold">{formatarNumero(resumo.totalCustos)} Kz</p>
                    <p className="text-xs opacity-75">{resumo.quantidadeCustos} operações</p>
                  </div>
                  <TrendingDown size={28} className="opacity-80" />
                </div>
              </div>
              <div className={`rounded-xl p-4 text-white ${resumo.resultado >= 0 ? 'bg-gradient-to-r from-blue-700 to-blue-600' : 'bg-gradient-to-r from-orange-700 to-orange-600'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-90">Resultado</p>
                    <p className="text-2xl font-bold">{formatarNumero(Math.abs(resumo.resultado))} Kz</p>
                    <p className="text-xs opacity-75">{resumo.resultado >= 0 ? 'Positivo' : 'Negativo'}</p>
                  </div>
                  <DollarSign size={28} className="opacity-80" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-xl p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm opacity-90">Margem</p>
                    <p className="text-2xl font-bold">{resumo.totalReceitas > 0 ? ((resumo.resultado / resumo.totalReceitas) * 100).toFixed(1) : '0.0'}%</p>
                    <p className="text-xs opacity-75">Lucro / Receita</p>
                  </div>
                  <PieChart size={28} className="opacity-80" />
                </div>
              </div>
            </div>

            {/* Filtros Gerais */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={18} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-300">Filtros Gerais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data Início</label>
                  <input type="date" className="w-full p-2 rounded bg-gray-700 text-white" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
                  <input type="date" className="w-full p-2 rounded bg-gray-700 text-white" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-blue-400" />
                  <h3 className="text-lg font-bold text-blue-400">Evolução Mensal</h3>
                </div>
                <div className="h-80">
                  <Bar data={barChartData} options={barOptions} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={20} className="text-green-400" />
                  <h3 className="text-lg font-bold text-green-400">Receitas por Categoria</h3>
                </div>
                <div className="h-80 flex justify-center items-center">
                  <div className="w-full max-w-xs">
                    <Pie data={pieChartReceitasData} options={pieOptions} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={20} className="text-red-400" />
                  <h3 className="text-lg font-bold text-red-400">Custos por Categoria</h3>
                </div>
                <div className="h-80 flex justify-center items-center">
                  <div className="w-full max-w-xs">
                    <Pie data={pieChartCustosData} options={pieOptions} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-yellow-400" />
                  <h3 className="text-lg font-bold text-yellow-400">Resumo de Pagamentos</h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-900/30 rounded-lg p-3 text-center border border-green-500/30">
                      <CheckCircle size={20} className="mx-auto mb-1 text-green-400" />
                      <p className="text-2xl font-bold text-green-400">{resumo.custosPagos}</p>
                      <p className="text-xs text-gray-400">Pagos</p>
                    </div>
                    <div className="bg-yellow-900/30 rounded-lg p-3 text-center border border-yellow-500/30">
                      <Clock size={20} className="mx-auto mb-1 text-yellow-400" />
                      <p className="text-2xl font-bold text-yellow-400">{resumo.custosPendentes}</p>
                      <p className="text-xs text-gray-400">Pendentes</p>
                    </div>
                    <div className="bg-red-900/30 rounded-lg p-3 text-center border border-red-500/30">
                      <AlertCircle size={20} className="mx-auto mb-1 text-red-400" />
                      <p className="text-2xl font-bold text-red-400">{resumo.custosAtrasados}</p>
                      <p className="text-xs text-gray-400">Atrasados</p>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Índice Custo/Receita</p>
                    <p className="text-xl font-bold text-blue-400">
                      {resumo.totalReceitas > 0 ? ((resumo.totalCustos / resumo.totalReceitas) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Abas para tabelas */}
            <div className="border-b border-gray-700">
              <div className="flex gap-2">
                <button onClick={() => setAbaAtiva("receitas")} className={`px-4 py-2 rounded-t-lg transition ${abaAtiva === "receitas" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  📈 Receitas ({receitasFiltradas.length})
                </button>
                <button onClick={() => setAbaAtiva("custos")} className={`px-4 py-2 rounded-t-lg transition ${abaAtiva === "custos" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  📉 Custos ({custosFiltrados.length})
                </button>
              </div>
            </div>

            {/* Tabela de Receitas */}
            {abaAtiva === "receitas" && (
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="p-4 border-b border-gray-700 bg-green-900/20">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                      <FileText size={18} /> Lista de Receitas
                    </h3>
                    <div className="flex gap-2">
                      <select className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1" value={filtroCategoriaReceita} onChange={(e) => setFiltroCategoriaReceita(e.target.value)}>
                        <option value="todas">Todas categorias</option>
                        {categoriasReceitas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr className="text-white">
                        <th className="p-3 text-left">📄 Ref.</th>
                        <th className="p-3 text-left">👤 Cliente</th>
                        <th className="p-3 text-left">🏷️ Categoria</th>
                        <th className="p-3 text-right">💰 Valor</th>
                        <th className="p-3 text-center">📅 Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensVisiveisReceitas.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                          <td className="p-3 text-white font-mono text-xs">{item.referencia}</td>
                          <td className="p-3 text-white">{item.descricao}</td>
                          <td className="p-3"><span className="bg-gray-600 px-2 py-1 rounded text-xs">{item.categoria}</span></td>
                          <td className="p-3 text-right text-green-400 font-semibold">{formatarNumero(item.valor)} Kz</td>
                          <td className="p-3 text-center text-gray-400 text-xs">{formatarData(item.data)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {paginasTotalReceitas > 1 && (
                  <div className="p-4 bg-gray-700 border-t border-gray-600 flex justify-between items-center">
                    <button onClick={() => setPaginaReceitas(p => Math.max(1, p - 1))} disabled={paginaReceitas === 1} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-white transition disabled:opacity-50 flex items-center gap-2">
                      <ChevronLeft size={18} /> Anterior
                    </button>
                    <span className="text-sm text-gray-300">Página {paginaReceitas} de {paginasTotalReceitas}</span>
                    <button onClick={() => setPaginaReceitas(p => Math.min(paginasTotalReceitas, p + 1))} disabled={paginaReceitas === paginasTotalReceitas} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-white transition disabled:opacity-50 flex items-center gap-2">
                      Próxima <ChevronRight size={18} />
                    </button>
                  </div>
                )}
                {itensVisiveisReceitas.length === 0 && <div className="p-8 text-center text-gray-400">Nenhuma receita encontrada</div>}
              </div>
            )}

            {/* Tabela de Custos */}
            {abaAtiva === "custos" && (
              <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <div className="p-4 border-b border-gray-700 bg-red-900/20">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                      <FileText size={18} /> Lista de Custos
                    </h3>
                    <div className="flex gap-2">
                      <select className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1" value={filtroCategoriaCusto} onChange={(e) => setFiltroCategoriaCusto(e.target.value)}>
                        <option value="todas">Todas categorias</option>
                        {categoriasCustos.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <select className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1" value={filtroStatusCusto} onChange={(e) => setFiltroStatusCusto(e.target.value)}>
                        {statusCustos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr className="text-white">
                        <th className="p-3 text-left">📄 Ref.</th>
                        <th className="p-3 text-left">🏢 Beneficiário</th>
                        <th className="p-3 text-left">🏷️ Categoria</th>
                        <th className="p-3 text-right">💰 Valor</th>
                        <th className="p-3 text-center">📅 Vencimento</th>
                        <th className="p-3 text-left">📊 Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensVisiveisCustos.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                          <td className="p-3 text-white font-mono text-xs">{item.referencia}</td>
                          <td className="p-3 text-white">{item.descricao}</td>
                          <td className="p-3"><span className="bg-gray-600 px-2 py-1 rounded text-xs">{item.categoria}</span></td>
                          <td className="p-3 text-right text-red-400 font-semibold">{formatarNumero(item.valor)} Kz</td>
                          <td className="p-3 text-center text-gray-400 text-xs">{formatarData(item.vencimento)}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusCss(item.status)}`}>
                              {item.statusIcon} {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {paginasTotalCustos > 1 && (
                  <div className="p-4 bg-gray-700 border-t border-gray-600 flex justify-between items-center">
                    <button onClick={() => setPaginaCustos(p => Math.max(1, p - 1))} disabled={paginaCustos === 1} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-white transition disabled:opacity-50 flex items-center gap-2">
                      <ChevronLeft size={18} /> Anterior
                    </button>
                    <span className="text-sm text-gray-300">Página {paginaCustos} de {paginasTotalCustos}</span>
                    <button onClick={() => setPaginaCustos(p => Math.min(paginasTotalCustos, p + 1))} disabled={paginaCustos === paginasTotalCustos} className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-white transition disabled:opacity-50 flex items-center gap-2">
                      Próxima <ChevronRight size={18} />
                    </button>
                  </div>
                )}
                {itensVisiveisCustos.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum custo encontrado</div>}
              </div>
            )}
          </>
        )}
      </div>

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
};

export default CustosReceitas;