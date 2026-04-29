// src/pages/Funcionarios/ListaFuncionarios.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import EmpresaSelector from "../../components/EmpresaSelector";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Edit, Trash2, Eye, Users, Search, RefreshCw, 
  UserCheck, UserPlus, Shield, CheckCircle, XCircle,
  Mail, Phone, Briefcase, Calendar, DollarSign,
  Filter, Loader2, AlertTriangle, ArrowLeft, X,
  Download, FileText, Printer, Building2,
  TrendingUp, ShoppingCart, Package, Receipt, UsersIcon,
  Wallet, ClipboardList, Gift, BarChart3, Car, Fuel,
  Wrench, Boxes, Truck, PieChart, ArrowRightLeft,Upload
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ListaFuncionarios = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [funcionarios, setFuncionarios] = useState([]);
  const [filteredFuncionarios, setFilteredFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [promovendo, setPromovendo] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  
  const [expandedSections, setExpandedSections] = useState({
    operacional: true,
    recursosHumanos: false,
    gestaoPatrimonial: false,
    financeiro: false,
    relatorios: false
  });
  
  const [promoteData, setPromoteData] = useState({
    senha: "",
    confirmarSenha: "",
    modulos: {
      vendas: false, stock: false, facturacao: false,
      funcionarios: false, folhaSalarial: false, gestaoFaltas: false,
      gestaoAbonos: false, avaliacao: false,
      viaturas: false, abastecimentos: false, manutencoes: false, inventario: false,
      fornecedores: false, fluxoCaixa: false, contaCorrente: false,
      controloPagamento: false, custosReceitas: false, orcamentos: false,
      dre: false, indicadores: false, transferencias: false, reconciliacao: false,
      relatorios: false, graficos: false, analise: false
    }
  });
  
  const { user, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const navigate = useNavigate();

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectAll = (category, modules) => {
    const allSelected = modules.every(m => promoteData.modulos[m]);
    const newModulos = { ...promoteData.modulos };
    modules.forEach(m => { newModulos[m] = !allSelected; });
    setPromoteData({ ...promoteData, modulos: newModulos });
  };

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
      carregarFuncionarios();
    } else {
      setFuncionarios([]);
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    filtrarFuncionarios();
  }, [busca, statusFilter, funcionarios]);

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

  const carregarFuncionarios = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = "http://localhost:5000/api/funcionarios";
      if (empresaSelecionada) {
        url += `?empresaId=${empresaSelecionada}`;
      }
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setFuncionarios([]);
        mostrarMensagem("Acesso negado a esta empresa", "erro");
        return;
      }
      
      const data = await response.json();
      const funcionariosList = Array.isArray(data) ? data : (data.dados || []);
      setFuncionarios(funcionariosList);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar funcionários", "erro");
    } finally {
      setLoading(false);
    }
  };

  const filtrarFuncionarios = () => {
    let filtrados = [...funcionarios];
    
    if (busca) {
      filtrados = filtrados.filter(f =>
        f.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        f.email?.toLowerCase().includes(busca.toLowerCase()) ||
        f.cargo?.toLowerCase().includes(busca.toLowerCase()) ||
        f.nif?.toLowerCase().includes(busca.toLowerCase())
      );
    }
    
    if (statusFilter !== "todos") {
      filtrados = filtrados.filter(f => 
        statusFilter === "ativo" ? f.status === "Ativo" : f.status !== "Ativo"
      );
    }
    
    setFilteredFuncionarios(filtrados);
  };

  const excluirFuncionario = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este funcionário?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/funcionarios/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Funcionário excluído com sucesso!", "sucesso");
        carregarFuncionarios();
      } else {
        mostrarMensagem("Erro ao excluir funcionário", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    }
  };

  const abrirModalPromover = (funcionario) => {
    setSelectedFuncionario(funcionario);
    setPromoteData({
      senha: "",
      confirmarSenha: "",
      modulos: {
        vendas: false, stock: false, facturacao: false,
        funcionarios: false, folhaSalarial: false, gestaoFaltas: false,
        gestaoAbonos: false, avaliacao: false,
        viaturas: false, abastecimentos: false, manutencoes: false, inventario: false,
        fornecedores: false, fluxoCaixa: false, contaCorrente: false,
        controloPagamento: false, custosReceitas: false, orcamentos: false,
        dre: false, indicadores: false, transferencias: false, reconciliacao: false,
        relatorios: false, graficos: false, analise: false
      }
    });
    setExpandedSections({
      operacional: true,
      recursosHumanos: false,
      gestaoPatrimonial: false,
      financeiro: false,
      relatorios: false
    });
    setShowPromoteModal(true);
  };

  const promoverTecnico = async () => {
    if (!promoteData.senha) {
      mostrarMensagem("A senha é obrigatória", "erro");
      return;
    }
    
    if (promoteData.senha !== promoteData.confirmarSenha) {
      mostrarMensagem("As senhas não coincidem", "erro");
      return;
    }
    
    setPromovendo(selectedFuncionario._id);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/tecnico/promover/${selectedFuncionario._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          senha: promoteData.senha,
          modulos: promoteData.modulos,
          empresaId: user?.empresaId || empresaSelecionada
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        mostrarMensagem("✅ Funcionário promovido a técnico com sucesso!", "sucesso");
        setShowPromoteModal(false);
        setRedirecting(true);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao promover", "erro");
        setPromovendo(null);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setPromovendo(null);
    }
  };

  // Funções de exportação PDF (mantidas iguais)
  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "—";
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarDataHora = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmpresaAtual = () => {
    if (isTecnico() && userEmpresaNome) {
      return { nome: userEmpresaNome, _id: userEmpresaId };
    }
    return empresas.find(e => e._id === empresaSelecionada);
  };

  const exportarPDFListaFuncionarios = async () => {
    if (filteredFuncionarios.length === 0) {
      mostrarMensagem("Não há funcionários para exportar", "erro");
      return;
    }
    
    setExportando(true);
    try {
      const doc = new jsPDF();
      const dataAtual = new Date();
      const numeroRelatorio = `${dataAtual.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
      const empresaAtual = getEmpresaAtual();
      
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RELATÓRIO DE FUNCIONÁRIOS", 14, 20);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(empresaAtual?.nome || "Empresa", 14, 32);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Nº Relatório: ${numeroRelatorio}`, 14, 42);
      doc.text(`Gerado em: ${dataAtual.toLocaleString("pt-AO")}`, 14, 50);
      doc.text(`Total de Funcionários: ${filteredFuncionarios.length}`, 14, 58);
      
      const tabelaDados = filteredFuncionarios.map(func => [
        func.nome || "—", func.nif || "—", func.cargo || "—",
        func.departamento || "—", func.status || "—",
        formatarMoeda(func.salarioBase), func.isTecnico ? "Sim" : "Não"
      ]);
      
      autoTable(doc, {
        startY: 70,
        head: [["Nome", "NIF", "Cargo", "Departamento", "Status", "Salário Base", "Técnico"]],
        body: tabelaDados,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 248, 255] },
      });
      
      const paginaAltura = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(`Sistema AnDioGest - Relatório gerado eletronicamente.`, 14, paginaAltura - 10);
      doc.text(`© ${new Date().getFullYear()} AnDioGest - Gestão Corporativa.`, 14, paginaAltura - 5);

      doc.save(`lista_funcionarios_${empresaAtual?.nome?.replace(/\s/g, '_') || 'empresa'}_${numeroRelatorio}.pdf`);
      mostrarMensagem("✅ PDF da lista gerado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("Erro ao gerar PDF. Tente novamente.", "erro");
    } finally {
      setExportando(false);
    }
  };

  const exportarPDFFuncionarioIndividual = async (funcionario) => {
    setExportando(true);
    try {
      const doc = new jsPDF();
      const dataAtual = new Date();
      const numeroRelatorio = `${dataAtual.toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
      const empresaAtual = getEmpresaAtual();
      
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("FICHA DE FUNCIONÁRIO", 14, 20);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(funcionario.nome || "—", 14, 32);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Nº Relatório: ${numeroRelatorio}`, 14, 42);
      doc.text(`Gerado em: ${dataAtual.toLocaleString("pt-AO")}`, 14, 50);
      doc.text(`Empresa: ${empresaAtual?.nome || "—"}`, 14, 58);

      autoTable(doc, {
        startY: 70,
        body: [
          ["Nome Completo", funcionario.nome || "—"],
          ["NIF", funcionario.nif || "—"],
          ["Data de Nascimento", formatarData(funcionario.dataNascimento)],
          ["Género", funcionario.genero || "—"],
          ["Estado Civil", funcionario.estadoCivil || "—"],
          ["Nacionalidade", funcionario.nacionalidade || "Angolana"],
          ["Função/Cargo", funcionario.funcao || funcionario.cargo || "—"],
          ["Departamento", funcionario.departamento || "—"],
          ["Data de Admissão", formatarData(funcionario.dataAdmissao)],
          ["Tipo de Contrato", funcionario.tipoContrato || "—"],
          ["Status", funcionario.status || "Ativo"],
          ["Salário Base", formatarMoeda(funcionario.salarioBase)],
          ["Horas Semanais", funcionario.horasSemanais ? `${funcionario.horasSemanais}h` : "—"],
          ["Horas Diárias", funcionario.horasDiarias ? `${funcionario.horasDiarias}h` : "—"],
        ],
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 }, 1: { cellWidth: "auto" } },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 248, 255] }
      });
      
      const paginaAltura = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(`Sistema AnDioGest - Documento gerado eletronicamente.`, 14, paginaAltura - 10);
      doc.text(`© ${new Date().getFullYear()} AnDioGest - Gestão Corporativa.`, 14, paginaAltura - 5);

      doc.save(`funcionario_${funcionario.nome?.replace(/\s/g, '_')}_${numeroRelatorio}.pdf`);
      mostrarMensagem("✅ PDF do funcionário gerado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("Erro ao gerar PDF. Tente novamente.", "erro");
    } finally {
      setExportando(false);
    }
  };

  const estatisticas = {
    total: funcionarios.length,
    ativos: funcionarios.filter(f => f.status === "Ativo").length,
    tecnicos: funcionarios.filter(f => f.isTecnico).length
  };

  if (loadingEmpresas) {
    return (
      <Layout title="Funcionários" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Funcionários" showBackButton={true} backToRoute="/menu">
      {redirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Funcionário promovido a técnico.</p>
            <p className="text-green-400 text-xs mt-2">Recarregando página...</p>
          </div>
        </div>
      )}

      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : 
            mensagem.tipo === "info" ? "bg-blue-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : 
             mensagem.tipo === "info" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             <AlertTriangle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      {/* Modal de Promoção a Técnico */}
      {showPromoteModal && selectedFuncionario && !redirecting && !isTecnico() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-700 animate-scale-in my-8">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg"><Shield className="w-5 h-5 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Promover a Técnico</h3><p className="text-sm text-gray-400">{selectedFuncionario.nome}</p></div>
                </div>
                <button onClick={() => setShowPromoteModal(false)} className="p-1 rounded-lg hover:bg-gray-700"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-gray-700/50 rounded-xl p-4">
                <p className="text-sm text-gray-400">Funcionário</p>
                <p className="text-white font-medium">{selectedFuncionario.nome}</p>
                <p className="text-sm text-gray-400">{selectedFuncionario.cargo || selectedFuncionario.funcao || "Sem cargo"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Senha de Acesso *</label><input type="password" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="Digite a senha" value={promoteData.senha} onChange={(e) => setPromoteData({...promoteData, senha: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha *</label><input type="password" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" placeholder="Confirme a senha" value={promoteData.confirmarSenha} onChange={(e) => setPromoteData({...promoteData, confirmarSenha: e.target.value})} /></div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Módulos de Acesso</label>
                
                {/* Operacional */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                  <button type="button" onClick={() => toggleSection('operacional')} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:bg-green-600/30 transition">
                    <div className="flex items-center gap-2"><TrendingUp className="text-green-400" size={16} /><span className="font-semibold text-white text-sm">Módulo Operacional</span></div>
                    <span className="text-gray-400 text-sm">{expandedSections.operacional ? '▼' : '▶'}</span>
                  </button>
                  {expandedSections.operacional && (
                    <div className="p-3 space-y-2 border-t border-gray-600">
                      <div className="flex justify-end mb-2"><button type="button" onClick={() => handleSelectAll('operacional', ['vendas', 'stock', 'facturacao'])} className="text-xs text-blue-400 hover:text-blue-300">{promoteData.modulos.vendas && promoteData.modulos.stock && promoteData.modulos.facturacao ? 'Desmarcar Todos' : 'Marcar Todos'}</button></div>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><ShoppingCart size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Vendas</span></div><input type="checkbox" checked={promoteData.modulos.vendas} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, vendas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Package size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Stock</span></div><input type="checkbox" checked={promoteData.modulos.stock} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, stock: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Receipt size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Facturação</span></div><input type="checkbox" checked={promoteData.modulos.facturacao} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, facturacao: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                    </div>
                  )}
                </div>

                {/* RH */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                  <button type="button" onClick={() => toggleSection('recursosHumanos')} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:bg-purple-600/30 transition">
                    <div className="flex items-center gap-2"><UsersIcon className="text-purple-400" size={16} /><span className="font-semibold text-white text-sm">Recursos Humanos</span></div>
                    <span className="text-gray-400 text-sm">{expandedSections.recursosHumanos ? '▼' : '▶'}</span>
                  </button>
                  {expandedSections.recursosHumanos && (
                    <div className="p-3 space-y-2 border-t border-gray-600">
                      <div className="flex justify-end mb-2"><button type="button" onClick={() => handleSelectAll('recursosHumanos', ['funcionarios', 'folhaSalarial', 'gestaoFaltas', 'gestaoAbonos', 'avaliacao'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button></div>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><ClipboardList size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Funcionários</span></div><input type="checkbox" checked={promoteData.modulos.funcionarios} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, funcionarios: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Wallet size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Folha Salarial</span></div><input type="checkbox" checked={promoteData.modulos.folhaSalarial} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, folhaSalarial: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Calendar size={14} className="text-red-400" /><span className="text-gray-300 text-sm">Gestão de Faltas</span></div><input type="checkbox" checked={promoteData.modulos.gestaoFaltas} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, gestaoFaltas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Gift size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Gestão de Abonos</span></div><input type="checkbox" checked={promoteData.modulos.gestaoAbonos} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, gestaoAbonos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><BarChart3 size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Avaliação de Desempenho</span></div><input type="checkbox" checked={promoteData.modulos.avaliacao} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, avaliacao: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                    </div>
                  )}
                </div>

                {/* Gestão Patrimonial */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                  <button type="button" onClick={() => toggleSection('gestaoPatrimonial')} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:bg-cyan-600/30 transition">
                    <div className="flex items-center gap-2"><Car className="text-cyan-400" size={16} /><span className="font-semibold text-white text-sm">Gestão Patrimonial</span></div>
                    <span className="text-gray-400 text-sm">{expandedSections.gestaoPatrimonial ? '▼' : '▶'}</span>
                  </button>
                  {expandedSections.gestaoPatrimonial && (
                    <div className="p-3 space-y-2 border-t border-gray-600">
                      <div className="flex justify-end mb-2"><button type="button" onClick={() => handleSelectAll('gestaoPatrimonial', ['viaturas', 'abastecimentos', 'manutencoes', 'inventario'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button></div>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Car size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Viaturas</span></div><input type="checkbox" checked={promoteData.modulos.viaturas} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, viaturas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Fuel size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Abastecimentos</span></div><input type="checkbox" checked={promoteData.modulos.abastecimentos} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, abastecimentos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Wrench size={14} className="text-red-400" /><span className="text-gray-300 text-sm">Manutenções</span></div><input type="checkbox" checked={promoteData.modulos.manutencoes} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, manutencoes: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Boxes size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Inventário</span></div><input type="checkbox" checked={promoteData.modulos.inventario} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, inventario: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                    </div>
                  )}
                </div>

                {/* Financeiro */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                  <button type="button" onClick={() => toggleSection('financeiro')} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:bg-emerald-600/30 transition">
                    <div className="flex items-center gap-2"><DollarSign className="text-emerald-400" size={16} /><span className="font-semibold text-white text-sm">Financeiro</span></div>
                    <span className="text-gray-400 text-sm">{expandedSections.financeiro ? '▼' : '▶'}</span>
                  </button>
                  {expandedSections.financeiro && (
                    <div className="p-3 space-y-2 border-t border-gray-600 max-h-48 overflow-y-auto">
                      <div className="flex justify-end mb-2"><button type="button" onClick={() => handleSelectAll('financeiro', ['fornecedores', 'fluxoCaixa', 'contaCorrente', 'controloPagamento', 'custosReceitas', 'orcamentos', 'dre', 'indicadores', 'transferencias', 'reconciliacao'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button></div>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Truck size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Fornecedores</span></div><input type="checkbox" checked={promoteData.modulos.fornecedores} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, fornecedores: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><TrendingUp size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Fluxo de Caixa</span></div><input type="checkbox" checked={promoteData.modulos.fluxoCaixa} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, fluxoCaixa: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Wallet size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Conta Corrente</span></div><input type="checkbox" checked={promoteData.modulos.contaCorrente} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, contaCorrente: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><FileText size={14} className="text-yellow-400" /><span className="text-gray-300 text-sm">Controlo de Pagamento</span></div><input type="checkbox" checked={promoteData.modulos.controloPagamento} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, controloPagamento: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><PieChart size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Custos e Receitas</span></div><input type="checkbox" checked={promoteData.modulos.custosReceitas} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, custosReceitas: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><ClipboardList size={14} className="text-orange-400" /><span className="text-gray-300 text-sm">Orçamentos</span></div><input type="checkbox" checked={promoteData.modulos.orcamentos} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, orcamentos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><BarChart3 size={14} className="text-red-400" /><span className="text-gray-300 text-sm">DRE</span></div><input type="checkbox" checked={promoteData.modulos.dre} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, dre: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Eye size={14} className="text-cyan-400" /><span className="text-gray-300 text-sm">Indicadores</span></div><input type="checkbox" checked={promoteData.modulos.indicadores} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, indicadores: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><ArrowRightLeft size={14} className="text-teal-400" /><span className="text-gray-300 text-sm">Transferências</span></div><input type="checkbox" checked={promoteData.modulos.transferencias} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, transferencias: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><Wallet size={14} className="text-indigo-400" /><span className="text-gray-300 text-sm">Reconciliação Bancária</span></div><input type="checkbox" checked={promoteData.modulos.reconciliacao} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, reconciliacao: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                    </div>
                  )}
                </div>

                {/* Relatórios */}
                <div className="bg-gray-700/30 rounded-xl overflow-hidden mb-3">
                  <button type="button" onClick={() => toggleSection('relatorios')} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-rose-600/20 to-pink-600/20 hover:bg-rose-600/30 transition">
                    <div className="flex items-center gap-2"><FileText className="text-rose-400" size={16} /><span className="font-semibold text-white text-sm">Relatórios e Análises</span></div>
                    <span className="text-gray-400 text-sm">{expandedSections.relatorios ? '▼' : '▶'}</span>
                  </button>
                  {expandedSections.relatorios && (
                    <div className="p-3 space-y-2 border-t border-gray-600">
                      <div className="flex justify-end mb-2"><button type="button" onClick={() => handleSelectAll('relatorios', ['relatorios', 'graficos', 'analise'])} className="text-xs text-blue-400 hover:text-blue-300">Marcar Todos</button></div>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><FileText size={14} className="text-blue-400" /><span className="text-gray-300 text-sm">Relatórios</span></div><input type="checkbox" checked={promoteData.modulos.relatorios} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, relatorios: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><BarChart3 size={14} className="text-green-400" /><span className="text-gray-300 text-sm">Gráficos</span></div><input type="checkbox" checked={promoteData.modulos.graficos} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, graficos: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                      <label className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition"><div className="flex items-center gap-2"><PieChart size={14} className="text-purple-400" /><span className="text-gray-300 text-sm">Análise Geral</span></div><input type="checkbox" checked={promoteData.modulos.analise} onChange={(e) => setPromoteData({...promoteData, modulos: {...promoteData.modulos, analise: e.target.checked}})} className="w-4 h-4 text-purple-600 rounded" /></label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-gray-800">
              <button onClick={() => setShowPromoteModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">Cancelar</button>
              <button onClick={promoverTecnico} disabled={promovendo === selectedFuncionario._id} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-2">
                {promovendo === selectedFuncionario._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Promover
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => carregarFuncionarios()}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada && !isTecnico() ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">Selecione uma empresa para visualizar os funcionários</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><div className="bg-white/20 rounded-lg p-2"><Users className="w-5 h-5" /></div><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span></div>
                <p className="text-sm opacity-90">Total de Funcionários</p><p className="text-2xl font-bold mt-1">{estatisticas.total}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><div className="bg-white/20 rounded-lg p-2"><CheckCircle className="w-5 h-5" /></div><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Ativos</span></div>
                <p className="text-sm opacity-90">Funcionários Ativos</p><p className="text-2xl font-bold mt-1">{estatisticas.ativos}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><div className="bg-white/20 rounded-lg p-2"><Shield className="w-5 h-5" /></div><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Técnicos</span></div>
                <p className="text-sm opacity-90">Funcionários Técnicos</p><p className="text-2xl font-bold mt-1">{estatisticas.tecnicos}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Pesquisar por nome, email, cargo ou NIF..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={busca} onChange={(e) => setBusca(e.target.value)} />
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
  <div className="relative flex-1 md:w-48">
    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <select className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
      <option value="todos">Todos os Status</option>
      <option value="ativo">Ativos</option>
      <option value="inativo">Inativos</option>
    </select>
  </div>
  <button onClick={carregarFuncionarios} className="p-2.5 rounded-xl bg-gray-700/50 border border-gray-600 text-gray-400 hover:text-white hover:border-blue-500 transition-all duration-200">
    <RefreshCw className="w-5 h-5" />
  </button>
  <button onClick={exportarPDFListaFuncionarios} disabled={exportando || filteredFuncionarios.length === 0} className="p-2.5 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white transition-all duration-200 disabled:opacity-50">
    {exportando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
  </button>
  
  {/* BOTÃO DE IMPORTAR ADICIONADO */}
  <button 
    onClick={() => navigate("/funcionarios/importar")} 
    className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2"
  >
    <Upload size={18} /> Importar
  </button>
  
  <button onClick={() => navigate("/funcionarios/cadastrar")} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg">
    <Plus size={18} /> Novo Funcionário
  </button>
</div>
                </div>
              </div>
            </div>

            {loading && !redirecting ? (
              <div className="flex flex-col items-center justify-center py-16"><div className="relative"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div><div className="absolute inset-0 flex items-center justify-center"><Users className="w-6 h-6 text-blue-500 animate-pulse" /></div></div><p className="mt-4 text-gray-400">Carregando funcionários...</p></div>
            ) : filteredFuncionarios.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center"><div className="bg-gray-700/30 rounded-full p-6 mb-4 inline-flex"><Users className="w-12 h-12 text-gray-500" /></div><p className="text-gray-400 text-lg">Nenhum funcionário encontrado</p><p className="text-gray-500 text-sm mt-1">{busca || statusFilter !== "todos" ? "Tente ajustar os filtros de busca" : "Clique em 'Novo Funcionário' para começar"}</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFuncionarios.map(func => (
                  <div key={func._id} className="group bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 overflow-hidden shadow-lg">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          {func.foto ? <img src={`http://localhost:5000${func.foto}`} alt={func.nome} className="w-14 h-14 rounded-xl object-cover border border-gray-600" /> : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center"><Users className="w-7 h-7 text-white" /></div>}
                          <div className="flex-1 min-w-0"><h3 className="text-lg font-bold text-white truncate">{func.nome}</h3><p className="text-sm text-gray-400">{func.cargo}</p></div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${func.status === "Ativo" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>{func.status}</span>
                          {func.isTecnico && <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30"><Shield className="w-3 h-3 inline mr-1" /> Técnico</span>}
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        {func.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-blue-400" /><span className="text-gray-300 truncate">{func.email}</span></div>}
                        {func.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-green-400" /><span className="text-gray-300">{func.telefone}</span></div>}
                        {func.salarioBase && <div className="flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-yellow-400" /><span className="text-gray-300">{formatarMoeda(func.salarioBase)}</span></div>}
                        {func.dataAdmissao && <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-gray-400" /><span className="text-gray-400 text-xs">Admitido: {new Date(func.dataAdmissao).toLocaleDateString('pt-PT')}</span></div>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/funcionarios/visualizar/${func._id}`)} className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"><Eye size={16} /> Ver</button>
                        <button onClick={() => navigate(`/funcionarios/editar/${func._id}`)} className="flex-1 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"><Edit size={16} /> Editar</button>
                        <button onClick={() => exportarPDFFuncionarioIndividual(func)} disabled={exportando} className="flex-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50">{exportando ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} PDF</button>
                        {!isTecnico() && !func.isTecnico && <button onClick={() => abrirModalPromover(func)} className="flex-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white py-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"><Shield size={16} /> Promover</button>}
                        <button onClick={() => excluirFuncionario(func._id)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-xl transition-all duration-200"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </Layout>
  );
};

export default ListaFuncionarios;