// frontend/src/pages/FolhaSalarial.jsx - VERSÃO COMPLETA CORRIGIDA
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import ConfiguracaoBanco from "../components/ConfiguracaoBanco";
import { 
  Calendar, Users, TrendingUp, Eye, Download, 
  DollarSign, FileText, Loader2, CheckCircle, 
  AlertCircle, Building2, X, ChevronLeft, 
  ChevronRight, UserCheck, Percent,
  Award, Clock, Ban, FileSignature, RefreshCw,
  History, Edit, Trash2, Send, CheckSquare, CreditCard,
  Coffee, Bus, Umbrella, Gift, Settings, Banknote,
  Printer, Mail, MessageCircle, Info
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { carregarLogoBase64, drawCabecalhoProfissional, drawRodape } from '../utils/pdfUtils';
import QRCode from "qrcode";

const FolhaSalarial = () => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [folhas, setFolhas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [periodo, setPeriodo] = useState({ 
    mes: new Date().getMonth() + 1, 
    ano: new Date().getFullYear() 
  });
  const [detalhes, setDetalhes] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [gestorEmpresa, setGestorEmpresa] = useState(null);
  const [mostrarConfigBanco, setMostrarConfigBanco] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [filtroFuncionario, setFiltroFuncionario] = useState(""); // filtro modal
  
  // Abas: 'folhas' | 'avencas'
  const [abaAtiva, setAbaAtiva] = useState("folhas");
  const [avencas, setAvencas] = useState([]);
  const [showModalAvenca, setShowModalAvenca] = useState(false);
  const [editandoAvenca, setEditandoAvenca] = useState(null);
  const [avencaForm, setAvencaForm] = useState({
    funcionarioId: "", tipo: "AdiantamentoSalarial", valor: "",
    motivo: "", dataVencimento: "", numeroParcelas: "1", valorParcela: "",
    periodicidade: "Unico", status: "Pendente"
  });
  const [avencasResumo, setAvencasResumo] = useState({
    totalAdiantamentos: 0, valorAdiantamentos: 0, valorAdiantamentosPago: 0,
    totalAvencas: 0, valorAvencas: 0, valorAvencasPago: 0, valorPendente: 0
  });
  
  const { user, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const bancosDisponiveis = [
    { codigo: "BAI", nome: "Banco Angolano de Investimentos (BAI)" },
    { codigo: "BFA", nome: "Banco de Fomento Angola (BFA)" },
    { codigo: "BIC", nome: "Banco BIC" },
    { codigo: "KEVE", nome: "Banco Keve" },
    { codigo: "SOL", nome: "Banco Sol" },
    { codigo: "ECONOMICO", nome: "Banco Económico" },
    { codigo: "YETU", nome: "Banco Yetu" }
  ];

  const formatarNumero = (valor) => {
    if (!valor && valor !== 0) return "0,00";
    const num = Number(valor);
    if (isNaN(num)) return "0,00";
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const extrairDiaDeDataCompleta = (dataCompleta) => {
    if (!dataCompleta) return null;
    const partes = dataCompleta.split('/');
    if (partes.length === 3) {
      const dia = parseInt(partes[0], 10);
      return isNaN(dia) ? null : dia;
    }
    const apenasDia = parseInt(dataCompleta, 10);
    return isNaN(apenasDia) ? null : apenasDia;
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
      carregarFolhas();
      carregarFuncionarios();
      carregarDadosEmpresa();
      carregarAvencas();
      carregarResumoAvencas();
    } else {
      setFolhas([]);
      setFuncionarios([]);
      setDadosEmpresa(null);
      setGestorEmpresa(null);
      setAvencas([]);
    }
  }, [empresaSelecionada, periodo, statusFiltro]);

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
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
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
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarFolhas = async () => {
    if (!empresaSelecionada) {
      setFolhas([]);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `https://sirexa-api.onrender.com/api/folha-salarial?empresaId=${empresaSelecionada}`;
      if (periodo.ano) url += `&ano=${periodo.ano}`;
      if (periodo.mes) url += `&mes=${periodo.mes}`;
      if (statusFiltro) url += `&status=${statusFiltro}`;
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.status === 403) {
        mostrarMensagem("Acesso negado a esta empresa", "erro");
        setEmpresaSelecionada("");
        setFolhas([]);
        return;
      }
      const data = await response.json();
      const folhasList = Array.isArray(data) ? data : [];
      setFolhas(folhasList);
      setTotalPaginas(Math.ceil(folhasList.length / 10));
    } catch (error) {
      console.error("Erro:", error);
      setFolhas([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarFuncionarios = async () => {
    if (!empresaSelecionada) {
      setFuncionarios([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://sirexa-api.onrender.com/api/funcionarios?empresaId=${empresaSelecionada}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      if (response.status === 403) {
        setFuncionarios([]);
        return;
      }
      const data = await response.json();
      setFuncionarios(Array.isArray(data) ? data : (data.dados || []));
    } catch (error) {
      console.error("Erro:", error);
      setFuncionarios([]);
    }
  };
   
  const carregarDadosEmpresa = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDadosEmpresa(data);
        if (data.gestorId) {
          await carregarGestorEmpresa(data.gestorId);
        } else if (data.gestor) {
          await carregarGestorEmpresa(data.gestor);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    }
  };

  const carregarGestorEmpresa = async (gestorId) => {
    if (!gestorId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/gestor/${gestorId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGestorEmpresa(data);
      }
    } catch (error) {
      console.error("Erro ao carregar gestor:", error);
    }
  };

  const carregarAvencas = async () => {
    if (!empresaSelecionada) { setAvencas([]); return; }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/avencas-adiantamentos?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.sucesso) setAvencas(data.dados || []);
    } catch (error) {
      console.error("Erro ao carregar avenças:", error);
    }
  };

  const carregarResumoAvencas = async () => {
    if (!empresaSelecionada) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/avencas-adiantamentos/resumo?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.sucesso) setAvencasResumo(data.dados);
    } catch (error) {
      console.error("Erro ao carregar resumo:", error);
    }
  };

  const handleSalvarAvenca = async () => {
    if (!avencaForm.funcionarioId || !avencaForm.valor) {
      mostrarMensagem("Preencha todos os campos obrigatórios", "erro");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = editandoAvenca
        ? `https://sirexa-api.onrender.com/api/avencas-adiantamentos/${editandoAvenca}`
        : "https://sirexa-api.onrender.com/api/avencas-adiantamentos";
      const method = editandoAvenca ? "PUT" : "POST";
      const payload = {
        ...avencaForm, empresaId: empresaSelecionada,
        valor: parseFloat(avencaForm.valor),
        valorParcela: parseFloat(avencaForm.valorParcela) || (parseFloat(avencaForm.valor) / (parseInt(avencaForm.numeroParcelas) || 1)),
        numeroParcelas: parseInt(avencaForm.numeroParcelas) || 1
      };
      const response = await fetch(url, {
        method, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.sucesso) {
        mostrarMensagem(data.mensagem, "sucesso");
        setShowModalAvenca(false);
        setEditandoAvenca(null);
        resetFormAvenca();
        carregarAvencas();
        carregarResumoAvencas();
      } else {
        mostrarMensagem(data.mensagem || "Erro ao salvar", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar: " + error.message, "erro");
    } finally {
      setLoading(false);
    }
  };

  const excluirAvenca = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este registo?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`https://sirexa-api.onrender.com/api/avencas-adiantamentos/${id}`, {
        method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
      });
      mostrarMensagem("Registo excluído!", "sucesso");
      carregarAvencas();
      carregarResumoAvencas();
    } catch (error) {
      mostrarMensagem("Erro ao excluir", "erro");
    }
  };

  const integrarAvencaFolha = async (id) => {
    if (!window.confirm("Integrar parcela deste registo na folha salarial?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/avencas-adiantamentos/${id}/integrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ mesReferencia: periodo.mes, anoReferencia: periodo.ano })
      });
      const data = await response.json();
      if (data.sucesso) {
        mostrarMensagem(data.mensagem, "sucesso");
        carregarAvencas();
        carregarResumoAvencas();
      }
    } catch (error) {
      mostrarMensagem("Erro ao integrar", "erro");
    }
  };

  const resetFormAvenca = () => {
    setAvencaForm({
      funcionarioId: "", tipo: "AdiantamentoSalarial", valor: "",
      motivo: "", dataVencimento: "", numeroParcelas: "1", valorParcela: "",
      periodicidade: "Unico", status: "Pendente"
    });
  };

  const getStatusAvencaColor = (status) => {
    const cores = {
      'Pendente': 'bg-yellow-600/20 text-yellow-400',
      'Aprovado': 'bg-green-600/20 text-green-400',
      'EmPagamento': 'bg-blue-600/20 text-blue-400',
      'Pago': 'bg-gray-600/20 text-gray-400',
      'Cancelado': 'bg-red-600/20 text-red-400'
    };
    return cores[status] || 'bg-gray-600/20 text-gray-400';
  };

  const calcularFolha = async () => {
    if (!empresaSelecionada) {
      mostrarMensagem("Selecione uma empresa primeiro", "erro");
      return;
    }
    setCalculando(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/folha-salarial/calcular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          empresaId: empresaSelecionada, 
          mes: periodo.mes, 
          ano: periodo.ano 
        })
      });
      const data = await response.json();
      if (response.ok && data.sucesso) {
        mostrarMensagem("Folha salarial calculada com sucesso!", "sucesso");
        setRedirecting(true);
        await carregarFolhas();
        setTimeout(() => {
          setRedirecting(false);
          window.location.reload();
        }, 10);
      } else {
        mostrarMensagem(data.mensagem || "Erro ao calcular folha", "erro");
        setCalculando(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setCalculando(false);
    }
  };

  const verDetalhes = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/folha-salarial/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setDetalhes(data);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar detalhes", "erro");
    }
  };

  const finalizarFolha = async (id) => {
    const dataSalarioCompleta = prompt(
      "Data de vencimento do SALARIO (DD/MM/AAAA):\n\nExemplo: 15/04/2025\nDeixe em branco para usar o dia 15 do mês atual",
      "15"
    );
    if (dataSalarioCompleta === null) return;
    const dataINSSCompleta = prompt(
      "Data de vencimento do INSS (DD/MM/AAAA):\n\nExemplo: 20/04/2025\nDeixe em branco para usar o dia 20 do mês atual",
      "20"
    );
    if (dataINSSCompleta === null) return;
    const dataIRTCompleta = prompt(
      "Data de vencimento do IRT (DD/MM/AAAA):\n\nExemplo: 25/04/2025\nDeixe em branco para usar o dia 25 do mês atual",
      "25"
    );
    if (dataIRTCompleta === null) return;
    const contaDebito = prompt(
      "Conta bancaria para debito:\n\nExemplos: BAI01, BFA01, BIC01\nDeixe em branco para usar BAI01",
      "BAI01"
    );
    if (contaDebito === null) return;
    
    const diaSalario = extrairDiaDeDataCompleta(dataSalarioCompleta);
    const diaINSS = extrairDiaDeDataCompleta(dataINSSCompleta);
    const diaIRT = extrairDiaDeDataCompleta(dataIRTCompleta);
    if (!diaSalario || !diaINSS || !diaIRT) {
      mostrarMensagem("Datas inválidas. Use o formato DD/MM/AAAA ou apenas o dia.", "erro");
      return;
    }
    if (!window.confirm(
      "CONFIRMACAO DA FOLHA SALARIAL\n\n" +
      `Datas de vencimento:\n   - Salario: ${dataSalarioCompleta}\n   - INSS: ${dataINSSCompleta}\n   - IRT: ${dataIRTCompleta}\n\n` +
      `Conta debito: ${contaDebito.toUpperCase()}\n\nApos finalizada, a folha nao podera ser alterada!\n\nDeseja continuar?`
    )) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/folha-salarial/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: "finalizado", 
          dataProcessamento: new Date(),
          contaDebito: contaDebito.toUpperCase().trim() || "BAI01",
          datasVencimento: {
            salario: diaSalario,
            inss: diaINSS,
            irt: diaIRT
          },
          datasVencimentoCompletas: {
            salario: dataSalarioCompleta,
            inss: dataINSSCompleta,
            irt: dataIRTCompleta
          }
        })
      });
      const data = await response.json();
      if (response.ok && data.sucesso) {
        mostrarMensagem(data.mensagem, "sucesso");
        carregarFolhas();
        if (data.pagamentos && data.pagamentos.length > 0) {
          setTimeout(() => {
            mostrarMensagem(`${data.pagamentos.length} pagamentos criados com status PENDENTE.`, "sucesso");
          }, 500);
        }
      } else {
        mostrarMensagem(data.mensagem || "Erro ao finalizar folha", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  const excluirFolha = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta folha?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/folha-salarial/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        mostrarMensagem("Folha excluida com sucesso!", "sucesso");
        carregarFolhas();
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao excluir folha", "erro");
    }
  };

  const exportarPDFProfissional = async () => {
    if (!detalhes) return;
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const dataAtual = new Date();
      const empresaObj = dadosEmpresa || { nome: detalhes.empresaNome || "Empresa", nif: detalhes.empresaNif || "---" };
      const logo = await carregarLogoBase64(empresaObj);
      
      let y = drawCabecalhoProfissional(doc, empresaObj, logo, 10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`${meses[detalhes.mesReferencia - 1]} / ${detalhes.anoReferencia}`, 148.5, y, { align: "center" });
      y += 4;
      doc.text(`NIF: ${empresaObj.nif || "---"}`, 15, y);
      doc.text(`Data: ${dataAtual.toLocaleDateString("pt-AO")}`, 100, y);
      doc.text(`Status: ${detalhes.status === "finalizado" ? "FINALIZADO" : "RASCUNHO"}`, 200, y);
      y += 5;
      doc.text(`Regime INSS: ${detalhes.regimeINSS || "Normal"}`, 15, y);
      
      const totais = detalhes.totais || {};
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESUMO FINANCEIRO", 15, y);
      y += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const resumoItems = [
        { label: "Total Salários:", valor: formatarNumero(totais.totalSalarios) },
        { label: "Total Faltas:", valor: formatarNumero(totais.totalFaltas) },
        { label: "Subs. Alimentação:", valor: formatarNumero(totais.totalAbonosAlimentacao) },
        { label: "Subs. Transporte:", valor: formatarNumero(totais.totalAbonosTransporte) },
        { label: "Subs. Férias:", valor: formatarNumero(totais.totalAbonosFerias) },
        { label: "Décimo Terceiro:", valor: formatarNumero(totais.totalAbonosDecimoTerceiro) },
        { label: "Bónus/Prémios:", valor: formatarNumero(totais.totalAbonosBonus) },
        { label: "Outros Abonos:", valor: formatarNumero(totais.totalAbonosOutros) },
        { label: "Avenças:", valor: formatarNumero(totais.totalAvencas) },
        { label: "Adiantamentos:", valor: formatarNumero(totais.totalAdiantamentos) },
        { label: "INSS Colaborador:", valor: formatarNumero(totais.totalINSSColaborador) },
        { label: "INSS Empregador:", valor: formatarNumero(totais.totalINSSEmpregador) },
        { label: "Total IRT:", valor: formatarNumero(totais.totalIRT) }
      ];
      const startX = [15, 105, 195];
      resumoItems.forEach((item, index) => {
        const col = Math.floor(index / 4);
        const row = index % 4;
        const x = startX[col];
        const yy = y + (row * 4.5);
        doc.setFont("helvetica", "bold");
        doc.text(item.label, x, yy);
        doc.setFont("helvetica", "normal");
        doc.text(`${item.valor} Kz`, x + 40, yy);
      });
      y += 22;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 197, 94);
      doc.text(`TOTAL LÍQUIDO A PAGAR: ${formatarNumero(totais.totalLiquido)} Kz`, 148.5, y + 3, { align: "center" });
      y += 12;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("DETALHES DOS FUNCIONÁRIOS", 15, y);
      
      const funcionariosData = detalhes.funcionarios?.map(f => [
        f.nome || "-",
        f.cargo || f.funcao || "-",
        formatarNumero(f.salarioBase),
        formatarNumero(f.totalAbonosAlimentacao),
        formatarNumero(f.totalAbonosTransporte),
        formatarNumero(f.totalAbonosFerias),
        formatarNumero(f.valorFaltas),
        formatarNumero(f.inssColaborador),
        formatarNumero(f.irt),
        formatarNumero(f.salarioLiquido),
        f.iban || "-"
      ]) || [];
      
      autoTable(doc, {
        startY: y + 3,
        head: [["Funcionário","Função","Salário","Alim","Transp","Férias","Faltas","INSS","IRT","Líquido","IBAN"]],
        body: funcionariosData,
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 1.5, halign: "right", lineColor: [0,0,0], lineWidth: 0.1, overflow: 'linebreak', minCellHeight: 6 },
        headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontStyle: "bold", fontSize: 6.5, halign: "center" },
        bodyStyles: { lineColor: [0,0,0], lineWidth: 0.1 },
        alternateRowStyles: { fillColor: [245,247,250] },
        showHead: 'everyPage',
        margin: { top: 5, right: 15, bottom: 15, left: 15 },
        tableWidth: 'auto',
        columnStyles: {
          0: { halign: "left", cellWidth: 48 },
          1: { halign: "left", cellWidth: 32 },
          2: { halign: "right", cellWidth: 20 },
          3: { halign: "right", cellWidth: 15 },
          4: { halign: "right", cellWidth: 15 },
          5: { halign: "right", cellWidth: 14 },
          6: { halign: "right", cellWidth: 14 },
          7: { halign: "right", cellWidth: 17 },
          8: { halign: "right", cellWidth: 17 },
          9: { halign: "right", cellWidth: 20 },
          10: { halign: "left", cellWidth: 50 }
        },
        didDrawPage: function() {},
      });
      
      const assinaturaY = doc.lastAutoTable.finalY + 15;
      if (assinaturaY > 185) doc.addPage();
      const assY = assinaturaY > 185 ? 30 : assinaturaY;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80,80,80);
      doc.line(30, assY, 130, assY);
      doc.setFont("helvetica", "bold");
      doc.text("Assinatura do Gestor", 80, assY-3, { align: "center" });
      doc.line(160, assY, 260, assY);
      doc.text("Assinatura do Técnico RH", 210, assY-3, { align: "center" });
      drawRodape(doc, empresaObj.nome || "Empresa", { numeroDocumento: `Folha ${meses[detalhes.mesReferencia-1]}/${detalhes.anoReferencia}` });
      doc.save(`Folha_Salarial_${empresaObj.nome}_${meses[detalhes.mesReferencia-1]}_${detalhes.anoReferencia}.pdf`);
      mostrarMensagem("PDF exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao gerar PDF", "erro");
    } finally {
      setExportando(false);
    }
  };

  const exportarFicheiroPagamento = async (codigoBanco) => {
    if (!detalhes) {
      mostrarMensagem("Nenhuma folha selecionada", "erro");
      return;
    }
    if (detalhes.status !== "finalizado") {
      mostrarMensagem("A folha precisa estar finalizada para exportar o ficheiro de pagamento", "erro");
      return;
    }
    setExportando(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sirexa-api.onrender.com/api/folha-salarial/exportar-pagamento/${detalhes._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ codigoBanco, empresaId: empresaSelecionada })
      });
      if (!response.ok) throw new Error((await response.json()).mensagem || "Erro");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `pagamento_${codigoBanco}_${detalhes.empresaNome}_${meses[detalhes.mesReferencia-1]}_${detalhes.anoReferencia}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) filename = match[1].replace(/['"]/g, '');
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      mostrarMensagem(`Ficheiro de pagamento ${codigoBanco} exportado com sucesso!`, "sucesso");
    } catch (error) {
      console.error(error);
      mostrarMensagem(error.message || "Erro ao exportar ficheiro de pagamento", "erro");
    } finally {
      setExportando(false);
    }
  };

  const abrirModalBanco = () => {
    if (!detalhes) {
      mostrarMensagem("Nenhuma folha selecionada", "erro");
      return;
    }
    if (detalhes.status !== "finalizado") {
      mostrarMensagem("A folha precisa estar finalizada para exportar o ficheiro de pagamento", "erro");
      return;
    }
    setShowBancoModal(true);
  };

  // ========== MINI-CABEÇALHO DENTRO DE CADA VIA ==========
  const desenharMiniCabecalho = (doc, empresa, logoBase64, y, margem, rMargem) => {
    const nomeEmpresa = empresa?.nome || 'Empresa';
    const nif = empresa?.nif || '---';
    if (logoBase64) {
      const formato = /\.jpe?g$/i.test(empresa?.logotipo || '') ? 'JPEG' : 'PNG';
      doc.addImage(logoBase64, formato, margem + 2, y + 1, 10, 10);
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(nomeEmpresa.substring(0, 40), margem + 14, y + 5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`NIF: ${nif}`, margem + 14, y + 9);
    return y + 12;
  };

  // ========== DESENHA UM RECIBO AUTO-SUFICIENTE (com mini-cabeçalho + QR) ==========
  const desenharReciboNoDoc = async (doc, funcionario, dadosFolha, localPagamento, yStart, tipoVia, logoReceipt) => {
    const margem = 14;
    const pageW = doc.internal.pageSize.getWidth();
    const rMargem = pageW - margem;
    const largUtil = rMargem - margem;
    const dataAtual = new Date();
    const mesNome = meses[dadosFolha.mesReferencia - 1] || '---';

    const totalAbonos = (funcionario.totalAbonosAlimentacao || 0) +
      (funcionario.totalAbonosTransporte || 0) +
      (funcionario.totalAbonosFerias || 0) +
      (funcionario.totalAbonosDecimoTerceiro || 0) +
      (funcionario.totalAbonosBonus || 0) +
      (funcionario.totalAbonosOutros || 0);
    const totalAvencasDesconto = (funcionario.totalAvencas || 0) + (funcionario.totalAdiantamentos || 0);
    const salarioBruto = (funcionario.salarioBase || 0) + totalAbonos;
    const totalDescontos = (funcionario.valorFaltas || 0) +
      (funcionario.inssColaborador || 0) +
      (funcionario.irt || 0) +
      totalAvencasDesconto;
    const salarioLiquido = funcionario.salarioLiquido || (salarioBruto - totalDescontos);

    let y = yStart;

    // QR Code no cabeçalho de cada via
    const qrData = JSON.stringify({
      funcionario: funcionario.nome, empresa: dadosEmpresa?.nome,
      periodo: `${mesNome}/${dadosFolha.anoReferencia}`,
      salarioBruto: formatarNumero(salarioBruto),
      totalDescontos: formatarNumero(totalDescontos),
      salarioLiquido: formatarNumero(salarioLiquido),
      dataPagamento: dataAtual.toISOString().split('T')[0]
    });
    const qrBase64 = await QRCode.toDataURL(qrData, { width: 50, margin: 1 });

    // Borda fina ao redor do recibo
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margem, y, largUtil, 118, 'S');

    // Mini-cabeçalho da empresa + QR
    const _y = desenharMiniCabecalho(doc, dadosEmpresa, logoReceipt, y + 1, margem, rMargem);
    doc.addImage(qrBase64, 'PNG', rMargem - 16, y + 2, 12, 12);

    // Tipo de via
    const corVia = tipoVia === 'ORIGINAL' ? [37, 99, 235] : [220, 38, 38];
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(corVia[0], corVia[1], corVia[2]);
    const textoVia = tipoVia === 'ORIGINAL' ? 'VIA ORIGINAL - COLABORADOR' : 'VIA CÓPIA - EMPRESA';
    doc.text(textoVia, margem + 2, y + 3.5);
    doc.setDrawColor(corVia[0], corVia[1], corVia[2]);
    doc.setLineWidth(0.3);
    doc.line(margem + 2, y + 4, margem + 45, y + 4);

    // Linha separadora após mini-cabeçalho
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(margem + 2, _y + 1, rMargem - 2, _y + 1);

    // Título
    y = _y + 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('RECIBO DE PAGAMENTO', margem + 2, y);

    // Dados (2 colunas)
    doc.setFontSize(6.5);
    const fn = () => { doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); };
    const fb = () => { doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60); };

    const row1 = y + 4;
    fb(); doc.text('Funcionário:', margem + 2, row1);
    fn(); doc.text(String(funcionario.nome || '---'), margem + 26, row1);
    fb(); doc.text('Período:', margem + 2, row1 + 4.5);
    fn(); doc.text(`${mesNome} / ${dadosFolha.anoReferencia || '---'}`, margem + 26, row1 + 4.5);
    fb(); doc.text('Cargo:', margem + 2, row1 + 9);
    fn(); doc.text(String(funcionario.cargo || funcionario.funcao || '---'), margem + 26, row1 + 9);

    const c2 = margem + largUtil * 0.45;
    fb(); doc.text('IBAN:', c2, row1);
    fn(); doc.text(String(funcionario.iban || '---'), c2 + 14, row1);
    fb(); doc.text('Processamento:', c2, row1 + 4.5);
    fn(); doc.text(dataAtual.toLocaleDateString('pt-AO'), c2 + 28, row1 + 4.5);
    fb(); doc.text('Local:', c2, row1 + 9);
    fn(); doc.text(String(localPagamento || '---'), c2 + 16, row1 + 9);

    // Tabela de vencimentos
    const tabY = row1 + 13;
    doc.setFillColor(240, 245, 255);
    doc.rect(margem + 2, tabY, largUtil - 4, 3.5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('DISCRIMINAÇÃO', margem + 5, tabY + 2.5);
    doc.text('VALOR (Kz)', rMargem - 5, tabY + 2.5, { align: 'right' });

    const linhas = [
      { l: 'Salário Base', v: formatarNumero(funcionario.salarioBase) },
      { l: 'Subsídio Alimentação', v: formatarNumero(funcionario.totalAbonosAlimentacao) },
      { l: 'Subsídio Transporte', v: formatarNumero(funcionario.totalAbonosTransporte) },
      { l: 'Subsídio Férias', v: formatarNumero(funcionario.totalAbonosFerias) },
      { l: 'Décimo Terceiro', v: formatarNumero(funcionario.totalAbonosDecimoTerceiro || 0) },
      { l: 'Bónus/Prémios', v: formatarNumero(funcionario.totalAbonosBonus || 0) },
      { l: 'Outros Abonos', v: formatarNumero(funcionario.totalAbonosOutros || 0) },
    ];
    if (funcionario.totalAvencas > 0) linhas.push({ l: '(-) Avenças', v: `- ${formatarNumero(funcionario.totalAvencas)}` });
    if (funcionario.totalAdiantamentos > 0) linhas.push({ l: '(-) Adiantamentos', v: `- ${formatarNumero(funcionario.totalAdiantamentos)}` });

    let iy = tabY + 5;
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    linhas.forEach((l, i) => {
      const bg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(margem + 2, iy - 0.5, largUtil - 4, 3.5, 'F');
      doc.text(l.l, margem + 5, iy + 0.8);
      doc.text(l.v, rMargem - 5, iy + 0.8, { align: 'right' });
      iy += 3.7;
    });

    // Salário Bruto
    doc.setFillColor(235, 245, 255);
    doc.rect(margem + 2, iy - 0.5, largUtil - 4, 3.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(37, 99, 235);
    doc.text('SALÁRIO BRUTO', margem + 5, iy + 1);
    doc.text(`+ ${formatarNumero(salarioBruto)}`, rMargem - 5, iy + 1, { align: 'right' });
    iy += 4.5;

    // Descontos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(180, 60, 60);
    [{ l: 'Faltas', v: formatarNumero(funcionario.valorFaltas) },
     { l: 'INSS (Colaborador)', v: formatarNumero(funcionario.inssColaborador) },
     { l: 'IRT', v: formatarNumero(funcionario.irt) },
    ].forEach(d => {
      doc.text(d.l, margem + 5, iy + 0.8);
      doc.text(`- ${d.v}`, rMargem - 5, iy + 0.8, { align: 'right' });
      iy += 3.7;
    });

    // Total Descontos
    doc.setFillColor(255, 240, 240);
    doc.rect(margem + 2, iy - 0.5, largUtil - 4, 3.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(180, 60, 60);
    doc.text('TOTAL DE DESCONTOS', margem + 5, iy + 1);
    doc.text(`- ${formatarNumero(totalDescontos)}`, rMargem - 5, iy + 1, { align: 'right' });
    iy += 4.5;

    // Líquido
    doc.setFillColor(37, 99, 235);
    doc.rect(margem + 2, iy - 0.5, largUtil - 4, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL LÍQUIDO', margem + 5, iy + 1.5);
    doc.text(`${formatarNumero(salarioLiquido)} Kz`, rMargem - 5, iy + 1.5, { align: 'right' });
    iy += 6;

    // Assinaturas
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const assY = iy + 4;
    doc.line(margem + 3, assY, margem + 50, assY);
    doc.text('Assinatura do Funcionário', margem + 26, assY + 2.5, { align: 'center' });
    doc.line(margem + 55, assY, margem + 102, assY);
    doc.text('Assinatura / Carimbo da Empresa', margem + 78, assY + 2.5, { align: 'center' });
    doc.text(`Data: ${dataAtual.toLocaleDateString('pt-AO')}`, margem + 3, assY + 2.5);

    // Borda final com altura dinâmica
    const alturaReal = assY + 5 - yStart;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margem, yStart, largUtil, alturaReal, 'S');
    return alturaReal;
  };

  const adicionarReciboAoDoc = async (doc, funcionario, dadosFolha, localPagamento) => {
    const logoReceipt = await carregarLogoBase64(dadosEmpresa);
    const altura = await desenharReciboNoDoc(doc, funcionario, dadosFolha, localPagamento, 8, 'ORIGINAL', logoReceipt);
    await desenharReciboNoDoc(doc, funcionario, dadosFolha, localPagamento, 8 + altura + 4, 'CÓPIA', logoReceipt);
  };

  const gerarReciboIndividual = async (funcionario, dadosFolha) => {
    const localPagamento = prompt("Informe o local do pagamento (ex: Luanda, Sede da Empresa):", 
      dadosEmpresa?.endereco?.cidade || "Luanda");
    if (localPagamento === null) return;
    setExportando(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      await adicionarReciboAoDoc(doc, funcionario, dadosFolha, localPagamento);
      drawRodape(doc, dadosEmpresa?.nome || "Empresa", { numeroDocumento: `Recibo ${funcionario.nome}` });
      doc.save(`Recibo_${funcionario.nome.replace(/\s/g, "_")}_${dadosFolha.mesReferencia}_${dadosFolha.anoReferencia}.pdf`);
      mostrarMensagem(`Recibo de ${funcionario.nome} gerado com sucesso!`, "sucesso");
    } catch (error) {
      console.error("Erro ao gerar recibo:", error);
      mostrarMensagem("Erro ao gerar recibo.", "erro");
    } finally {
      setExportando(false);
    }
  };

  const gerarRecibosEmLote = async () => {
    if (!detalhes || !detalhes.funcionarios || detalhes.funcionarios.length === 0) {
      mostrarMensagem("Nenhum funcionário encontrado para gerar recibos.", "erro");
      return;
    }
    const localPagamento = prompt("Informe o local do pagamento (ex: Luanda, Sede da Empresa):", 
      dadosEmpresa?.endereco?.cidade || "Luanda");
    if (localPagamento === null) return;
    setExportando(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      let primeiro = true;
      for (const func of detalhes.funcionarios) {
        if (!primeiro) doc.addPage();
        primeiro = false;
        await adicionarReciboAoDoc(doc, func, detalhes, localPagamento);
      }
      drawRodape(doc, dadosEmpresa?.nome || "Empresa", { numeroDocumento: `Lote ${detalhes.funcionarios.length} recibos` });
      doc.save(`Recibos_Todos_${detalhes.empresaNome}_${meses[detalhes.mesReferencia-1]}_${detalhes.anoReferencia}.pdf`);
      mostrarMensagem(`${detalhes.funcionarios.length} recibos gerados com sucesso!`, "sucesso");
    } catch (error) {
      console.error("Erro ao gerar recibos em lote:", error);
      mostrarMensagem("Erro ao gerar recibos em lote.", "erro");
    } finally {
      setExportando(false);
    }
  };

  const enviarReciboEmail = (funcionario) => {
    mostrarMensagem(`📧 Funcionalidade de envio por e-mail para ${funcionario.nome} será implementada em breve.`, "info");
  };

  const enviarReciboWhatsApp = (funcionario) => {
    mostrarMensagem(`📱 Funcionalidade de envio por WhatsApp para ${funcionario.nome} será implementada em breve.`, "info");
  };

  const folhasPaginadas = folhas.slice((paginaAtual - 1) * 10, paginaAtual * 10);
  const totalFolhas = folhas.length;
  const totalLiquido = folhas.reduce((acc, f) => acc + (f.totais?.totalLiquido || 0), 0);

  if (redirecting) {
    return (
      <Layout title="Folha Salarial" showBackButton={true} backToRoute="/menu">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-6 text-center max-w-sm mx-4">
            <Loader2 className="animate-spin text-green-400 mx-auto mb-4" size={40} />
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingEmpresas) {
    return (
      <Layout title="Folha Salarial" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Folha Salarial" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && !redirecting && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : mensagem.tipo === "info" ? "bg-blue-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : mensagem.tipo === "info" ? <Info className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => { carregarFolhas(); carregarFuncionarios(); }}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa"}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ano</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white" value={periodo.ano} onChange={(e) => setPeriodo({...periodo, ano: parseInt(e.target.value)})}>
                    {[2023,2024,2025,2026].map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mês</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white" value={periodo.mes} onChange={(e) => setPeriodo({...periodo, mes: parseInt(e.target.value)})}>
                    {meses.map((mes,i) => <option key={i} value={i+1}>{mes}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <button onClick={calcularFolha} disabled={calculando} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {calculando ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                    {calculando ? "Calculando..." : "Calcular Folha"}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => setMostrarConfigBanco(true)} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <Settings size={16} /> Configurar Ficheiro de Pagamento
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div><p className="text-gray-400 text-sm">Funcionários</p><p className="text-2xl font-bold text-white">{funcionarios.length}</p></div>
                  <Users className="text-blue-400" size={28} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div><p className="text-gray-400 text-sm">Total Líquido</p><p className="text-lg font-bold text-green-400">{formatarNumero(totalLiquido)} Kz</p></div>
                  <DollarSign className="text-green-400" size={28} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div><p className="text-gray-400 text-sm">Folhas Geradas</p><p className="text-2xl font-bold text-white">{totalFolhas}</p></div>
                  <FileText className="text-purple-400" size={28} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div><p className="text-gray-400 text-sm">Finalizadas</p><p className="text-2xl font-bold text-white">{folhas.filter(f => f.status === "finalizado").length}</p></div>
                  <CheckSquare className="text-yellow-400" size={28} />
                </div>
              </div>
            </div>

            {/* Abas: Folhas | Avenças e Adiantamentos */}
            <div className="flex border-b border-gray-700">
              <button onClick={() => setAbaAtiva("folhas")} className={`px-6 py-3 text-sm font-medium transition-all ${abaAtiva === "folhas" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-white"}`}>
                <FileText size={16} className="inline mr-2" />Folhas Salariais
              </button>
              <button onClick={() => setAbaAtiva("avencas")} className={`px-6 py-3 text-sm font-medium transition-all ${abaAtiva === "avencas" ? "border-b-2 border-green-500 text-green-400" : "text-gray-400 hover:text-white"}`}>
                <CreditCard size={16} className="inline mr-2" />Avenças e Adiantamentos
              </button>
            </div>

            {abaAtiva === "avencas" ? (
              <div className="space-y-4">
                {/* Cards Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
                    <p className="text-blue-300 text-xs">Adiantamentos</p>
                    <p className="text-xl font-bold text-white">{avencasResumo.totalAdiantamentos}</p>
                    <p className="text-xs text-gray-400">Valor: {formatarNumero(avencasResumo.valorAdiantamentos)} Kz</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                    <p className="text-purple-300 text-xs">Avenças</p>
                    <p className="text-xl font-bold text-white">{avencasResumo.totalAvencas}</p>
                    <p className="text-xs text-gray-400">Valor: {formatarNumero(avencasResumo.valorAvencas)} Kz</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/30">
                    <p className="text-yellow-300 text-xs">Valor Pendente</p>
                    <p className="text-xl font-bold text-yellow-400">{formatarNumero(avencasResumo.valorPendente)} Kz</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                    <p className="text-green-300 text-xs">Total Pago</p>
                    <p className="text-xl font-bold text-green-400">{formatarNumero(avencasResumo.valorAdiantamentosPago + avencasResumo.valorAvencasPago)} Kz</p>
                  </div>
                </div>

                {/* Botão Novo */}
                <div className="flex justify-end">
                  <button onClick={() => { resetFormAvenca(); setEditandoAvenca(null); setShowModalAvenca(true); }} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-2.5 rounded-xl transition flex items-center gap-2 text-sm">
                    <CreditCard size={16} /> Novo Adiantamento / Avença
                  </button>
                </div>

                {/* Tabela */}
                {avencas.length === 0 ? (
                  <div className="bg-gray-800 rounded-2xl p-12 text-center">
                    <CreditCard className="mx-auto mb-4 text-gray-500" size={48} />
                    <p className="text-gray-400">Nenhum registo de avença ou adiantamento</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700"><tr className="text-white text-sm">
                          <th className="p-3 text-left">Data</th><th className="p-3 text-left">Funcionário</th>
                          <th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Valor</th>
                          <th className="p-3 text-right">Pago</th><th className="p-3 text-right">Saldo</th>
                          <th className="p-3 text-center">Parcelas</th><th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr></thead>
                        <tbody>
                          {avencas.map(a => (
                            <tr key={a._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                              <td className="p-3 text-gray-300 text-sm">{new Date(a.dataSolicitacao).toLocaleDateString()}</td>
                              <td className="p-3 text-white font-medium text-sm">{a.funcionarioNome}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${a.tipo === 'AdiantamentoSalarial' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                  {a.tipo === 'AdiantamentoSalarial' ? 'Adiantamento' : 'Avença'}
                                </span>
                              </td>
                              <td className="p-3 text-right text-green-400 text-sm">{formatarNumero(a.valor)} Kz</td>
                              <td className="p-3 text-right text-gray-300 text-sm">{formatarNumero(a.valorPago)} Kz</td>
                              <td className="p-3 text-right text-yellow-400 text-sm">{formatarNumero(a.saldoRestante)} Kz</td>
                              <td className="p-3 text-center text-gray-300 text-sm">{a.parcelaAtual}/{a.numeroParcelas}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusAvencaColor(a.status)}`}>{a.status}</span>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex justify-center gap-1">
                                  <button onClick={() => { setEditandoAvenca(a._id); setAvencaForm({...a}); setShowModalAvenca(true); }} className="p-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 rounded" title="Editar">
                                    <Edit size={14} className="text-yellow-400" />
                                  </button>
                                  {a.status !== 'Pago' && a.status !== 'Cancelado' && (
                                    <button onClick={() => integrarAvencaFolha(a._id)} className="p-1.5 bg-purple-600/20 hover:bg-purple-600/40 rounded" title="Integrar na folha">
                                      <TrendingUp size={14} className="text-purple-400" />
                                    </button>
                                  )}
                                  <button onClick={() => excluirAvenca(a._id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded" title="Excluir">
                                    <Trash2 size={14} className="text-red-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal Novo/Editar Avença */}
                {showModalAvenca && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md">
                      <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-blue-400">{editandoAvenca ? "Editar" : "Novo"} Adiantamento / Avença</h2>
                        <button onClick={() => { setShowModalAvenca(false); setEditandoAvenca(null); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                      </div>
                      <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                        <div>
                          <label className="block text-gray-300 mb-1">Funcionário *</label>
                          <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={avencaForm.funcionarioId} onChange={(e) => setAvencaForm({...avencaForm, funcionarioId: e.target.value})} disabled={!!editandoAvenca}>
                            <option value="">Selecione</option>
                            {funcionarios.map(f => <option key={f._id} value={f._id}>{f.nome}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Tipo *</label>
                          <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={avencaForm.tipo} onChange={(e) => setAvencaForm({...avencaForm, tipo: e.target.value})}>
                            <option value="AdiantamentoSalarial">Adiantamento Salarial</option>
                            <option value="Avenca">Avença</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Valor (Kz) *</label>
                          <input type="number" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={avencaForm.valor} onChange={(e) => {
                            const val = e.target.value;
                            setAvencaForm({...avencaForm, valor: val, valorParcela: parseFloat(val) / (parseInt(avencaForm.numeroParcelas) || 1)});
                          }} />
                          {avencaForm.tipo === 'AdiantamentoSalarial' && avencaForm.funcionarioId && (
                            <p className="text-xs text-yellow-400 mt-1">Limite: 70% do salário base</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Motivo / Descrição</label>
                          <textarea rows={2} className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" value={avencaForm.motivo} onChange={(e) => setAvencaForm({...avencaForm, motivo: e.target.value})} placeholder="Justificativa..." />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1">Data de Vencimento</label>
                          <input type="date" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={avencaForm.dataVencimento} onChange={(e) => setAvencaForm({...avencaForm, dataVencimento: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-300 mb-1">Parcelas</label>
                            <input type="number" min="1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={avencaForm.numeroParcelas} onChange={(e) => {
                              const parcelas = parseInt(e.target.value) || 1;
                              setAvencaForm({...avencaForm, numeroParcelas: parcelas, valorParcela: parseFloat(avencaForm.valor || 0) / parcelas});
                            }} />
                          </div>
                          <div>
                            <label className="block text-gray-300 mb-1">Periodicidade</label>
                            <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" value={avencaForm.periodicidade} onChange={(e) => setAvencaForm({...avencaForm, periodicidade: e.target.value})}>
                              <option value="Unico">Único</option>
                              <option value="Mensal">Mensal</option>
                              <option value="Semanal">Semanal</option>
                            </select>
                          </div>
                        </div>
                        <button onClick={handleSalvarAvenca} disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 rounded-xl transition disabled:opacity-50">
                          {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (editandoAvenca ? "Atualizar" : "Registrar")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-blue-400" size={40} /></div>
            ) : folhas.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center"><Calendar className="mx-auto mb-4 text-gray-500" size={48} /><p className="text-gray-400">Nenhuma folha encontrada</p></div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700"><tr className="text-white text-sm">
                      <th className="p-3 text-left">Período</th><th className="p-3 text-center">Func</th><th className="p-3 text-right">Total Salários</th>
                      <th className="p-3 text-right">INSS</th><th className="p-3 text-right">IRT</th><th className="p-3 text-right">Total Líquido</th>
                      <th className="p-3 text-center">Status</th><th className="p-3 text-center">Data</th><th className="p-3 text-center">Ações</th>
                    </tr></thead>
                    <tbody>
                      {folhasPaginadas.map(f => (
                        <tr key={f._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-3 text-white">{meses[f.mesReferencia-1]} / {f.anoReferencia}</td>
                          <td className="p-3 text-center text-gray-300">{f.funcionarios?.length || 0}</td>
                          <td className="p-3 text-right text-gray-300">{formatarNumero(f.totais?.totalSalarios)} Kz</td>
                          <td className="p-3 text-right text-orange-400">{formatarNumero(f.totais?.totalINSSColaborador)} Kz</td>
                          <td className="p-3 text-right text-purple-400">{formatarNumero(f.totais?.totalIRT)} Kz</td>
                          <td className="p-3 text-right font-bold text-green-400">{formatarNumero(f.totais?.totalLiquido)} Kz</td>
                          <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${f.status==="finalizado"?"bg-green-600/20 text-green-400":"bg-yellow-600/20 text-yellow-400"}`}>{f.status==="finalizado"?"Finalizado":"Rascunho"}</span></td>
                          <td className="p-3 text-center text-gray-400 text-xs">{new Date(f.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-center"><div className="flex justify-center gap-1">
                            <button onClick={() => verDetalhes(f._id)} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded"><Eye size={14} className="text-blue-400" /></button>
                            {f.status !== "finalizado" && (<><button onClick={() => finalizarFolha(f._id)} className="p-1.5 bg-green-600/20 hover:bg-green-600/40 rounded"><CheckSquare size={14} className="text-green-400" /></button><button onClick={() => excluirFolha(f._id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded"><Trash2 size={14} className="text-red-400" /></button></>)}
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-3 border-t border-gray-700">
                    <button onClick={() => setPaginaAtual(p=>Math.max(1,p-1))} disabled={paginaAtual===1} className="p-1.5 bg-gray-700 rounded disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <span className="text-gray-400 text-sm">Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaAtual(p=>Math.min(totalPaginas,p+1))} disabled={paginaAtual===totalPaginas} className="p-1.5 bg-gray-700 rounded disabled:opacity-50"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalhes com Recibos individuais e em lote */}
      {detalhes && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Detalhes da Folha</h2>
              <button onClick={() => setDetalhes(null)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-gray-400">Período</p><p className="text-white">{meses[detalhes.mesReferencia-1]} / {detalhes.anoReferencia}</p></div>
                  <div><p className="text-xs text-gray-400">Funcionários</p><p className="text-white">{detalhes.funcionarios?.length || 0}</p></div>
                  <div><p className="text-xs text-gray-400">Status</p><p className="text-yellow-400">{detalhes.status}</p></div>
                  <div><p className="text-xs text-gray-400">Data</p><p className="text-white">{new Date(detalhes.createdAt).toLocaleDateString()}</p></div>
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-blue-400 mb-3">Resumo Financeiro</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Total Salários</p><p className="text-sm font-bold text-white">{formatarNumero(detalhes.totais?.totalSalarios)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Total Faltas</p><p className="text-sm font-bold text-red-400">{formatarNumero(detalhes.totais?.totalFaltas)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Subs. Alimentação</p><p className="text-sm font-bold text-blue-400">{formatarNumero(detalhes.totais?.totalAbonosAlimentacao)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Subs. Transporte</p><p className="text-sm font-bold text-cyan-400">{formatarNumero(detalhes.totais?.totalAbonosTransporte)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Subs. Férias</p><p className="text-sm font-bold text-indigo-400">{formatarNumero(detalhes.totais?.totalAbonosFerias)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Décimo Terceiro</p><p className="text-sm font-bold text-pink-400">{formatarNumero(detalhes.totais?.totalAbonosDecimoTerceiro)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">INSS Colaborador</p><p className="text-sm font-bold text-orange-400">{formatarNumero(detalhes.totais?.totalINSSColaborador)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">INSS Empregador</p><p className="text-sm font-bold text-blue-400">{formatarNumero(detalhes.totais?.totalINSSEmpregador)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Total IRT</p><p className="text-sm font-bold text-red-400">{formatarNumero(detalhes.totais?.totalIRT)} Kz</p></div>
                  {(detalhes.totais?.totalAvencas > 0 || detalhes.totais?.totalAdiantamentos > 0) && (
                    <>
                      <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">(-) Avenças</p><p className="text-sm font-bold text-yellow-400">-{formatarNumero(detalhes.totais?.totalAvencas)} Kz</p></div>
                      <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">(-) Adiantamentos</p><p className="text-sm font-bold text-orange-400">-{formatarNumero(detalhes.totais?.totalAdiantamentos)} Kz</p></div>
                    </>
                  )}
                  <div className="p-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded col-span-2 md:col-span-3"><p className="text-xs text-gray-400">Total Líquido</p><p className="text-lg font-bold text-green-400">{formatarNumero(detalhes.totais?.totalLiquido)} Kz</p></div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button onClick={exportarPDFProfissional} disabled={exportando} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Download size={16} /> {exportando ? "Exportando..." : "Exportar Folha em PDF"}</button>
                <button onClick={gerarRecibosEmLote} disabled={exportando} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><FileText size={16} /> Baixar Todos os Recibos</button>
                <button onClick={abrirModalBanco} disabled={exportando || detalhes.status !== "finalizado"} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${detalhes.status === "finalizado" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 cursor-not-allowed opacity-50"}`}><Banknote size={16} /> Exportar Ficheiro de Pagamento</button>
              </div>
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-yellow-400 mb-3">Funcionários</h3>
                <div className="mb-4">
                  <input 
                    type="text" 
                    placeholder="🔍 Filtrar por nome ou cargo..." 
                    className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                    value={filtroFuncionario}
                    onChange={(e) => setFiltroFuncionario(e.target.value)}
                  />
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-700 sticky top-0"><tr className="text-white">
                      <th className="p-2 text-left">Nome</th><th className="p-2 text-left">Função</th><th className="p-2 text-right">Salário</th>
                      <th className="p-2 text-right">Alim</th><th className="p-2 text-right">Transp</th><th className="p-2 text-right">Férias</th>
                      <th className="p-2 text-right">Avenças</th><th className="p-2 text-right">Adiant</th>
                      <th className="p-2 text-right">Faltas</th><th className="p-2 text-right">INSS</th><th className="p-2 text-right">IRT</th>
                      <th className="p-2 text-right">Líquido</th><th className="p-2 text-left">IBAN</th><th className="p-2 text-center">Ações</th>
                    </tr></thead>
                    <tbody>
                      {detalhes.funcionarios?.filter(f => 
                        f.nome?.toLowerCase().includes(filtroFuncionario.toLowerCase()) ||
                        (f.cargo || f.funcao || "")?.toLowerCase().includes(filtroFuncionario.toLowerCase())
                      ).map((f, idx) => (
                        <tr key={idx} className="border-t border-gray-600">
                          <td className="p-2 text-white font-medium">{f.nome}</td>
                          <td className="p-2 text-gray-300">{f.cargo || f.funcao || "-"}</td>
                          <td className="p-2 text-right text-gray-300">{formatarNumero(f.salarioBase)} Kz</td>
                          <td className="p-2 text-right text-blue-400">{formatarNumero(f.totalAbonosAlimentacao)}</td>
                          <td className="p-2 text-right text-cyan-400">{formatarNumero(f.totalAbonosTransporte)}</td>
                          <td className="p-2 text-right text-indigo-400">{formatarNumero(f.totalAbonosFerias)}</td>
                          <td className="p-2 text-right text-yellow-400">{formatarNumero(f.totalAvencas)}</td>
                          <td className="p-2 text-right text-orange-400">{formatarNumero(f.totalAdiantamentos)}</td>
                          <td className="p-2 text-right text-red-400">{formatarNumero(f.valorFaltas)}</td>
                          <td className="p-2 text-right text-orange-400">{formatarNumero(f.inssColaborador)}</td>
                          <td className="p-2 text-right text-purple-400">{formatarNumero(f.irt)}</td>
                          <td className="p-2 text-right font-bold text-green-400">{formatarNumero(f.salarioLiquido)} Kz</td>
                          <td className="p-2 text-gray-400 text-xs">{f.iban || "-"}</td>
                          <td className="p-2 text-center"><div className="flex gap-1 justify-center">
                            <button onClick={() => gerarReciboIndividual(f, detalhes)} className="p-1.5 bg-green-600/20 hover:bg-green-600/40 rounded" title="Imprimir recibo"><Printer size={14} className="text-green-400" /></button>
                            <button onClick={() => enviarReciboEmail(f)} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded" title="Enviar por e-mail (em breve)"><Mail size={14} className="text-blue-400" /></button>
                            <button onClick={() => enviarReciboWhatsApp(f)} className="p-1.5 bg-green-600/20 hover:bg-green-600/40 rounded" title="Enviar por WhatsApp (em breve)"><MessageCircle size={14} className="text-green-400" /></button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <button onClick={() => setDetalhes(null)} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {showBancoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700">
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><Banknote className="w-5 h-5 text-white" /></div><div><h3 className="text-xl font-bold text-white">Exportar Ficheiro de Pagamento</h3><p className="text-sm text-gray-400">Selecione o banco</p></div></div><button onClick={() => setShowBancoModal(false)} className="p-1 rounded-lg hover:bg-gray-700"><X className="w-6 h-6 text-gray-400" /></button></div>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-gray-300 text-sm mb-4">Escolha o banco para o formato do ficheiro.</p>
              {bancosDisponiveis.map(banco => (
                <button key={banco.codigo} onClick={() => { setShowBancoModal(false); exportarFicheiroPagamento(banco.codigo); }} className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-all border border-gray-600 hover:border-blue-500">
                  <div className="flex items-center gap-3"><Banknote size={20} className="text-blue-400" /><div className="text-left"><p className="text-white font-medium">{banco.nome}</p><p className="text-xs text-gray-400">Código: {banco.codigo}</p></div></div><Download size={18} className="text-green-400" />
                </button>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end"><button onClick={() => setShowBancoModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white">Cancelar</button></div>
          </div>
        </div>
      )}

      <ConfiguracaoBanco isOpen={mostrarConfigBanco} onClose={() => setMostrarConfigBanco(false)} empresaId={empresaSelecionada} onSalvar={() => mostrarMensagem("Configuração salva! Use na exportação.", "sucesso")} />

      <style jsx>{`
        @keyframes fade-in-out { 0% { opacity: 0; transform: translateY(-20px); } 10% { opacity: 1; transform: translateY(0); } 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default FolhaSalarial;