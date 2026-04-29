// frontend/src/pages/FolhaSalarial.jsx - VERSAO SIMPLIFICADA SEM REGIMES
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
  Coffee, Bus, Umbrella, Gift, Settings,Banknote
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  
  const { user, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const formatarNumero = (valor) => {
    if (!valor && valor !== 0) return "0,00";
    const num = Number(valor);
    if (isNaN(num)) return "0,00";
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
    } else {
      setFolhas([]);
      setFuncionarios([]);
      setDadosEmpresa(null);
      setGestorEmpresa(null);
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
    const dataSalario = prompt(
      "Data de vencimento do SALARIO (dia do mes):\n\nExemplo: 15\nDeixe em branco para usar o dia 15",
      "15"
    );
    if (dataSalario === null) return;
    
    const dataINSS = prompt(
      "Data de vencimento do INSS (dia do mes):\n\nExemplo: 20\nDeixe em branco para usar o dia 20",
      "20"
    );
    if (dataINSS === null) return;
    
    const dataIRT = prompt(
      "Data de vencimento do IRT (dia do mes):\n\nExemplo: 25\nDeixe em branco para usar o dia 25",
      "25"
    );
    if (dataIRT === null) return;
    
    const contaDebito = prompt(
      "Conta bancaria para debito:\n\nExemplos: BAI01, BFA01, BIC01\nDeixe em branco para usar BAI01",
      "BAI01"
    );
    if (contaDebito === null) return;
    
    if (!window.confirm(
      "CONFIRMACAO DA FOLHA SALARIAL\n\n" +
      `Datas de vencimento:\n   - Salario: dia ${dataSalario}\n   - INSS: dia ${dataINSS}\n   - IRT: dia ${dataIRT}\n\n` +
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
            salario: parseInt(dataSalario),
            inss: parseInt(dataINSS),
            irt: parseInt(dataIRT)
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
    
    const nomeEmpresa = detalhes.empresaNome || "Empresa";
    const nifEmpresa = detalhes.empresaNif || "---";
    
    // ============================================
    // CABEÇALHO - PÁGINA 1
    // ============================================
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("FOLHA SALARIAL", 148.5, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(nomeEmpresa, 148.5, 23, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${meses[detalhes.mesReferencia - 1]} / ${detalhes.anoReferencia}`, 148.5, 30, { align: "center" });
    
    doc.setDrawColor(37, 99, 235);
    doc.line(15, 35, 282, 35);
    
    // Informações da empresa
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`NIF: ${nifEmpresa}`, 15, 42);
    doc.text(`Data: ${dataAtual.toLocaleDateString("pt-AO")}`, 100, 42);
    doc.text(`Status: ${detalhes.status === "finalizado" ? "FINALIZADO" : "RASCUNHO"}`, 200, 42);
    doc.text(`Regime INSS: ${detalhes.regimeINSS || "Normal"}`, 15, 48);
    
    // ============================================
    // RESUMO FINANCEIRO (COMPACTO)
    // ============================================
    const totais = detalhes.totais || {};
    let y = 55;
    
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
      { label: "INSS Colaborador:", valor: formatarNumero(totais.totalINSSColaborador) },
      { label: "INSS Empregador:", valor: formatarNumero(totais.totalINSSEmpregador) },
      { label: "Total IRT:", valor: formatarNumero(totais.totalIRT) }
    ];
    
    // Layout em 3 colunas para caber melhor
    const colWidth = 90;
    const startX = [15, 105, 195];
    
    resumoItems.forEach((item, index) => {
      const col = Math.floor(index / 4); // 4 itens por coluna
      const row = index % 4;
      const x = startX[col];
      const yy = y + (row * 4.5);
      
      doc.setFont("helvetica", "bold");
      doc.text(item.label, x, yy);
      doc.setFont("helvetica", "normal");
      doc.text(`${item.valor} Kz`, x + 40, yy);
    });
    
    y += 22;
    
    // Total Líquido (destaque)
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 255, 244);
    doc.rect(15, y - 2, 270, 8, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text(`TOTAL LÍQUIDO A PAGAR: ${formatarNumero(totais.totalLiquido)} Kz`, 148.5, y + 3, { align: "center" });
    
    y += 12;
    
    // ============================================
    // TABELA DE FUNCIONÁRIOS (COM QUEBRA DE PÁGINA)
    // ============================================
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("DETALHES DOS FUNCIONÁRIOS", 15, y);
    
    const funcionariosData = detalhes.funcionarios?.map(f => [
      f.nome || "-",
      f.cargo || "-",
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
    
   // ============================================
// TABELA DE FUNCIONÁRIOS (COM QUEBRA DE PÁGINA FORÇADA)
// ============================================
autoTable(doc, {
  startY: y + 3,
  head: [[
    "Funcionário", "Função", "Salário", "Alim", "Transp", 
    "Férias", "Faltas", "INSS", "IRT", "Líquido", "IBAN"
  ]],
  body: funcionariosData,
  theme: "grid",
  
  // 🔥 CONFIGURAÇÕES CRÍTICAS PARA QUEBRA DE PÁGINA 🔥
  styles: { 
    fontSize: 6.5, 
    cellPadding: 1.5, 
    halign: "right",
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    overflow: 'linebreak',
    minCellHeight: 6,        // Altura mínima da célula
  },
  
  headStyles: { 
    fillColor: [37, 99, 235], 
    textColor: [255, 255, 255], 
    fontStyle: "bold", 
    fontSize: 6.5, 
    halign: "center",
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    minCellHeight: 8,
  },
  
  bodyStyles: {
    lineColor: [0, 0, 0],
    lineWidth: 0.1,
    minCellHeight: 6,
  },
  
  alternateRowStyles: {
    fillColor: [245, 247, 250]
  },
  
  // 🔥 QUEBRA DE PÁGINA - CONFIGURAÇÃO ESSENCIAL 🔥
  showHead: 'everyPage',           // Repete cabeçalho em cada página
  didParseCell: function(data) {
    // Ajusta altura da linha baseado no conteúdo
    if (data.row.section === 'body') {
      const text = data.cell.text.join(' ');
      if (text.length > 20) {
        data.cell.styles.minCellHeight = 8;
      }
    }
  },
  
  didDrawPage: function(data) {
    // Rodapé em CADA página
    const pageNumber = doc.internal.getNumberOfPages();
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(`Folha Salarial - ${nomeEmpresa} - ${meses[detalhes.mesReferencia - 1]}/${detalhes.anoReferencia}`, 15, 203);
    doc.text(`Página ${pageNumber}`, 280, 203, { align: "right" });
    doc.text(`© ${new Date().getFullYear()} SIREXA - One Platform`, 15, 207);
  },
  
  // 🔥 MARGENS - ESSENCIAIS PARA QUEBRA 🔥
  margin: { 
    top: 5, 
    right: 10, 
    bottom: 15,    // Espaço para o rodapé
    left: 10 
  },
  
  tableWidth: 277,
  tableLineColor: [0, 0, 0],
  tableLineWidth: 0.1,
  
  // 🔥 FORÇAR QUEBRA DE LINHA E PÁGINA 🔥
  rowPageBreak: 'auto',          // Quebra de página automática por linha
  pageBreak: 'auto',             // Quebra de página automática
  
  // 🔥 ESTAS SÃO AS CONFIGURAÇÕES MAIS IMPORTANTES 🔥
  willDrawCell: function(data) {
    // Verifica se a célula cabe na página atual
    const row = data.row;
    const pageHeight = doc.internal.pageSize.height;
    const currentY = data.cell.y + data.cell.height;
    
    // Se a linha atual + próxima não couber, força quebra
    if (currentY > pageHeight - 20 && row.index < funcionariosData.length - 1) {
      // Não faz nada - o autoTable cuida disso
    }
  },
  
  columnStyles: {
    0: { cellWidth: 35, halign: "left" },
    1: { cellWidth: 25, halign: "left" },
    2: { cellWidth: 18, halign: "right" },
    3: { cellWidth: 13, halign: "right" },
    4: { cellWidth: 13, halign: "right" },
    5: { cellWidth: 13, halign: "right" },
    6: { cellWidth: 13, halign: "right" },
    7: { cellWidth: 15, halign: "right" },
    8: { cellWidth: 15, halign: "right" },
    9: { cellWidth: 18, halign: "right" },
    10: { cellWidth: 35, halign: "left" }
  }
});

    
    // ============================================
    // ASSINATURAS (APÓS A TABELA)
    // ============================================
    const assinaturaY = doc.lastAutoTable.finalY + 15;
    
    // Verificar se precisa de nova página para assinaturas
    if (assinaturaY > 185) {
      doc.addPage();
    }
    
    const assY = assinaturaY > 185 ? 30 : assinaturaY;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    
    // Linha de assinatura do Gestor
    doc.line(30, assY, 130, assY);
    doc.setFont("helvetica", "bold");
    doc.text("Assinatura do Gestor", 80, assY - 3, { align: "center" });
    
    // Linha de assinatura do Técnico RH
    doc.line(160, assY, 260, assY);
    doc.setFont("helvetica", "bold");
    doc.text("Assinatura do Técnico RH", 210, assY - 3, { align: "center" });
    
    // Rodapé final (apenas se não usou didDrawPage)
    if (doc.internal.getNumberOfPages() === 1) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(`Gerado por: ${user?.nome || user?.email || "Sistema"}`, 148.5, 195, { align: "center" });
      doc.text(`© ${new Date().getFullYear()} SIREXA - One Platform`, 148.5, 200, { align: "center" });
    }
    
    doc.save(`Folha_Salarial_${nomeEmpresa}_${meses[detalhes.mesReferencia - 1]}_${detalhes.anoReferencia}.pdf`);
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
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        codigoBanco: codigoBanco,
        empresaId: empresaSelecionada
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || "Erro ao exportar ficheiro");
    }

    // Obter o blob do arquivo
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    // Extrair nome do arquivo do header Content-Disposition
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `pagamento_${codigoBanco}_${detalhes.empresaNome}_${meses[detalhes.mesReferencia - 1]}_${detalhes.anoReferencia}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    mostrarMensagem(`Ficheiro de pagamento ${codigoBanco} exportado com sucesso!`, "sucesso");
  } catch (error) {
    console.error("Erro ao exportar ficheiro:", error);
    mostrarMensagem(error.message || "Erro ao exportar ficheiro de pagamento", "erro");
  } finally {
    setExportando(false);
  }
};

// Adicione esta função para mostrar o modal de seleção do banco
const [showBancoModal, setShowBancoModal] = useState(false);
const bancosDisponiveis = [
  { codigo: "BAI", nome: "Banco Angolano de Investimentos (BAI)" },
  { codigo: "BFA", nome: "Banco de Fomento Angola (BFA)" },
  { codigo: "BIC", nome: "Banco BIC" },
  { codigo: "KEVE", nome: "Banco Keve" },
  { codigo: "SOL", nome: "Banco Sol" },
  { codigo: "ECONOMICO", nome: "Banco Económico" },
  { codigo: "YETU", nome: "Banco Yetu" }
];

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
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
                  <select 
                    className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white"
                    value={periodo.ano} 
                    onChange={(e) => setPeriodo({...periodo, ano: parseInt(e.target.value)})}
                  >
                    {[2023, 2024, 2025, 2026].map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mês</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white"
                    value={periodo.mes} 
                    onChange={(e) => setPeriodo({...periodo, mes: parseInt(e.target.value)})}
                  >
                    {meses.map((mes, i) => <option key={i} value={i+1}>{mes}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white"
                    value={statusFiltro} 
                    onChange={(e) => setStatusFiltro(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <button 
                    onClick={calcularFolha} 
                    disabled={calculando} 
                    className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {calculando ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                    {calculando ? "Calculando..." : "Calcular Folha"}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setMostrarConfigBanco(true)}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <Settings size={16} /> Configurar Ficheiro de Pagamento
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Funcionários</p>
                    <p className="text-2xl font-bold text-white">{funcionarios.length}</p>
                  </div>
                  <Users className="text-blue-400" size={28} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Líquido</p>
                    <p className="text-lg font-bold text-green-400">{formatarNumero(totalLiquido)} Kz</p>
                  </div>
                  <DollarSign className="text-green-400" size={28} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Folhas Geradas</p>
                    <p className="text-2xl font-bold text-white">{totalFolhas}</p>
                  </div>
                  <FileText className="text-purple-400" size={28} />
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Finalizadas</p>
                    <p className="text-2xl font-bold text-white">{folhas.filter(f => f.status === "finalizado").length}</p>
                  </div>
                  <CheckSquare className="text-yellow-400" size={28} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
              </div>
            ) : folhas.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-12 text-center">
                <Calendar className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400">Nenhuma folha encontrada</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr className="text-white text-sm">
                        <th className="p-3 text-left">Período</th>
                        <th className="p-3 text-center">Func</th>
                        <th className="p-3 text-right">Total Salários</th>
                        <th className="p-3 text-right">INSS</th>
                        <th className="p-3 text-right">IRT</th>
                        <th className="p-3 text-right">Total Líquido</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Data</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folhasPaginadas.map(f => (
                        <tr key={f._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                          <td className="p-3 text-white">{meses[f.mesReferencia - 1]} / {f.anoReferencia}</td>
                          <td className="p-3 text-center text-gray-300">{f.funcionarios?.length || 0}</td>
                          <td className="p-3 text-right text-gray-300">{formatarNumero(f.totais?.totalSalarios)} Kz</td>
                          <td className="p-3 text-right text-orange-400">{formatarNumero(f.totais?.totalINSSColaborador)} Kz</td>
                          <td className="p-3 text-right text-purple-400">{formatarNumero(f.totais?.totalIRT)} Kz</td>
                          <td className="p-3 text-right font-bold text-green-400">{formatarNumero(f.totais?.totalLiquido)} Kz</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${f.status === "finalizado" ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"}`}>
                              {f.status === "finalizado" ? "Finalizado" : "Rascunho"}
                            </span>
                          </td>
                          <td className="p-3 text-center text-gray-400 text-xs">{new Date(f.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={() => verDetalhes(f._id)} className="p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded transition">
                                <Eye size={14} className="text-blue-400" />
                              </button>
                              {f.status !== "finalizado" && (
                                <>
                                  <button onClick={() => finalizarFolha(f._id)} className="p-1.5 bg-green-600/20 hover:bg-green-600/40 rounded transition">
                                    <CheckSquare size={14} className="text-green-400" />
                                  </button>
                                  <button onClick={() => excluirFolha(f._id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded transition">
                                    <Trash2 size={14} className="text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-3 border-t border-gray-700">
                    <button onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="p-1.5 bg-gray-700 rounded disabled:opacity-50">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-gray-400 text-sm">Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="p-1.5 bg-gray-700 rounded disabled:opacity-50">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalhes - SIMPLIFICADO SEM REGIMES */}
      {detalhes && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Detalhes da Folha</h2>
              <button onClick={() => setDetalhes(null)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Informações Gerais */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-gray-400">Período</p><p className="text-white">{meses[detalhes.mesReferencia - 1]} / {detalhes.anoReferencia}</p></div>
                  <div><p className="text-xs text-gray-400">Funcionários</p><p className="text-white">{detalhes.funcionarios?.length || 0}</p></div>
                  <div><p className="text-xs text-gray-400">Status</p><p className="text-yellow-400">{detalhes.status}</p></div>
                  <div><p className="text-xs text-gray-400">Data</p><p className="text-white">{new Date(detalhes.createdAt).toLocaleDateString()}</p></div>
                </div>
              </div>
              
              {/* Resumo Financeiro */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-blue-400 mb-3">Resumo Financeiro</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Total Salários</p><p className="text-sm font-bold text-white">{formatarNumero(detalhes.totais?.totalSalarios)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Total Faltas</p><p className="text-sm font-bold text-red-400">{formatarNumero(detalhes.totais?.totalFaltas)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Subsídio Alimentação</p><p className="text-sm font-bold text-blue-400">{formatarNumero(detalhes.totais?.totalAbonosAlimentacao)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Subsídio Transporte</p><p className="text-sm font-bold text-cyan-400">{formatarNumero(detalhes.totais?.totalAbonosTransporte)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Subsídio Férias</p><p className="text-sm font-bold text-indigo-400">{formatarNumero(detalhes.totais?.totalAbonosFerias)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Décimo Terceiro</p><p className="text-sm font-bold text-pink-400">{formatarNumero(detalhes.totais?.totalAbonosDecimoTerceiro)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">INSS Colaborador</p><p className="text-sm font-bold text-orange-400">{formatarNumero(detalhes.totais?.totalINSSColaborador)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">INSS Empregador</p><p className="text-sm font-bold text-blue-400">{formatarNumero(detalhes.totais?.totalINSSEmpregador)} Kz</p></div>
                  <div className="p-2 bg-gray-800/50 rounded"><p className="text-xs text-gray-400">Total IRT</p><p className="text-sm font-bold text-red-400">{formatarNumero(detalhes.totais?.totalIRT)} Kz</p></div>
                  <div className="p-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded col-span-2 md:col-span-3"><p className="text-xs text-gray-400">Total Líquido</p><p className="text-lg font-bold text-green-400">{formatarNumero(detalhes.totais?.totalLiquido)} Kz</p></div>
                </div>
              </div>
              
              {/* Botões de Exportação */}
<div className="flex justify-end gap-3">
  <button 
    onClick={exportarPDFProfissional} 
    disabled={exportando} 
    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
  >
    <Download size={16} /> {exportando ? "Exportando..." : "Exportar Folha em PDF"}
  </button>
  
  {/* Botão para exportar ficheiro de pagamento bancário */}
  <button 
    onClick={abrirModalBanco} 
    disabled={exportando || detalhes.status !== "finalizado"} 
    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
      detalhes.status === "finalizado" 
        ? "bg-blue-600 hover:bg-blue-700" 
        : "bg-gray-600 cursor-not-allowed opacity-50"
    }`}
  >
    <Banknote size={16} /> Exportar Ficheiro de Pagamento
  </button>
</div>
              
              {/* Tabela de Funcionários - COMPLETA */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-yellow-400 mb-3">Funcionários</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr className="text-white">
                        <th className="p-2 text-left">Nome</th>
                        <th className="p-2 text-left">Função</th>
                        <th className="p-2 text-right">Salário</th>
                        <th className="p-2 text-right">Alim</th>
                        <th className="p-2 text-right">Transp</th>
                        <th className="p-2 text-right">Férias</th>
                        <th className="p-2 text-right">Faltas</th>
                        <th className="p-2 text-right">INSS</th>
                        <th className="p-2 text-right">IRT</th>
                        <th className="p-2 text-right">Líquido</th>
                        <th className="p-2 text-left">IBAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalhes.funcionarios?.map((f, idx) => (
                        <tr key={idx} className="border-t border-gray-600">
                          <td className="p-2 text-white font-medium">{f.nome}</td>
                          <td className="p-2 text-gray-300">{f.cargo || "-"}</td>
                          <td className="p-2 text-right text-gray-300">{formatarNumero(f.salarioBase)} Kz</td>
                          <td className="p-2 text-right text-blue-400">{formatarNumero(f.totalAbonosAlimentacao)}</td>
                          <td className="p-2 text-right text-cyan-400">{formatarNumero(f.totalAbonosTransporte)}</td>
                          <td className="p-2 text-right text-indigo-400">{formatarNumero(f.totalAbonosFerias)}</td>
                          <td className="p-2 text-right text-red-400">{formatarNumero(f.valorFaltas)}</td>
                          <td className="p-2 text-right text-orange-400">{formatarNumero(f.inssColaborador)}</td>
                          <td className="p-2 text-right text-purple-400">{formatarNumero(f.irt)}</td>
                          <td className="p-2 text-right font-bold text-green-400">{formatarNumero(f.salarioLiquido)} Kz</td>
                          <td className="p-2 text-gray-400 text-xs">{f.iban || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

                   {/* Modal de seleção do banco para exportação */}
{showBancoModal && (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700 animate-scale-in">
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Banknote className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="text-xl font-bold text-white">Exportar Ficheiro de Pagamento</h3>
              <p className="text-sm text-gray-400">Selecione o banco para o formato do ficheiro</p>
            </div>
          </div>
          <button onClick={() => setShowBancoModal(false)} className="p-1 rounded-lg hover:bg-gray-700">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-3">
        <p className="text-gray-300 text-sm mb-4">
          Escolha o banco que será utilizado para o processamento dos pagamentos. 
          O ficheiro será gerado no formato compatível com o banco selecionado.
        </p>
        
        {bancosDisponiveis.map(banco => (
          <button
            key={banco.codigo}
            onClick={() => {
              setShowBancoModal(false);
              exportarFicheiroPagamento(banco.codigo);
            }}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-all duration-200 border border-gray-600 hover:border-blue-500"
          >
            <div className="flex items-center gap-3">
              <Banknote size={20} className="text-blue-400" />
              <div className="text-left">
                <p className="text-white font-medium">{banco.nome}</p>
                <p className="text-xs text-gray-400">Código: {banco.codigo}</p>
              </div>
            </div>
            <Download size={18} className="text-green-400" />
          </button>
        ))}
      </div>
      
      <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
        <button onClick={() => setShowBancoModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}
              
              <button onClick={() => setDetalhes(null)} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <ConfiguracaoBanco
        isOpen={mostrarConfigBanco}
        onClose={() => setMostrarConfigBanco(false)}
        empresaId={empresaSelecionada}
        onSalvar={() => { mostrarMensagem("Configuração salva! Use na exportação.", "sucesso"); }}
      />

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default FolhaSalarial;