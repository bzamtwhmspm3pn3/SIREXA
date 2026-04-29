// frontend/src/pages/Indicadores.jsx - VERSÃO COMPLETA COM TODOS OS KPIs
import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, Banknote, Activity,
  Wallet, RefreshCw, Calendar, Printer, Loader2, Building, Users,
  Truck, FileText, UserCheck, Briefcase, Package, ShoppingCart, Eye,
  CreditCard, AlertCircle, CheckCircle, Info, Brain, Target, Gauge,
  Zap, Shield, LineChart, PieChart, BarChart3
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Indicadores = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [periodo, setPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [recalculando, setRecalculando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [analiseInteligente, setAnaliseInteligente] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("inteligente");
  const [redirecting, setRedirecting] = useState(false);

  const BASE_URL = "http://localhost:5000";
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

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
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarAnosDisponiveis();
      carregarIndicadores();
    }
  }, [empresaSelecionada, periodo]);

  const carregarEmpresas = async () => {
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
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarAnosDisponiveis = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/indicadores/anos-disponiveis`, { headers: getHeaders() });
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

  const carregarIndicadores = async () => {
    if (!empresaSelecionada) return;
    setLoading(true);
    try {
      const timestamp = new Date().getTime();
      const url = `${BASE_URL}/api/indicadores?empresaId=${empresaSelecionada}&mes=${periodo.mes}&ano=${periodo.ano}&_=${timestamp}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (response.status === 403) {
        setEmpresaSelecionada("");
        setLoading(false);
        return;
      }
      const data = await response.json();
      setDados(data);
      gerarAnaliseInteligente(data);
    } catch (error) {
      console.error("Erro ao carregar indicadores:", error);
    } finally {
      setLoading(false);
    }
  };

  const recalcularIndicadores = async () => {
    if (!empresaSelecionada) return;
    setRecalculando(true);
    try {
      const response = await fetch(`${BASE_URL}/api/indicadores/recalcular`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: empresaSelecionada,
          mes: periodo.mes,
          ano: periodo.ano
        })
      });
      const data = await response.json();
      if (data.sucesso) {
        setRedirecting(true);
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error) {
      console.error("Erro ao recalcular:", error);
      setRecalculando(false);
    }
  };

  const gerarAnaliseInteligente = (dados) => {
    const margem = parseFloat(dados.margemLucro) || 0;
    const liquidez = parseFloat(dados.liquidez) || 0;
    const rentabilidade = parseFloat(dados.rentabilidade) || 0;
    const endividamento = parseFloat(dados.endividamento) || 0;
    const resultado = dados.resultadoLiquido || 0;
    
    let statusGlobal = "";
    let corStatus = "";
    let recomendacoes = [];
    
    if (resultado > 0 && margem > 10 && liquidez > 1) {
      statusGlobal = "SAUDAVEL";
      corStatus = "text-green-400";
      recomendacoes.push("Continue com as estrategias atuais que estao gerando resultados positivos.");
      recomendacoes.push("Considere expandir as operacoes ou investir em inovacao.");
      recomendacoes.push("Aproveite a boa margem para constituir reservas financeiras.");
    } else if (resultado > 0 && margem > 0) {
      statusGlobal = "ESTAVEL";
      corStatus = "text-blue-400";
      recomendacoes.push("A empresa esta lucrando, mas a margem e reduzida.");
      recomendacoes.push("Busque otimizar custos operacionais para melhorar a rentabilidade.");
      recomendacoes.push("Aumente a eficiencia atraves de automacao de processos.");
    } else if (resultado < 0) {
      statusGlobal = "ATENCAO";
      corStatus = "text-red-400";
      recomendacoes.push("A empresa esta operando com prejuizo. Revise urgentemente a estrutura de custos.");
      recomendacoes.push("Analise a politica de precos e busque alternativas para aumentar as receitas.");
      recomendacoes.push("Identifique os produtos/servicos com margens negativas.");
    } else {
      statusGlobal = "NEUTRO";
      corStatus = "text-yellow-400";
      recomendacoes.push("A empresa esta no ponto de equilibrio.");
      recomendacoes.push("Identifique oportunidades de crescimento e aumento de receitas.");
    }
    
    if (liquidez < 1) {
      recomendacoes.push("A liquidez esta baixa. A empresa pode ter dificuldades para honrar compromissos de curto prazo.");
    }
    if (endividamento > 70) {
      recomendacoes.push("O endividamento esta alto. Reduza dividas antes de novos investimentos.");
    }
    if (rentabilidade < 0) {
      recomendacoes.push("A rentabilidade esta negativa. Revise as estrategias de vendas e marketing.");
    }
    
    setAnaliseInteligente({
      status: statusGlobal,
      cor: corStatus,
      recomendacoes: recomendacoes.slice(0, 6)
    });
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatarNumeroDecimal = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarMoeda = (numero) => `${formatarNumeroDecimal(numero)} Kz`;
  const formatarPercentual = (numero) => `${Number(numero || 0).toFixed(2)}%`;
  const getCor = (valor) => Number(valor || 0) >= 0 ? "text-green-400" : "text-red-400";

  const exportarPDF = async () => {
    if (!dados) return;
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RELATORIO DE INDICADORES", pageWidth / 2, yPos, { align: "center" });
      yPos += 12;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const empresaAtual = isTecnico() ? userEmpresaNome : empresas.find(e => e._id === empresaSelecionada)?.nome;
      doc.text(`Empresa: ${empresaAtual || "Nao selecionada"}`, 20, yPos + 5);
      doc.text(`Periodo: ${meses[periodo.mes - 1]} de ${periodo.ano}`, 20, yPos + 12);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-AO")}`, 20, yPos + 19);
      yPos += 35;
      
      if (analiseInteligente) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("ANALISE INTELIGENTE", 20, yPos);
        yPos += 8;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`Status: ${analiseInteligente.status}`, 20, yPos);
        yPos += 6;
        analiseInteligente.recomendacoes.forEach((rec) => {
          const lines = doc.splitTextToSize(rec, pageWidth - 40);
          doc.text(lines, 25, yPos);
          yPos += lines.length * 5 + 2;
        });
        yPos += 5;
      }
      
      if (yPos > 180) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INDICADORES DA EMPRESA", 20, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [["Indicador", "Quantidade"]],
        body: [
          ["Tecnicos", formatarNumero(dados.totalTecnicos || 0)],
          ["Funcionarios", formatarNumero(dados.totalFuncionarios || 0)],
          ["Fornecedores", formatarNumero(dados.totalFornecedores || 0)],
          ["Clientes", formatarNumero(dados.totalClientes || 0)],
          ["Produtos", formatarNumero(dados.totalProdutos || 0)],
          ["Viaturas", formatarNumero(dados.totalViaturas || 0)],
          ["Vendas no Periodo", formatarNumero(dados.totalVendas || 0)],
          ["Pagamentos", formatarNumero(dados.totalPagamentos || 0)]
        ],
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 60] },
        margin: { left: 20, right: 20 }
      });
      yPos = doc.lastAutoTable.finalY + 10;
      
      if (yPos > 180) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INDICADORES FINANCEIROS", 20, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [["Indicador", "Valor"]],
        body: [
          ["Liquidez", formatarNumeroDecimal(dados.liquidez)],
          ["Rentabilidade", formatarPercentual(dados.rentabilidade)],
          ["Margem de Lucro", formatarPercentual(dados.margemLucro)],
          ["Endividamento", formatarPercentual(dados.endividamento)],
          ["Ponto de Equilibrio", formatarMoeda(dados.pontoEquilibrio)],
          ["Resultado Operacional", formatarMoeda(dados.resultadoOperacional)],
          ["Resultado Liquido", formatarMoeda(dados.resultadoLiquido)],
          ["Impostos Pagos", formatarMoeda(dados.impostosPagos)],
          ["Ticket Medio", formatarMoeda(dados.ticketMedio)]
        ],
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 60] },
        margin: { left: 20, right: 20 }
      });
      yPos = doc.lastAutoTable.finalY + 10;
      
      if (yPos > 180) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("FLUXO DE CAIXA", 20, yPos);
      yPos += 8;
      
      autoTable(doc, {
        startY: yPos,
        head: [["Indicador", "Valor"]],
        body: [
          ["Fluxo Operacional", formatarMoeda(dados.fluxoCaixaOperacional || 0)],
          ["Fluxo de Investimento", formatarMoeda(dados.fluxoCaixaInvestimento || 0)],
          ["Fluxo de Financiamento", formatarMoeda(dados.fluxoCaixaFinanciamento || 0)],
          ["Caixa Final", formatarMoeda(dados.caixaFinal || 0)]
        ],
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 60] },
        margin: { left: 20, right: 20 }
      });
      
      doc.save(`indicadores_${meses[periodo.mes - 1]}_${periodo.ano}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setExportando(false);
    }
  };

  if (redirecting) {
    return (
      <Layout title="Indicadores" showBackButton={true} backToRoute="/menu">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <Loader2 className="animate-spin text-green-400 mx-auto mb-4" size={40} />
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Indicadores recalculados.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingEmpresas) {
    return (
      <Layout title="Indicadores" showBackButton={true} backToRoute="/menu">
        <div className="flex justify-center items-center h-96">
          <Loader2 size={48} className="animate-spin text-blue-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Indicadores Financeiros" showBackButton={true} backToRoute="/menu">
      <div className="space-y-4 p-4 max-w-full overflow-x-hidden">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => carregarIndicadores()}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa"}
            </p>
          </div>
        ) : (
          <>
            {isTecnico() && (
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-2 text-center">
                <span className="text-blue-400 text-sm">Empresa: <strong>{userEmpresaNome}</strong></span>
              </div>
            )}

            {/* Filtro */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="text-blue-400" size={16} />
                  <span className="text-white text-sm">Periodo</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={periodo.ano} onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })} className="px-3 py-1 rounded bg-gray-700 text-white text-sm">
                    {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                  <select value={periodo.mes} onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })} className="px-3 py-1 rounded bg-gray-700 text-white text-sm">
                    {meses.map((mes, idx) => <option key={idx} value={idx + 1}>{mes.substring(0, 3)}</option>)}
                  </select>
                  <button onClick={carregarIndicadores} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                    <RefreshCw size={14} /> Atualizar
                  </button>
                  <button onClick={recalcularIndicadores} disabled={recalculando} className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded-lg text-sm disabled:opacity-50">
                    {recalculando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Recalcular
                  </button>
                  <button onClick={exportarPDF} disabled={exportando} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm disabled:opacity-50">
                    <Printer size={14} /> {exportando ? "..." : "PDF"}
                  </button>
                </div>
              </div>
            </div>

            {/* Abas - TODAS AS ABAS COM TODOS OS KPIs */}
            <div className="border-b border-gray-700">
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setAbaAtiva("inteligente")} className={`px-3 py-1.5 rounded-t-lg text-xs flex items-center gap-1 ${abaAtiva === "inteligente" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  <Brain size={14} /> Analise
                </button>
                <button onClick={() => setAbaAtiva("empresa")} className={`px-3 py-1.5 rounded-t-lg text-xs flex items-center gap-1 ${abaAtiva === "empresa" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  <Building size={14} /> Empresa
                </button>
                <button onClick={() => setAbaAtiva("financeiros")} className={`px-3 py-1.5 rounded-t-lg text-xs flex items-center gap-1 ${abaAtiva === "financeiros" ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  <DollarSign size={14} /> Financeiros
                </button>
                <button onClick={() => setAbaAtiva("rentabilidade")} className={`px-3 py-1.5 rounded-t-lg text-xs flex items-center gap-1 ${abaAtiva === "rentabilidade" ? "bg-yellow-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  <TrendingUp size={14} /> Rentabilidade
                </button>
                <button onClick={() => setAbaAtiva("fluxo")} className={`px-3 py-1.5 rounded-t-lg text-xs flex items-center gap-1 ${abaAtiva === "fluxo" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"}`}>
                  <Wallet size={14} /> Fluxo de Caixa
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 size={40} className="animate-spin text-blue-400" />
              </div>
            ) : dados ? (
              <>
                {/* ABA 1: ANÁLISE INTELIGENTE */}
                {abaAtiva === "inteligente" && analiseInteligente && (
                  <div className={`rounded-xl p-4 border-2 ${analiseInteligente.cor === 'text-green-400' ? 'border-green-500/30 bg-green-900/20' : analiseInteligente.cor === 'text-red-400' ? 'border-red-500/30 bg-red-900/20' : analiseInteligente.cor === 'text-blue-400' ? 'border-blue-500/30 bg-blue-900/20' : 'border-yellow-500/30 bg-yellow-900/20'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className={analiseInteligente.cor} size={20} />
                      <h3 className={`text-lg font-bold ${analiseInteligente.cor}`}>Analise Inteligente</h3>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${analiseInteligente.cor} bg-gray-800`}>
                        Status: {analiseInteligente.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {analiseInteligente.recomendacoes.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-blue-400">•</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ABA 2: INDICADORES DA EMPRESA */}
                {abaAtiva === "empresa" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <CardIndicador titulo="Tecnicos" valor={formatarNumero(dados.totalTecnicos)} icone={<UserCheck size={18} />} cor="cyan" />
                    <CardIndicador titulo="Funcionarios" valor={formatarNumero(dados.totalFuncionarios)} icone={<Users size={18} />} cor="teal" />
                    <CardIndicador titulo="Fornecedores" valor={formatarNumero(dados.totalFornecedores)} icone={<Briefcase size={18} />} cor="orange" />
                    <CardIndicador titulo="Clientes" valor={formatarNumero(dados.totalClientes || 0)} icone={<Users size={18} />} cor="purple" />
                    <CardIndicador titulo="Produtos" valor={formatarNumero(dados.totalProdutos || 0)} icone={<Package size={18} />} cor="amber" />
                    <CardIndicador titulo="Viaturas" valor={formatarNumero(dados.totalViaturas)} icone={<Truck size={18} />} cor="rose" />
                    <CardIndicador titulo="Vendas" valor={formatarNumero(dados.totalVendas)} icone={<ShoppingCart size={18} />} cor="emerald" />
                    <CardIndicador titulo="Pagamentos" valor={formatarNumero(dados.totalPagamentos)} icone={<CreditCard size={18} />} cor="slate" />
                  </div>
                )}

                {/* ABA 3: INDICADORES FINANCEIROS - TODOS OS KPIs */}
                {abaAtiva === "financeiros" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <CardIndicador titulo="Liquidez" valor={formatarNumeroDecimal(dados.liquidez)} icone={<Activity size={18} />} cor="blue" tooltip="Capacidade de pagar dividas de curto prazo" />
                      <CardIndicador titulo="Rentabilidade" valor={formatarPercentual(dados.rentabilidade)} icone={<TrendingUp size={18} />} cor={getCor(dados.rentabilidade)} tooltip="Retorno sobre as vendas" />
                      <CardIndicador titulo="Margem de Lucro" valor={formatarPercentual(dados.margemLucro)} icone={<Percent size={18} />} cor={getCor(dados.margemLucro)} tooltip="Percentual de lucro sobre receitas" />
                      <CardIndicador titulo="Endividamento" valor={formatarPercentual(dados.endividamento)} icone={<TrendingDown size={18} />} cor={getCor(dados.endividamento)} tooltip="Percentual de custos sobre receitas" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <CardIndicador titulo="Ponto de Equilibrio" valor={formatarMoeda(dados.pontoEquilibrio)} icone={<Target size={18} />} cor="orange" tooltip="Receita minima para cobrir custos" />
                      <CardIndicador titulo="Resultado Operacional" valor={formatarMoeda(dados.resultadoOperacional)} icone={<Activity size={18} />} cor={getCor(dados.resultadoOperacional)} tooltip="Resultado antes de impostos" />
                      <CardIndicador titulo="Resultado Liquido" valor={formatarMoeda(dados.resultadoLiquido)} icone={<DollarSign size={18} />} cor={getCor(dados.resultadoLiquido)} tooltip="Lucro ou Prejuizo final" />
                      <CardIndicador titulo="Impostos Pagos" valor={formatarMoeda(dados.impostosPagos)} icone={<FileText size={18} />} cor="red" tooltip="Total de impostos pagos" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <CardIndicador titulo="Ticket Medio" valor={formatarMoeda(dados.ticketMedio)} icone={<Banknote size={18} />} cor="yellow" tooltip="Valor medio por transacao" />
                      <CardIndicador titulo="ROE" valor={dados.roe ? formatarPercentual(dados.roe) : "0,00%"} icone={<Gauge size={18} />} cor={getCor(dados.roe)} tooltip="Retorno sobre Patrimonio" />
                      <CardIndicador titulo="ROA" valor={dados.roa ? formatarPercentual(dados.roa) : "0,00%"} icone={<Shield size={18} />} cor={getCor(dados.roa)} tooltip="Retorno sobre Ativos" />
                      <CardIndicador titulo="Saldo Final" valor={formatarMoeda(dados.caixaFinal)} icone={<Wallet size={18} />} cor="green" tooltip="Saldo em conta bancaria" />
                    </div>
                  </div>
                )}

                {/* ABA 4: RENTABILIDADE */}
                {abaAtiva === "rentabilidade" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <CardIndicador titulo="Rentabilidade" valor={formatarPercentual(dados.rentabilidade)} icone={<TrendingUp size={18} />} cor={getCor(dados.rentabilidade)} tooltip="Retorno sobre as vendas" />
                    <CardIndicador titulo="Margem de Lucro" valor={formatarPercentual(dados.margemLucro)} icone={<Percent size={18} />} cor={getCor(dados.margemLucro)} tooltip="Percentual de lucro sobre receitas" />
                    <CardIndicador titulo="ROE" valor={dados.roe ? formatarPercentual(dados.roe) : "0,00%"} icone={<Gauge size={18} />} cor={getCor(dados.roe)} tooltip="Retorno sobre Patrimonio" />
                  </div>
                )}

                {/* ABA 5: FLUXO DE CAIXA */}
                {abaAtiva === "fluxo" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <CardIndicador titulo="Fluxo Operacional" valor={formatarMoeda(dados.fluxoCaixaOperacional)} icone={<RefreshCw size={18} />} cor={getCor(dados.fluxoCaixaOperacional)} tooltip="Caixa gerado pelas operacoes" />
                    <CardIndicador titulo="Fluxo Investimento" valor={formatarMoeda(dados.fluxoCaixaInvestimento)} icone={<TrendingUp size={18} />} cor="blue" tooltip="Investimentos realizados" />
                    <CardIndicador titulo="Fluxo Financiamento" valor={formatarMoeda(dados.fluxoCaixaFinanciamento)} icone={<TrendingDown size={18} />} cor="orange" tooltip="Captacao/pagamento de recursos" />
                    <CardIndicador titulo="Caixa Final" valor={formatarMoeda(dados.caixaFinal)} icone={<Wallet size={18} />} cor="green" tooltip="Saldo final disponivel" />
                  </div>
                )}

                {/* Explicacao dos Indicadores */}
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <h3 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1">
                    <Info size={12} /> O que significam estes indicadores?
                  </h3>
                  <div className="text-xs text-gray-400">
                    <p><strong className="text-blue-400">Liquidez:</strong> Capacidade de pagar dividas. &gt; 1 e saudavel.</p>
                    <p className="mt-1"><strong className="text-blue-400">Margem de Lucro:</strong> Percentual das receitas que virou lucro.</p>
                    <p className="mt-1"><strong className="text-blue-400">Resultado Liquido:</strong> Lucro ou prejuizo final.</p>
                    <p className="mt-1"><strong className="text-blue-400">Ticket Medio:</strong> Valor medio gasto por cliente.</p>
                    <p className="mt-1"><strong className="text-blue-400">ROE:</strong> Retorno sobre o patrimonio liquido.</p>
                    <p className="mt-1"><strong className="text-blue-400">ROA:</strong> Retorno sobre os ativos totais.</p>
                    <p className="mt-1"><strong className="text-blue-400">Endividamento:</strong> Percentual de custos sobre receitas.</p>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Periodo: {meses[periodo.mes - 1]} de {periodo.ano} | {new Date().toLocaleDateString("pt-AO")}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <AlertCircle className="mx-auto mb-3 text-gray-500" size={40} />
                <p className="text-gray-400">Nenhum dado disponivel.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

const CardIndicador = ({ titulo, valor, icone, cor, tooltip }) => {
  const cores = {
    cyan: "from-cyan-900 to-cyan-800 border-cyan-500/30 text-cyan-400",
    teal: "from-teal-900 to-teal-800 border-teal-500/30 text-teal-400",
    orange: "from-orange-900 to-orange-800 border-orange-500/30 text-orange-400",
    purple: "from-purple-900 to-purple-800 border-purple-500/30 text-purple-400",
    amber: "from-amber-900 to-amber-800 border-amber-500/30 text-amber-400",
    rose: "from-rose-900 to-rose-800 border-rose-500/30 text-rose-400",
    blue: "from-blue-900 to-blue-800 border-blue-500/30 text-blue-400",
    green: "from-green-900 to-green-800 border-green-500/30 text-green-400",
    red: "from-red-900 to-red-800 border-red-500/30 text-red-400",
    yellow: "from-yellow-900 to-yellow-800 border-yellow-500/30 text-yellow-400",
    emerald: "from-emerald-900 to-emerald-800 border-emerald-500/30 text-emerald-400",
    slate: "from-slate-900 to-slate-800 border-slate-500/30 text-slate-400"
  };
  const corClass = cores[cor] || cores.blue;
  return (
    <div className={`bg-gradient-to-br ${corClass} rounded-xl p-2 text-center border relative group`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-300">{titulo}</span>
        {icone}
      </div>
      <p className="text-lg font-bold">{valor}</p>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">{tooltip}</div>
        </div>
      )}
    </div>
  );
};

export default Indicadores;