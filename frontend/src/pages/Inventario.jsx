// src/pages/Inventario.jsx - VERSÃO COMPLETA CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  Plus, Edit, Trash2, Search, Package, Box, TrendingUp, AlertCircle,
  CheckCircle, AlertCircle as AlertCircleIcon, Loader2, X,
  ChevronLeft, ChevronRight, Building2, Download, FileText,
  DollarSign, MapPin, Calendar, User, Tag, Archive, RefreshCw,
  Upload, Car, Truck, Filter, ChevronDown, ChevronUp
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Inventario = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [itens, setItens] = useState([]);
  const [itensAgrupados, setItensAgrupados] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [classesPGCA, setClassesPGCA] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImportacao, setModalImportacao] = useState(false);
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [classeFiltro, setClasseFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [tipoAtivoFiltro, setTipoAtivoFiltro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(15);
  const [recarregar, setRecarregar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dashboard, setDashboard] = useState({
    totalItens: 0,
    totalAtivos: 0,
    valorTotal: 0,
    baixoEstoque: 0
  });
  const [importResult, setImportResult] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const [formData, setFormData] = useState({
    nome: "", categoria: "", quantidade: 0, valorUnitario: 0, 
    localizacao: "", fornecedor: "", dataAquisicao: "", 
    estado: "Ativo", observacoes: "", tipoAtivo: "Mercadoria"
  });

  const estados = ["Ativo", "Em manutenção", "Depreciado", "Baixado", "Reserva"];
  const tiposAtivo = ["Mercadoria", "Imobilizado", "Intangivel", "Financeiro", "Outros"];

  // Funções auxiliares de formatação
  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "0 Kz";
    return valor.toLocaleString() + " Kz";
  };

  const formatarMoedaInput = (valor) => {
    if (!valor && valor !== 0) return "";
    const numeros = valor.toString().replace(/\D/g, "");
    if (!numeros) return "";
    return new Intl.NumberFormat('pt-AO').format(parseInt(numeros));
  };

  const converterParaNumero = (valorFormatado) => {
    if (!valorFormatado) return 0;
    return parseInt(valorFormatado.replace(/\D/g, "")) || 0;
  };

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarInventario();
      carregarDashboard();
      carregarCategorias();
      carregarClassesPGCA();
    } else {
      setItens([]);
      setItensAgrupados({});
      setCategorias([]);
      setClassesPGCA([]);
      setDashboard({ totalItens: 0, totalAtivos: 0, valorTotal: 0, baixoEstoque: 0 });
    }
  }, [empresaSelecionada, recarregar, paginaAtual, categoriaFiltro, classeFiltro, estadoFiltro, tipoAtivoFiltro, busca]);

  // Agrupar itens por categoria
  useEffect(() => {
    const agrupado = {};
    itens.forEach(item => {
      const categoria = item.categoria || "Sem categoria";
      if (!agrupado[categoria]) {
        agrupado[categoria] = [];
      }
      agrupado[categoria].push(item);
    });
    setItensAgrupados(agrupado);
  }, [itens]);

  const toggleCategoria = (categoria) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setEmpresas([]);
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      const empresaPadrao = empresasList[0]?._id || user?.empresaId;
      if (empresaPadrao && !empresaSelecionada) {
        setEmpresaSelecionada(empresaPadrao);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarInventario = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `http://localhost:5000/api/inventario?empresaId=${empresaSelecionada}&page=${paginaAtual}&limit=${itensPorPagina}`;
      if (categoriaFiltro) url += `&categoria=${categoriaFiltro}`;
      if (classeFiltro) url += `&classe=${classeFiltro}`;
      if (estadoFiltro) url += `&estado=${estadoFiltro}`;
      if (tipoAtivoFiltro) url += `&tipoAtivo=${tipoAtivoFiltro}`;
      if (busca) url += `&busca=${busca}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setItens([]);
        return;
      }
      
      const data = await response.json();
      setItens(data.dados || []);
    } catch (error) {
      console.error("Erro:", error);
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarDashboard = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/inventario/dashboard?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboard({
          totalItens: data.dados?.totalItens || 0,
          totalAtivos: data.dados?.totalAtivos || 0,
          valorTotal: data.dados?.valorTotal || 0,
          baixoEstoque: itens.filter(i => i.quantidade < 5).length
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    }
  };

  const carregarCategorias = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/inventario/categorias?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const carregarClassesPGCA = async () => {
    if (!empresaSelecionada) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/inventario/stats/classe?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.sucesso && data.dados) {
        setClassesPGCA(data.dados);
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const importarDoStock = async () => {
    setImportando(true);
    setImportResult(null);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/inventario/importar/stock?empresaId=${empresaSelecionada}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.sucesso) {
        setImportResult({
          tipo: "stock",
          mensagem: result.mensagem,
          detalhes: result.detalhes
        });
        mostrarMensagem(result.mensagem, "sucesso");
        setRedirecting(true);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao importar do stock", "erro");
        setImportando(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setImportando(false);
    }
  };

  const importarDeViaturas = async () => {
    setImportando(true);
    setImportResult(null);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/inventario/importar/viaturas?empresaId=${empresaSelecionada}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.sucesso) {
        setImportResult({
          tipo: "viaturas",
          mensagem: result.mensagem,
          detalhes: result.detalhes
        });
        mostrarMensagem(result.mensagem, "sucesso");
        setRedirecting(true);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao importar viaturas", "erro");
        setImportando(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setImportando(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.categoria || !formData.valorUnitario) {
      mostrarMensagem("Nome, categoria e valor unitário são obrigatórios", "erro");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = editando ? `http://localhost:5000/api/inventario/${editando}` : "http://localhost:5000/api/inventario";
      const method = editando ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, empresaId: empresaSelecionada })
      });

      const result = await response.json();

      if (response.ok) {
        mostrarMensagem(editando ? "✅ Item atualizado!" : "✅ Item adicionado!", "sucesso");
        setRedirecting(true);
        setModalOpen(false);
        setEditando(null);
        resetForm();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao salvar", "erro");
        setLoading(false);
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  const excluirItem = async (id) => {
    if (!window.confirm("⚠️ Tem certeza que deseja dar baixa neste item?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/inventario/${id}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ empresaId: empresaSelecionada, motivo: "Baixa manual" })
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Item dado como baixa!", "sucesso");
        setRecarregar(prev => !prev);
      } else {
        const result = await response.json();
        mostrarMensagem(result.mensagem || "Erro ao dar baixa", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const editarItem = (item) => {
    setEditando(item._id);
    setFormData({
      nome: item.nome || "",
      categoria: item.categoria || "",
      quantidade: item.quantidade || 0,
      valorUnitario: item.valorUnitario || 0,
      localizacao: item.localizacaoFisica || "",
      fornecedor: item.fornecedor || "",
      dataAquisicao: item.dataAquisicao ? new Date(item.dataAquisicao).toISOString().split('T')[0] : "",
      estado: item.estado || "Ativo",
      observacoes: item.observacoes || "",
      tipoAtivo: item.tipoAtivo || "Mercadoria"
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: "", categoria: "", quantidade: 0, valorUnitario: 0, 
      localizacao: "", fornecedor: "", dataAquisicao: "", 
      estado: "Ativo", observacoes: "", tipoAtivo: "Mercadoria"
    });
  };

  const handleValorChange = (e) => {
    const valorFormatado = formatarMoedaInput(e.target.value);
    const valorNumerico = converterParaNumero(valorFormatado);
    setFormData({...formData, valorUnitario: valorNumerico});
  };

  const limparFiltros = () => {
    setBusca("");
    setCategoriaFiltro("");
    setClasseFiltro("");
    setEstadoFiltro("");
    setTipoAtivoFiltro("");
    setPaginaAtual(1);
  };

  const exportarPDF = async () => {
  if (itens.length === 0) {
    mostrarMensagem("Nenhum item para exportar", "erro");
    return;
  }

  setExportando(true);
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dataAtual = new Date();
    
    // Função para limpar texto para PDF
    const limparTexto = (texto) => {
      if (!texto) return "-";
      let result = texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[Øø]/g, 'O')
        .replace(/[Üü]/g, 'U')
        .replace(/[ÁáÀàÃãÂâÄä]/g, 'A')
        .replace(/[ÉéÈèÊêËë]/g, 'E')
        .replace(/[ÍíÌìÎîÏï]/g, 'I')
        .replace(/[ÓóÒòÕõÔôÖö]/g, 'O')
        .replace(/[ÚúÙùÛûÜü]/g, 'U')
        .replace(/[Çç]/g, 'C')
        .replace(/[Ññ]/g, 'N')
        .replace(/[&]/g, 'e')
        .replace(/[<>]/g, '')
        .replace(/["']/g, '')
        .replace(/[“”]/g, '')
        .replace(/[‘’]/g, '');
      return result;
    };
    
    const empresaAtual = isTecnico() 
      ? { nome: limparTexto(userEmpresaNome), nif: user?.nif || "---" }
      : { nome: limparTexto(empresas.find(e => e._id === empresaSelecionada)?.nome || "Empresa"), 
          nif: empresas.find(e => e._id === empresaSelecionada)?.nif || "---" };
    
    // Cabeçalho - sem acentos
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("INVENTARIO GERAL", 148.5, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(empresaAtual.nome, 148.5, 30, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${dataAtual.toLocaleDateString("pt-AO")}`, 148.5, 38, { align: "center" });
    
    doc.setDrawColor(37, 99, 235);
    doc.line(15, 44, 282, 44);
    
    // Estatísticas
    let y = 52;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de Itens: ${dashboard.totalItens}`, 20, y);
    doc.text(`Itens Ativos: ${dashboard.totalAtivos}`, 120, y);
    doc.text(`Valor Total: ${formatarMoeda(dashboard.valorTotal)}`, 200, y);
    
    y += 10;
    
    // Tabela de itens por categoria (agrupada)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("LISTA DE ITENS POR CATEGORIA", 20, y);
    
    let startY = y + 5;
    
    for (const [categoria, itensDaCategoria] of Object.entries(itensAgrupados)) {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text(`Categoria: ${limparTexto(categoria)} (${itensDaCategoria.length} itens)`, 20, startY);
      startY += 5;
      
      const tabelaDados = itensDaCategoria.map(i => [
        limparTexto(i.codigo || "-"),
        limparTexto(i.nome || "-"),
        (i.quantidade || 0).toString(),
        formatarMoeda(i.valorUnitario),
        formatarMoeda(i.quantidade * i.valorUnitario),
        limparTexto(i.localizacaoFisica || "-"),
        limparTexto(i.estado || "-")
      ]);
      
      autoTable(doc, {
        startY: startY,
        head: [["Codigo PGCA", "Item", "Qtd", "Valor Unit.", "Valor Total", "Localizacao", "Estado"]],
        body: tabelaDados,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0] },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 250, 255] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 45 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 30 },
          6: { cellWidth: 22 }
        },
        margin: { left: 20, right: 20 }
      });
      
      startY = doc.lastAutoTable.finalY + 10;
    }
    
    // Rodapé - sem acentos
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(`Gerado por: ${limparTexto(user?.nome || "Sistema")}`, 148.5, 195, { align: "center" });
      doc.text(`© ${new Date().getFullYear()} AnDioGest - Gestao Corporativa`, 148.5, 200, { align: "center" });
    }
    
    doc.save(`inventario_${limparTexto(empresaAtual.nome)}_${dataAtual.toISOString().split('T')[0]}.pdf`);
    mostrarMensagem("PDF exportado com sucesso!", "sucesso");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    mostrarMensagem("Erro ao gerar PDF", "erro");
  } finally {
    setExportando(false);
  }
};

  const getEstadoColor = (estado) => {
    const cores = {
      "Ativo": "bg-green-900 text-green-300",
      "Em manutenção": "bg-yellow-900 text-yellow-300",
      "Depreciado": "bg-orange-900 text-orange-300",
      "Baixado": "bg-red-900 text-red-300",
      "Reserva": "bg-blue-900 text-blue-300"
    };
    return cores[estado] || "bg-gray-600 text-gray-300";
  };

  const totalPaginas = Math.ceil(itens.length / itensPorPagina);

  if (redirecting) {
    return (
      <Layout title="Inventário" showBackButton={true} backToRoute="/menu">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">{editando ? "Item atualizado." : "Item adicionado/importado."}</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingEmpresas) {
    return (
      <Layout title="Inventário" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Inventário" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircleIcon className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { setRecarregar(prev => !prev); }}
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
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 text-center border border-blue-500/30">
                <Package className="mx-auto mb-2 text-blue-400" size={28} />
                <p className="text-2xl font-bold text-white">{dashboard.totalItens}</p>
                <p className="text-xs text-gray-400">Total de Itens</p>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 text-center border border-green-500/30">
                <TrendingUp className="mx-auto mb-2 text-green-400" size={28} />
                <p className="text-2xl font-bold text-green-400">{formatarMoeda(dashboard.valorTotal)}</p>
                <p className="text-xs text-gray-400">Valor Total</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 text-center border border-yellow-500/30">
                <AlertCircle className="mx-auto mb-2 text-yellow-400" size={28} />
                <p className="text-2xl font-bold text-yellow-400">{dashboard.baixoEstoque}</p>
                <p className="text-xs text-gray-400">Baixo Estoque</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 text-center border border-purple-500/30">
                <Archive className="mx-auto mb-2 text-purple-400" size={28} />
                <p className="text-2xl font-bold text-purple-400">{dashboard.totalAtivos}</p>
                <p className="text-xs text-gray-400">Itens Ativos</p>
              </div>
            </div>

            {/* Barra de pesquisa e botões */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por código PGCA, nome, categoria..."
                  className="w-full pl-10 p-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:border-blue-500 transition"
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFiltros(!showFiltros)}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl transition flex items-center gap-2"
                >
                  <Filter size={18} /> Filtros
                </button>
                <button
                  onClick={() => setModalImportacao(true)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg"
                >
                  <Upload size={18} /> Importar
                </button>
                <button
                  onClick={exportarPDF}
                  disabled={exportando || itens.length === 0}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {exportando ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                  {exportando ? "Exportando..." : "Exportar PDF"}
                </button>
                <button
                  onClick={() => { resetForm(); setEditando(null); setModalOpen(true); }}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg"
                >
                  <Plus size={18} /> Novo Item
                </button>
              </div>
            </div>

            {/* Painel de Filtros Avançados */}
            {showFiltros && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Categoria</label>
                    <select 
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                      value={categoriaFiltro}
                      onChange={(e) => { setCategoriaFiltro(e.target.value); setPaginaAtual(1); }}
                    >
                      <option value="">Todas</option>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Classe PGCA</label>
                    <select 
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                      value={classeFiltro}
                      onChange={(e) => { setClasseFiltro(e.target.value); setPaginaAtual(1); }}
                    >
                      <option value="">Todas</option>
                      {classesPGCA.map(c => (
                        <option key={c._id} value={c._id}>Classe {c._id} - {c.totalItens} itens</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Ativo</label>
                    <select 
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                      value={tipoAtivoFiltro}
                      onChange={(e) => { setTipoAtivoFiltro(e.target.value); setPaginaAtual(1); }}
                    >
                      <option value="">Todos</option>
                      {tiposAtivo.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                    <select 
                      className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                      value={estadoFiltro}
                      onChange={(e) => { setEstadoFiltro(e.target.value); setPaginaAtual(1); }}
                    >
                      <option value="">Todos</option>
                      {estados.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={limparFiltros}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition text-sm"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            )}

            {/* Tabela de Itens Agrupada por Categoria */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
                <p className="text-gray-400 mt-2">Carregando inventário...</p>
              </div>
            ) : Object.keys(itensAgrupados).length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center border border-gray-700">
                <Box className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">Nenhum item encontrado no inventário</p>
                <div className="flex gap-4 justify-center mt-4">
                  <button
                    onClick={() => setModalImportacao(true)}
                    className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition flex items-center gap-2"
                  >
                    <Upload size={16} /> Importar de Stock/Viaturas
                  </button>
                  <button
                    onClick={() => { resetForm(); setEditando(null); setModalOpen(true); }}
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
                  >
                    <Plus size={16} className="inline mr-2" /> Adicionar Manualmente
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  {Object.entries(itensAgrupados).map(([categoria, itensDaCategoria]) => (
                    <div key={categoria} className="mb-4 border-b border-gray-700 last:border-b-0">
                      <button
                        onClick={() => toggleCategoria(categoria)}
                        className="w-full flex justify-between items-center p-4 bg-gray-750 hover:bg-gray-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Package size={18} className="text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">{categoria}</h3>
                          <span className="text-sm text-gray-400">({itensDaCategoria.length} itens)</span>
                        </div>
                        {categoriasExpandidas[categoria] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      
                      {categoriasExpandidas[categoria] && (
                        <table className="w-full">
                          <thead className="bg-gray-700">
                            <tr className="text-white text-xs">
                              <th className="p-3 text-left">Código PGCA</th>
                              <th className="p-3 text-left">Item</th>
                              <th className="p-3 text-center">Qtd</th>
                              <th className="p-3 text-right">Valor Unit.</th>
                              <th className="p-3 text-right">Valor Total</th>
                              <th className="p-3 text-left">Localização</th>
                              <th className="p-3 text-center">Estado</th>
                              <th className="p-3 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensDaCategoria.map(i => (
                              <tr key={i._id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                                <td className="p-3">
                                  <span className="font-mono text-xs text-blue-400">{i.codigo}</span>
                                </td>
                                <td className="p-3">
                                  <div className="font-medium text-white">{i.nome}</div>
                                  <div className="text-xs text-gray-400">{i.tipoAtivo}</div>
                                </td>
                                <td className={`p-3 text-center ${i.quantidade < 5 ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                                  {i.quantidade}
                                </td>
                                <td className="p-3 text-right text-gray-300">{formatarMoeda(i.valorUnitario)}</td>
                                <td className="p-3 text-right text-green-400 font-medium">{formatarMoeda(i.quantidade * i.valorUnitario)}</td>
                                <td className="p-3 text-gray-300">{i.localizacaoFisica || "—"}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(i.estado)}`}>
                                    {i.estado}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => editarItem(i)}
                                      className="p-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-lg transition"
                                      title="Editar"
                                    >
                                      <Edit size={16} className="text-yellow-400" />
                                    </button>
                                    <button
                                      onClick={() => excluirItem(i._id)}
                                      className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition"
                                      title="Dar Baixa"
                                    >
                                      <Trash2 size={16} className="text-red-400" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalOpen && !redirecting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg"><Package className="text-white" size={20} /></div>
                  <h2 className="text-xl font-bold text-white">{editando ? "Editar Item" : "Adicionar Item"}</h2>
                </div>
                <button onClick={() => { setModalOpen(false); setEditando(null); }} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Item *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Computador Dell" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Categoria *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} placeholder="Ex: Eletrônicos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Ativo</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.tipoAtivo} onChange={(e) => setFormData({...formData, tipoAtivo: e.target.value})}>
                    {tiposAtivo.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Quantidade</label>
                  <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Valor Unitário (Kz) *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white text-right" 
                    value={formData.valorUnitario ? formatarMoedaInput(formData.valorUnitario) : ""} 
                    onChange={handleValorChange} 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Localização</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.localizacao} onChange={(e) => setFormData({...formData, localizacao: e.target.value})} placeholder="Ex: Armazém A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fornecedor</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Data de Aquisição</label>
                  <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.dataAquisicao} onChange={(e) => setFormData({...formData, dataAquisicao: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
                    {estados.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Observações</label>
                  <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                  {loading ? "Processando..." : (editando ? "Atualizar" : "Adicionar")}
                </button>
                <button onClick={() => { setModalOpen(false); setEditando(null); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {modalImportacao && !redirecting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 p-2 rounded-lg"><Upload className="text-white" size={20} /></div>
                <h2 className="text-xl font-bold text-white">Importar para Inventário</h2>
              </div>
              <button onClick={() => { setModalImportacao(false); setImportResult(null); }} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-400 text-sm">
                Selecione a origem dos dados para importar para o inventário. 
                Os itens serão automaticamente classificados com código PGCA.
              </p>
              
              {importResult && (
                <div className="p-3 rounded-lg bg-green-600/20 border border-green-500">
                  <p className="text-sm font-medium text-white">{importResult.mensagem}</p>
                  {importResult.detalhes && importResult.detalhes.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer">Ver detalhes ({importResult.detalhes.length} itens)</summary>
                      <div className="mt-2 max-h-40 overflow-y-auto">
                        {importResult.detalhes.map((d, idx) => (
                          <div key={idx} className="text-xs text-gray-300 py-1 border-t border-gray-600">
                            {d.produto || d.viatura}: {d.status} {d.codigo && `- Código: ${d.codigo}`}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
              
              <button
                onClick={importarDoStock}
                disabled={importando}
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importando ? <Loader2 className="animate-spin" size={18} /> : <Package size={18} />}
                {importando ? "Importando..." : "Importar do Stock"}
              </button>
              
              <button
                onClick={importarDeViaturas}
                disabled={importando}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importando ? <Loader2 className="animate-spin" size={18} /> : <Car size={18} />}
                {importando ? "Importando..." : "Importar de Viaturas"}
              </button>
              
              <button
                onClick={() => { setModalImportacao(false); setImportResult(null); }}
                className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
        .bg-gray-750 { background-color: #2a2a3a; }
      `}</style>
    </Layout>
  );
};

export default Inventario;