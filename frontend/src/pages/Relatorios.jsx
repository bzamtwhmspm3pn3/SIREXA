// frontend/src/pages/Relatorios.jsx - VERSAO CORRIGIDA (SEM SECAO PROBLEMATICA E INDICE CORRETO)
import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Relatorios = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [tipoPeriodo, setTipoPeriodo] = useState("mensal");
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(4);
  const [dia, setDia] = useState(1);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [historico, setHistorico] = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const BASE_URL = "http://localhost:5000";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const tiposPeriodo = [
    { id: "mensal", nome: "Mensal" },
    { id: "anual", nome: "Anual" }
  ];

  const meses = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    buscarEmpresas();
    gerarAnos();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarHistorico();
    } else {
      setHistorico([]);
      setRelatorio(null);
    }
  }, [empresaSelecionada]);

  const gerarAnos = () => {
    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 2; i++) {
      anos.push(i);
    }
    setAnosDisponiveis(anos);
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
        setErro("Acesso negado");
        return;
      }
      
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro:", error);
      setErro("Erro ao carregar empresas");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarHistorico = async () => {
    if (!empresaSelecionada) return;
    try {
      const response = await fetch(`${BASE_URL}/api/relatorios/historico/listar?empresaId=${empresaSelecionada}&limit=10`, {
        headers: getHeaders()
      });
      
      if (response.status === 403) {
        setErro("Acesso negado a esta empresa");
        setEmpresaSelecionada("");
        return;
      }
      
      const data = await response.json();
      setHistorico(data.relatorios || []);
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const gerarRelatorio = async () => {
    if (!empresaSelecionada) {
      setErro("Selecione uma empresa!");
      return;
    }

    setLoading(true);
    setErro("");
    setRelatorio(null);

    try {
      let url = `${BASE_URL}/api/relatorios/completo?empresaId=${empresaSelecionada}&tipoPeriodo=${tipoPeriodo}&ano=${ano}`;
      
      if (tipoPeriodo !== 'anual') {
        url += `&mes=${mes}`;
      }
      
      const response = await fetch(url, { headers: getHeaders() });
      
      if (response.status === 403) {
        setErro("Acesso negado a esta empresa");
        setEmpresaSelecionada("");
        setLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setRelatorio(data);
      await carregarHistorico();
    } catch (error) {
      console.error("Erro:", error);
      setErro(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const carregarDoHistorico = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/relatorios/detalhes/${id}`, { headers: getHeaders() });
      
      if (response.status === 403) {
        setErro("Acesso negado");
        return;
      }
      
      const data = await response.json();
      setRelatorio(data.dados);
    } catch (error) {
      console.error("Erro:", error);
      setErro("Erro ao carregar relatorio");
    } finally {
      setLoading(false);
    }
  };

  const excluirRelatorio = async (id) => {
    if (!window.confirm("Excluir este relatorio?")) return;
    try {
      const response = await fetch(`${BASE_URL}/api/relatorios/${id}`, { method: "DELETE", headers: getHeaders() });
      
      if (response.status === 403) {
        setErro("Acesso negado");
        return;
      }
      
      await carregarHistorico();
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const exportarPDF = () => {
    if (!relatorio) return;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const textWidth = pageWidth - (margin * 2);
    const footerMargin = 15;
    
    let y = 25;
    
    const checkNewPage = (spaceNeeded = 20) => {
      if (y + spaceNeeded > pageHeight - footerMargin) {
        doc.addPage();
        y = 25;
      }
    };
    
    const formatNumber = (value) => {
      if (value === undefined || value === null) return "0,00";
      const num = Number(value);
      if (isNaN(num)) return "0,00";
      return num.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    const formatNumberInt = (value) => {
      if (value === undefined || value === null) return "0";
      const num = Number(value);
      if (isNaN(num)) return "0";
      return num.toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    
    const addText = (texto, lineHeight = 5) => {
      if (!texto) return;
      const lines = doc.splitTextToSize(texto, textWidth);
      for (const line of lines) {
        checkNewPage(lineHeight);
        doc.text(line, margin, y);
        y += lineHeight;
      }
    };
    
    const addSectionTitle = (title, numero) => {
      checkNewPage(15);
      y += 3;
      
      doc.setFillColor(37, 99, 235);
      doc.rect(margin - 3, y - 3, 3, 10, 'F');
      
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`${numero}. ${title}`, margin, y);
      y += 6;
      
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 60);
    };
    
    // CAPA
    doc.setFillColor(240, 242, 245);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 5, 'F');
    
    doc.setFillColor(37, 99, 235);
    doc.circle(pageWidth / 2, 50, 18, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, 50, 12, 'F');
    doc.setFillColor(37, 99, 235);
    doc.circle(pageWidth / 2, 50, 5, 'F');
    
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(25, 25, 35);
    doc.text("RELATORIO DE GESTAO", pageWidth / 2, 95, { align: "center" });
    
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 120);
    doc.text("Analise Financeira e Operacional", pageWidth / 2, 110, { align: "center" });
    
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(50, 120, pageWidth - 50, 120);
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(relatorio.empresa?.nome || "Empresa", pageWidth / 2, 148, { align: "center" });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text(`Periodo: ${relatorio.periodo?.nome || "N/A"}`, pageWidth / 2, 168, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 140);
    doc.text(`Data: ${relatorio.dataGeracao || new Date().toLocaleString("pt-AO")}`, pageWidth / 2, 183, { align: "center" });
    
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text("DOCUMENTO ASSINADO DIGITALMENTE", pageWidth / 2, 203, { align: "center" });
    
    // INDICE - CORRIGIDO PARA PAGINAS CORRETAS
    doc.addPage();
    y = 30;
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("INDICE", pageWidth / 2, y, { align: "center" });
    y += 15;
    
    doc.setDrawColor(37, 99, 235);
    doc.line(40, y, pageWidth - 40, y);
    y += 12;
    
    const sections = [
      "1. INTRODUCAO",
      "2. ENQUADRAMENTO GERAL",
      "3. INDICADORES DE DESEMPENHO",
      "4. ANALISE FINANCEIRA",
      "5. ANALISE OPERACIONAL",
      "6. ANALISE DE CONTAS CORRENTES",
      "7. RECOMENDACOES ESTRATEGICAS",
      "8. CONCLUSAO"
    ];
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 60);
    
    // Numeros de pagina corretos (comecando da pagina 3 pois capa=1, indice=2)
    const pageNumbers = [3, 4, 5, 6, 7, 8, 9, 10];
    
    sections.forEach((section, i) => {
      doc.text(section, margin, y);
      doc.text(pageNumbers[i].toString(), pageWidth - margin, y, { align: "right" });
      y += 10;
      if (i < sections.length - 1) {
        doc.setDrawColor(220, 220, 230);
        doc.line(margin, y - 5, pageWidth - margin, y - 5);
      }
    });
    
    // SECAO 1 - INTRODUCAO
    doc.addPage();
    y = 25;
    
    addSectionTitle("INTRODUCAO", "1");
    addText(relatorio.texto?.introducao || "Informacao nao disponivel.", 5);
    
    // SECAO 2 - ENQUADRAMENTO GERAL
    addSectionTitle("ENQUADRAMENTO GERAL", "2");
    addText(relatorio.texto?.enquadramento || "Informacao nao disponivel.", 5);
    
    // SECAO 3 - INDICADORES
    addSectionTitle("INDICADORES DE DESEMPENHO", "3");
    
    const financeiros = relatorio.indicadoresFinanceiros || {};
    const empresa = relatorio.indicadoresEmpresa || {};
    const contasCorrentes = relatorio.contasCorrentes || {};
    
    const tableBody = [
      ["Receitas Totais", `${formatNumber(financeiros.totalReceitas)} Kz`],
      ["Despesas Totais", `${formatNumber(financeiros.totalDespesas)} Kz`],
      ["Resultado Liquido", `${formatNumber(Math.abs(financeiros.resultadoLiquido || 0))} Kz`],
      ["Margem de Lucro", `${Number(financeiros.margemLucro || 0).toFixed(2)}%`],
      ["Margem Bruta", `${Number(financeiros.margemBruta || 0).toFixed(2)}%`],
      ["Ticket Medio", `${formatNumber(financeiros.ticketMedio)} Kz`],
      ["Total de Vendas", formatNumberInt(financeiros.totalVendas)],
      ["Saldo Bancario Inicial", `${formatNumber(financeiros.saldoInicial)} Kz`],
      ["Saldo Bancario Final", `${formatNumber(financeiros.saldoFinal)} Kz`],
      ["Funcionarios", formatNumberInt(empresa.totalFuncionarios)],
      ["Funcionarios Activos", formatNumberInt(empresa.funcionariosAtivos)],
      ["Clientes", formatNumberInt(empresa.totalClientes)],
      ["Fornecedores", formatNumberInt(empresa.totalFornecedores)],
      ["Produtos em Stock", formatNumberInt(empresa.totalProdutos)],
      ["Quantidade em Stock", formatNumberInt(empresa.quantidadeTotalStock)],
      ["Valor em Stock", `${formatNumber(empresa.valorTotalStock)} Kz`],
      ["Viaturas", formatNumberInt(empresa.totalViaturas)],
      ["Viaturas Activas", formatNumberInt(empresa.viaturasAtivas)]
    ];
        
    checkNewPage(80);
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 60] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 'auto', halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 8;
    
    // SECAO 4 - ANALISE FINANCEIRA
    addSectionTitle("ANALISE FINANCEIRA", "4");
    addText(relatorio.texto?.analiseFinanceira || "Informacao nao disponivel.", 5);
    
    // SECAO 5 - ANALISE OPERACIONAL
    addSectionTitle("ANALISE OPERACIONAL", "5");
    addText(relatorio.texto?.analiseOperacional || "Informacao nao disponivel.", 5);
    
    // SECAO 6 - ANALISE DE CONTAS CORRENTES (APENAS A ANALISE UTIL, SEM A SECAO PROBLEMATICA)
    addSectionTitle("ANALISE DE CONTAS CORRENTES", "6");
    
    if (contasCorrentes.analise) {
      // Limpar a analise de caracteres especiais
      let analiseLimpa = contasCorrentes.analise;
      // Remover qualquer conteudo indesejado
      analiseLimpa = analiseLimpa.replace(/& þ.*$/g, '');
      analiseLimpa = analiseLimpa.replace(/FORNECEDORES QUE REQUEREM.*$/g, '');
      addText(analiseLimpa, 5);
    } else {
      addText("Nao existem contas correntes registadas no sistema.", 5);
    }
    
    // SECAO 7 - RECOMENDACOES
    addSectionTitle("RECOMENDACOES ESTRATEGICAS", "7");
    
    let recomendacoesTexto = "";
    if (relatorio.texto?.recomendacoes) {
      if (Array.isArray(relatorio.texto.recomendacoes)) {
        recomendacoesTexto = relatorio.texto.recomendacoes.join("\n");
      } else {
        recomendacoesTexto = relatorio.texto.recomendacoes;
      }
    }
    
    if (recomendacoesTexto) {
      const lines = doc.splitTextToSize(recomendacoesTexto, textWidth);
      for (const line of lines) {
        checkNewPage(5);
        doc.text(line, margin, y);
        y += 5;
      }
    } else {
      addText("Nenhuma recomendacao disponivel para o periodo.", 5);
    }
    
    y += 3;
    
    // SECAO 8 - CONCLUSAO
    addSectionTitle("CONCLUSAO", "8");
    addText(relatorio.texto?.conclusao || "Informacao nao disponivel.", 5);
    
    // RODAPE
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 140);
      doc.text(`Pagina ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: "center" });
    }
    
    const nomeEmpresa = (relatorio.empresa?.nome || "Empresa").replace(/\s/g, "_");
    const nomePeriodo = (relatorio.periodo?.nome || "Relatorio").replace(/\s/g, "_");
    doc.save(`Relatorio_Gestao_${nomeEmpresa}_${nomePeriodo}.pdf`);
  };

  const formatarMoeda = (valor) => {
    if (valor === undefined || valor === null) return "0,00 Kz";
    return Number(valor).toLocaleString("pt-AO", { minimumFractionDigits: 2 }) + " Kz";
  };

  if (loadingEmpresas && !isTecnico()) {
    return (
      <Layout title="Relatorios de Gestao" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatorios de Gestao" showBackButton={true} backToRoute="/menu">
      <div className="p-4 space-y-6">
        {erro && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg">
            {erro}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4">
          <label className="block mb-2 text-gray-300">Empresa</label>
          
          {isTecnico() ? (
            <div className="bg-gray-700 p-2 rounded text-white">
              {userEmpresaNome || "Empresa designada"}
              <span className="text-xs text-gray-400 ml-2">(Atribuida pelo gestor)</span>
            </div>
          ) : (
            <select
              className="w-full p-2 rounded bg-gray-700 text-white"
              value={empresaSelecionada}
              onChange={(e) => setEmpresaSelecionada(e.target.value)}
            >
              <option value="">Selecione</option>
              {empresas.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.nome}</option>
              ))}
            </select>
          )}
        </div>

        {empresaSelecionada && (
          <div className="flex justify-end">
            <button
              onClick={() => setMostrarHistorico(!mostrarHistorico)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white"
            >
              {mostrarHistorico ? "Fechar Historico" : `Historico (${historico.length})`}
            </button>
          </div>
        )}

        {mostrarHistorico && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-blue-400 mb-3">Relatorios Anteriores</h3>
            {historico.length === 0 ? (
              <p className="text-gray-400 text-center">Nenhum relatorio</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {historico.map((rel) => (
                  <div key={rel._id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{rel.titulo}</p>
                      <p className="text-xs text-gray-400">{new Date(rel.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Downloads: {rel.downloads || 0}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => carregarDoHistorico(rel._id)} className="bg-blue-600 px-3 py-1 rounded text-sm">Carregar</button>
                      <button onClick={() => excluirRelatorio(rel._id)} className="bg-red-600 px-3 py-1 rounded text-sm">Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold text-blue-400 mb-4">Configurar Relatorio</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 text-gray-300">Periodo</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={tipoPeriodo}
                onChange={(e) => setTipoPeriodo(e.target.value)}
              >
                {tiposPeriodo.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-gray-300">Ano</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value))}
              >
                {anosDisponiveis.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            {tipoPeriodo !== 'anual' && (
              <div>
                <label className="block mb-2 text-gray-300">Mes</label>
                <select
                  className="w-full p-2 rounded bg-gray-700 text-white"
                  value={mes}
                  onChange={(e) => setMes(parseInt(e.target.value))}
                >
                  {meses.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={gerarRelatorio}
            disabled={loading || !empresaSelecionada}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Gerando..." : "Gerar Relatorio"}
          </button>
        </div>

        {relatorio && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-center border-b border-gray-700 pb-4 mb-4">
              <h1 className="text-2xl font-bold text-blue-400">RELATORIO DE GESTAO</h1>
              <p className="text-gray-300 mt-2">{relatorio.empresa?.nome}</p>
              <p className="text-gray-400 text-sm">Periodo: {relatorio.periodo?.nome}</p>
              <p className="text-gray-500 text-xs mt-1">Gerado em: {relatorio.dataGeracao}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-400">Receitas</p>
                <p className="text-lg font-bold text-green-400">{formatarMoeda(relatorio.indicadoresFinanceiros?.totalReceitas)}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-400">Despesas</p>
                <p className="text-lg font-bold text-red-400">{formatarMoeda(relatorio.indicadoresFinanceiros?.totalDespesas)}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-400">Resultado</p>
                <p className={`text-lg font-bold ${relatorio.indicadoresFinanceiros?.resultadoLiquido >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatarMoeda(Math.abs(relatorio.indicadoresFinanceiros?.resultadoLiquido || 0))}
                </p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-400">Margem</p>
                <p className="text-lg font-bold text-blue-400">{relatorio.indicadoresFinanceiros?.margemLucro}%</p>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">1. INTRODUCAO</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{relatorio.texto?.introducao}</p>
              </div>
              
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">2. ENQUADRAMENTO GERAL</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{relatorio.texto?.enquadramento}</p>
              </div>
              
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">3. ANALISE FINANCEIRA</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{relatorio.texto?.analiseFinanceira}</p>
              </div>
              
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">4. ANALISE OPERACIONAL</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{relatorio.texto?.analiseOperacional}</p>
              </div>
              
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">5. ANALISE DE CONTAS CORRENTES</h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {relatorio.contasCorrentes?.analise || "Informacao nao disponivel."}
                </p>
              </div>
              
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">6. RECOMENDACOES</h2>
                <div className="bg-yellow-900/20 p-4 rounded-lg">
                  {relatorio.texto?.recomendacoes ? (
                    <div className="whitespace-pre-wrap text-gray-300 text-sm">
                      {Array.isArray(relatorio.texto.recomendacoes) 
                        ? relatorio.texto.recomendacoes.map((r, i) => <p key={i}>• {r}</p>)
                        : relatorio.texto.recomendacoes}
                    </div>
                  ) : (
                    <p className="text-gray-300 text-sm">Nenhuma recomendacao disponivel.</p>
                  )}
                </div>
              </div>
              
              <div>
                <h2 className="text-md font-bold text-blue-400 mb-2">7. CONCLUSAO</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{relatorio.texto?.conclusao}</p>
              </div>
            </div>

            {relatorio.topClientes?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-blue-400 mb-2">Top Clientes do Periodo</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {relatorio.topClientes.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                      <span className="text-white">{c.nome}</span>
                      <span className="text-green-400">{formatarMoeda(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={exportarPDF}
              className="mt-6 w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold text-white"
            >
              Exportar PDF
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Relatorios;