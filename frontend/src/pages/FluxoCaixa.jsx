// frontend/src/pages/FluxoCaixa.jsx - VERSÃO COMPLETAMENTE CORRIGIDA
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { 
  TrendingUp, TrendingDown, RefreshCw, Download, Printer, 
  Loader2, FileText, Shield, Award, DollarSign, Building2, Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function FluxoCaixa() {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresaDados, setEmpresaDados] = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingDados, setLoadingDados] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [periodo, setPeriodo] = useState("mensal");
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [fluxoData, setFluxoData] = useState(null);
  const [mostrarAnalise, setMostrarAnalise] = useState(false);
  const [erro, setErro] = useState(false);

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
      setEmpresaDados({ nome: userEmpresaNome || "Empresa", _id: userEmpresaId });
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada, userEmpresaNome]);

  useEffect(() => {
    buscarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      setFluxoData(null);
      setErro(false);
      carregarFluxoCaixa();
    }
  }, [empresaSelecionada, periodo, anoSelecionado, mesSelecionado]);

  const buscarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (response.status === 403) {
        mostrarMsg("Acesso negado", "erro");
        return;
      }
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
        setEmpresaDados(lista[0]);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMsg("❌ Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleEmpresaChange = (e) => {
    const novaEmpresaId = e.target.value;
    console.log("🔄 Mudando empresa para:", novaEmpresaId);
    
    setEmpresaSelecionada(novaEmpresaId);
    setFluxoData(null);
    setErro(false);
    
    const empresaEncontrada = empresas.find(emp => emp._id === novaEmpresaId);
    if (empresaEncontrada) {
      console.log("✅ Empresa encontrada:", empresaEncontrada.nome);
      setEmpresaDados(empresaEncontrada);
    } else {
      setEmpresaDados(null);
    }
  };

  const carregarFluxoCaixa = async () => {
    if (!empresaSelecionada) {
      mostrarMsg("⚠️ Selecione uma empresa primeiro", "erro");
      return;
    }
    
    setLoadingDados(true);
    setErro(false);
    try {
      const ts = Date.now();
      const url = `${BASE_URL}/api/fluxocaixa/calcular?empresaId=${empresaSelecionada}&periodo=${periodo}&ano=${anoSelecionado}&mes=${mesSelecionado}&_=${ts}`;
      
      console.log("📊 Carregando fluxo de caixa para empresa:", empresaSelecionada);
      
      const response = await fetch(url, { headers: getHeaders(), cache: 'no-cache' });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.sucesso && data.dados) {
        if (data.dados.empresa) {
          setEmpresaDados({
            nome: data.dados.empresa.nome,
            nif: data.dados.empresa.nif,
            _id: empresaSelecionada
          });
        }
        setFluxoData(data.dados);
        mostrarMsg(`✅ Dados carregados com sucesso!`, "sucesso");
      } else {
        setErro(true);
        mostrarMsg(data.mensagem || "❌ Erro ao carregar dados", "erro");
      }
    } catch (error) {
      console.error("❌ Erro:", error);
      setErro(true);
      mostrarMsg("❌ Erro ao conectar com o servidor", "erro");
    } finally {
      setLoadingDados(false);
    }
  };

  const mostrarMsg = (msg, tipo = "info") => {
    setMensagem(msg);
    setTimeout(() => setMensagem(""), 3000);
  };

  const exportarPDF = async () => {
  const element = document.getElementById("fluxo-caixa-tabela");
  if (!element) {
    mostrarMsg("❌ Elemento não encontrado", "erro");
    return;
  }
  
  setLoadingPDF(true);
  try {
    // Configurar PDF em retrato
    const pdf = new jsPDF({ 
      orientation: 'portrait', 
      unit: 'mm', 
      format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();  // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 10;
    const maxWidth = pageWidth - (margin * 2);  // 190mm
    const maxHeight = pageHeight - (margin * 2); // 277mm
    
    // Capturar a tabela
    const canvas = await html2canvas(element, { 
      scale: 1.5, 
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    // Calcular proporção para caber na página
    let imgWidth = maxWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Se a altura ultrapassar, redimensionar pela altura
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    
    // Centralizar
    const xOffset = (pageWidth - imgWidth) / 2;
    const yOffset = (pageHeight - imgHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', xOffset, Math.max(margin, yOffset), imgWidth, imgHeight);
    pdf.save(`fluxo_caixa_${getPeriodoNome()}_${anoSelecionado}.pdf`);
    mostrarMsg("✅ PDF exportado com sucesso!", "sucesso");
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    mostrarMsg("❌ Erro ao exportar PDF", "erro");
  } finally {
    setLoadingPDF(false);
  }
};

  const exportarExcel = () => {
    if (!fluxoData) return;
    
    const planilha = [
      ["DEMONSTRAÇÃO DE FLUXOS DE CAIXA"],
      [empresaDados?.nome || fluxoData?.empresa?.nome || "EMPRESA"],
      [`Para ${periodo === "mensal" ? "o mês" : "o período"} de ${getPeriodoNome()} de ${anoSelecionado}`],
      ["Valores expressos em Kwanzas (Kz)"], [],
      ["DESIGNAÇÃO", "VALOR (Kz)"], [],
      ["FLUXO DE CAIXA DAS ACTIVIDADES OPERACIONAIS:"],
      ["  Recebimentos de clientes", fluxoData.receitas?.total || 0],
      ["  Pagamentos a fornecedores", fluxoData.despesas?.porCategoria?.fornecedores || 0],
      ["  Custos com Pessoal:", ""],
      ["    Salários", fluxoData.despesas?.porCategoria?.custosPessoal || 0],
      ["    Impostos sobre Salários (IRT/INSS)", fluxoData.despesas?.porCategoria?.impostosPessoal || 0],
      ["    Total Custos com Pessoal", fluxoData.despesas?.porCategoria?.totalCustosPessoal || 0],
      ["  Juros pagos", fluxoData.despesas?.porCategoria?.juros || 0],
      ["  Impostos (outros)", fluxoData.despesas?.porCategoria?.impostos || 0],
      ["  Amortização", fluxoData.despesas?.porCategoria?.amortizacao || 0],
      ["  Caixa gerada pelas operações", fluxoData.indicadores?.caixaGeradaOperacoes || 0],
      ["  Juros pagos", fluxoData.despesas?.porCategoria?.juros || 0],
      ["  Impostos sobre lucros pagos", fluxoData.despesas?.porCategoria?.impostos || 0],
      ["  Caixa líquida das actividades operacionais", fluxoData.indicadores?.caixaLiquidaOperacional || 0], [],
      ["FLUXO DE CAIXA DAS ACTIVIDADES DE INVESTIMENTO:"],
      ["  Recebimentos provenientes de:", ""],
      ["    Imobilizações corpóreas", fluxoData.investimento?.recebimentosCorporeas || 0],
      ["    Imobilizações incorpóreas", fluxoData.investimento?.recebimentosIncorporeas || 0],
      ["    Investimentos financeiros", fluxoData.investimento?.recebimentosFinanceiros || 0],
      ["    Subsídios a investimento", fluxoData.investimento?.subsidios || 0],
      ["    Juros e proveitos similares", fluxoData.investimento?.jurosRecebidos || 0],
      ["    Dividendos ou lucros recebidos", fluxoData.investimento?.dividendosRecebidos || 0],
      ["  Pagamentos respeitantes a:", ""],
      ["    Imobilizações corpóreas", fluxoData.investimento?.pagamentosCorporeas || 0],
      ["    Imobilizações incorpóreas", fluxoData.investimento?.pagamentosIncorporeas || 0],
      ["    Investimentos financeiros", fluxoData.investimento?.pagamentosFinanceiros || 0],
      ["  Caixa líquida das actividades de investimento", fluxoData.investimento?.liquido || 0], [],
      ["FLUXO DE CAIXA DAS ACTIVIDADES DE FINANCIAMENTO:"],
      ["  Recebimentos provenientes de:", ""],
      ["    Aumentos de capital", fluxoData.financiamento?.aumentosCapital || 0],
      ["    Cobertura de prejuízos", fluxoData.financiamento?.coberturaPrejuizos || 0],
      ["    Empréstimos obtidos", fluxoData.financiamento?.emprestimosRecebidos || 0],
      ["    Subsídios à exploração e doações", fluxoData.financiamento?.subsidiosExploracao || 0],
      ["  Pagamentos respeitantes a:", ""],
      ["    Reduções de capital", fluxoData.financiamento?.reducoesCapital || 0],
      ["    Compras de acções ou quotas próprias", fluxoData.financiamento?.comprasAcoes || 0],
      ["    Dividendos ou lucros pagos", fluxoData.financiamento?.dividendosPagos || 0],
      ["    Amortização de empréstimos", fluxoData.financiamento?.amortizacaoEmprestimos || 0],
      ["    Amortização de contratos de locação financeira", fluxoData.financiamento?.amortizacaoLocacao || 0],
      ["  Caixa líquida das actividades de financiamento", fluxoData.financiamento?.liquido || 0], [],
      ["AUMENTO LÍQUIDO DE CAIXA E SEUS EQUIVALENTES", fluxoData.aumentoLiquido || 0],
      ["CAIXA E SEUS EQUIVALENTES NO INÍCIO DO PERÍODO", fluxoData.saldoInicial || 0],
      ["CAIXA E SEUS EQUIVALENTES NO FIM DO PERÍODO", fluxoData.saldoFinal || 0]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(planilha);
    ws['!cols'] = [{ wch: 55 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
    XLSX.writeFile(wb, `fluxo_caixa_${getPeriodoNome()}_${anoSelecionado}.xlsx`);
    mostrarMsg("✅ Excel exportado com sucesso!");
  };

  const fmt = (valor) => {
    if (valor === undefined || valor === null) return "0,00";
    return Number(valor).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cor = (valor) => {
    const num = Number(valor || 0);
    return num >= 0 ? "text-green-600" : "text-red-600";
  };

  const getPeriodoNome = () => {
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    if (periodo === "mensal") return meses[mesSelecionado - 1];
    if (periodo === "bimestral") return `${Math.ceil(mesSelecionado / 2)}º Bimestre`;
    if (periodo === "trimestral") return `${Math.ceil(mesSelecionado / 3)}º Trimestre`;
    if (periodo === "semestral") return `${Math.ceil(mesSelecionado / 6)}º Semestre`;
    return `Ano ${anoSelecionado}`;
  };

  const mesesLista = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const periodosLista = [
    { valor: "mensal", label: "Mensal", icon: "📅" },
    { valor: "bimestral", label: "Bimestral", icon: "📊" },
    { valor: "trimestral", label: "Trimestral", icon: "📈" },
    { valor: "semestral", label: "Semestral", icon: "📉" },
    { valor: "anual", label: "Anual", icon: "🎯" }
  ];

  // Componentes de linha
  const LinhaSecao = ({ label }) => (
    <tr className="border-b border-gray-300 bg-gray-50">
      <td colSpan="2" className="py-2 px-4 font-bold text-blue-600">{label}</td>
    </tr>
  );

  const LinhaSubsecao = ({ label }) => (
    <tr className="border-b border-gray-200">
      <td colSpan="2" className="py-2 px-4 pl-4 font-semibold text-gray-700">{label}</td>
    </tr>
  );

  const LinhaItem = ({ label, valor, corValor, indent = "pl-8" }) => (
    <tr className="border-b border-gray-200">
      <td className={`py-2 px-4 ${indent} text-gray-700`}>{label}</td>
      <td className={`py-2 px-4 text-right font-semibold ${corValor}`}>{fmt(valor)} Kz</td>
    </tr>
  );

  const LinhaSubtotal = ({ label, valor, indent = "pl-8" }) => (
    <tr className="border-b border-gray-200 bg-gray-50">
      <td className={`py-2 px-4 ${indent} font-semibold text-gray-800`}>{label}</td>
      <td className={`py-2 px-4 text-right font-bold ${cor(valor)}`}>{fmt(valor)} Kz</td>
    </tr>
  );

  const LinhaTotais = ({ label, valor }) => (
    <tr className="border-b-2 border-gray-400 bg-gray-100">
      <td className="py-2 px-4 pl-8 font-bold text-blue-700">{label}</td>
      <td className={`py-2 px-4 text-right font-bold ${cor(valor)}`}>{fmt(valor)} Kz</td>
    </tr>
  );

  const LinhaFinal = ({ label, valor }) => (
    <tr className="border-t-2 border-gray-400 bg-gray-100">
      <td className="py-3 px-4 font-bold text-gray-900">{label}</td>
      <td className={`py-3 px-4 text-right font-bold text-xl ${cor(valor)}`}>{fmt(valor)} Kz</td>
    </tr>
  );

  // Loading inicial
  if (loadingEmpresas) {
    return (
      <Layout title="Fluxo de Caixa" showBackButton={true} backToRoute="/menu">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto text-blue-400" />
            <p className="text-gray-400 mt-4">Carregando empresas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingDados && !fluxoData && !erro) {
    return (
      <Layout title="Fluxo de Caixa" showBackButton={true} backToRoute="/menu">
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto text-blue-400" />
            <p className="text-gray-400 mt-4">Carregando dados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Fluxo de Caixa" showBackButton={true} backToRoute="/menu">
      {mensagem && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.includes("✅") ? "bg-green-600" : 
            mensagem.includes("⚠️") ? "bg-yellow-600" : "bg-red-600"
          } text-white text-sm whitespace-nowrap`}>
            <span>{mensagem}</span>
          </div>
        </div>
      )}

      <div className="space-y-6 p-4">
        {/* Informação para Técnico */}
        {isTecnico() && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Eye size={18} />
              <span className="text-sm">Operando como Técnico | Empresa: <strong>{userEmpresaNome}</strong></span>
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-300">🏢 Empresa</label>
              {isTecnico() ? (
                <div className="w-full p-2 rounded bg-gray-700 text-white font-semibold">
                  {userEmpresaNome || "Empresa"}
                </div>
              ) : (
                <select
                  className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                  value={empresaSelecionada}
                  onChange={handleEmpresaChange}
                >
                  {empresas.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.nome}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">📅 Período</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                value={periodo}
                onChange={(e) => {
                  setPeriodo(e.target.value);
                  setMesSelecionado(1);
                  setFluxoData(null);
                }}
              >
                {periodosLista.map(p => (
                  <option key={p.valor} value={p.valor}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">📆 Ano</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                value={anoSelecionado}
                onChange={(e) => {
                  setAnoSelecionado(parseInt(e.target.value));
                  setFluxoData(null);
                }}
                min={2020}
                max={2030}
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-300">
                {periodo === "mensal" ? "📆 Mês" :
                 periodo === "bimestral" ? "📊 Bimestre" :
                 periodo === "trimestral" ? "📈 Trimestre" :
                 periodo === "semestral" ? "📉 Semestre" : "🎯 Período"}
              </label>
              {periodo === "anual" ? (
                <div className="w-full p-2 rounded bg-gray-700 text-white text-center">Ano Completo</div>
              ) : (
                <select
                  className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
                  value={mesSelecionado}
                  onChange={(e) => {
                    setMesSelecionado(parseInt(e.target.value));
                    setFluxoData(null);
                  }}
                >
                  {periodo === "mensal" && mesesLista.map((mes, i) => (
                    <option key={i+1} value={i+1}>{i+1} - {mes}</option>
                  ))}
                  {periodo === "bimestral" && [1,2,3,4,5,6].map(b => (
                    <option key={b} value={b+1}>{b}º Bimestre</option>
                  ))}
                  {periodo === "trimestral" && [1,2,3,4].map(t => (
                    <option key={t} value={t}>{t}º Trimestre</option>
                  ))}
                  {periodo === "semestral" && [1,2].map(s => (
                    <option key={s} value={s}>{s}º Semestre</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={carregarFluxoCaixa}
                disabled={loadingDados}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loadingDados ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {loadingDados ? "Processando..." : "Atualizar"}
              </button>
              {fluxoData && !erro && (
                <>
                  <button
                    onClick={exportarExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg"
                    title="Exportar Excel"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={exportarPDF}
                    disabled={loadingPDF}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg disabled:opacity-50"
                    title="Exportar PDF"
                  >
                    {loadingPDF ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : fluxoData && !erro ? (
          <div className="space-y-4">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-4 text-center border border-green-700">
                <TrendingUp className="mx-auto mb-2 text-green-400" size={28} />
                <p className="text-3xl font-bold text-green-400">{fmt(fluxoData.receitas?.total)} Kz</p>
                <p className="text-sm text-gray-300">Total de Recebimentos</p>
                <p className="text-xs text-gray-400">{fluxoData.receitas?.quantidade || 0} operações</p>
              </div>
              <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-lg p-4 text-center border border-red-700">
                <TrendingDown className="mx-auto mb-2 text-red-400" size={28} />
                <p className="text-3xl font-bold text-red-400">{fmt(fluxoData.despesas?.total)} Kz</p>
                <p className="text-sm text-gray-300">Total de Pagamentos</p>
                <p className="text-xs text-gray-400">{fluxoData.despesas?.quantidade || 0} operações</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4 text-center border border-blue-700">
                <DollarSign className="mx-auto mb-2 text-blue-400" size={28} />
                <p className={`text-3xl font-bold ${cor(fluxoData.aumentoLiquido)}`}>
                  {fmt(Math.abs(fluxoData.aumentoLiquido || 0))} Kz
                </p>
                <p className="text-sm text-gray-300">Aumento Líquido</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-4 text-center border border-purple-700">
                <Shield className="mx-auto mb-2 text-purple-400" size={28} />
                <p className={`text-3xl font-bold ${cor(fluxoData.saldoFinal)}`}>
                  {fmt(Math.abs(fluxoData.saldoFinal || 0))} Kz
                </p>
                <p className="text-sm text-gray-300">Caixa e Equivalentes</p>
              </div>
            </div>

            {/* Análise de Desempenho */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                  <Award size={18} /> Análise de Desempenho
                </h3>
                <button onClick={() => setMostrarAnalise(!mostrarAnalise)} className="text-gray-400 hover:text-white">
                  {mostrarAnalise ? "▲" : "▼"}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Margem Operacional</p>
                  <p className={`text-xl font-bold ${parseFloat(fluxoData.indicadores?.margemOperacional || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fluxoData.indicadores?.margemOperacional || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Taxa de Crescimento</p>
                  <p className={`text-xl font-bold ${parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fluxoData.indicadores?.taxaCrescimento || 0}%
                  </p>
                </div>
              </div>
              {mostrarAnalise && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-300 text-sm">
                    <strong>Classificação:</strong>{" "}
                    {parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) > 20 ? "Excelente" :
                     parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) > 0 ? "Bom" :
                     parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) > -10 ? "Atenção" : "Crítico"}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) > 20 ?
                      "Parabéns! O fluxo de caixa está muito saudável. Considere investir o excedente." :
                     parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) > 0 ?
                      "Fluxo de caixa positivo. Mantenha o controle das despesas e continue investindo." :
                     parseFloat(fluxoData.indicadores?.taxaCrescimento || 0) > -10 ?
                      "Fluxo de caixa negativo. Reveja as despesas e busque aumentar as receitas." :
                      "Situação financeira crítica. Necessário reestruturação urgente das finanças."}
                  </p>
                </div>
              )}
            </div>

            {/* Título do Período */}
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <h2 className="text-2xl font-bold text-white">
                Fluxo de Caixa do {getPeriodoNome()} de {anoSelecionado}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{empresaDados?.nome || fluxoData?.empresa?.nome || "Empresa"}</p>
            </div>

            {/* Tabela do Fluxo de Caixa */}
            <div id="fluxo-caixa-tabela" className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-gray-300">
              <div className="p-6" style={{ color: "#000000" }}>
                <div className="text-center mb-6">
                  <h1 className="text-xl font-bold text-gray-900">{empresaDados?.nome || fluxoData?.empresa?.nome || "EMPRESA"}</h1>
                  <h2 className="text-lg font-semibold text-gray-800">Demonstração de Fluxos de Caixa</h2>
                  <p className="text-gray-600">
                    Para o {periodo === "mensal" ? "mês" : periodo === "anual" ? "exercício" : "período"} de {getPeriodoNome()} de {anoSelecionado}
                  </p>
                  <p className="text-gray-500 text-sm">Valores expressos em Kwanzas (Kz)</p>
                </div>

                <table className="w-full border-collapse border-2 border-gray-400">
                  <thead>
                    <tr className="border-b-2 border-gray-400 bg-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 border-r border-gray-300">Designação</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor (Kz)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <LinhaSecao label="Fluxo de caixa das actividades operacionais:" />
                    <LinhaItem label="Recebimentos de clientes" valor={fluxoData.receitas?.total} corValor="text-green-600" />
                    
                    <LinhaSubsecao label="Custos com Pessoal:" />
                    <LinhaItem label="Salários" valor={fluxoData.despesas?.porCategoria?.custosPessoal} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Impostos sobre Salários (IRT/INSS)" valor={fluxoData.despesas?.porCategoria?.impostosPessoal} corValor="text-red-600" indent="pl-12" />
                    <LinhaSubtotal label="Total Custos com Pessoal" valor={fluxoData.despesas?.porCategoria?.totalCustosPessoal} indent="pl-12" />
                    
                    <LinhaItem label="Pagamentos a fornecedores" valor={fluxoData.despesas?.porCategoria?.fornecedores} corValor="text-red-600" />
                    <LinhaItem label="Juros pagos" valor={fluxoData.despesas?.porCategoria?.juros} corValor="text-red-600" />
                    <LinhaItem label="Impostos (outros)" valor={fluxoData.despesas?.porCategoria?.impostos} corValor="text-red-600" />
                    <LinhaItem label="Amortização" valor={fluxoData.despesas?.porCategoria?.amortizacao} corValor="text-red-600" />
                    
                    <LinhaSubtotal label="Caixa gerada pelas operações" valor={fluxoData.indicadores?.caixaGeradaOperacoes} />
                    <LinhaItem label="Juros pagos" valor={fluxoData.despesas?.porCategoria?.juros} corValor="text-red-600" />
                    <LinhaItem label="Impostos sobre lucros pagos" valor={fluxoData.despesas?.porCategoria?.impostos} corValor="text-red-600" />
                    <LinhaSubtotal label="Fluxos de caixa antes da rubrica extraordinária" valor={fluxoData.indicadores?.caixaLiquidaOperacional} />
                    <LinhaTotais label="Caixa líquida proveniente das actividades operacionais" valor={fluxoData.indicadores?.caixaLiquidaOperacional} />

                    <LinhaSecao label="Fluxo de caixa das actividades de investimento:" />
                    <LinhaSubsecao label="Recebimentos provenientes de:" />
                    <LinhaItem label="Imobilizações corpóreas" valor={fluxoData.investimento?.recebimentosCorporeas} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Imobilizações incorpóreas" valor={fluxoData.investimento?.recebimentosIncorporeas} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Investimentos financeiros" valor={fluxoData.investimento?.recebimentosFinanceiros} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Subsídios a investimento" valor={fluxoData.investimento?.subsidios} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Juros e proveitos similares" valor={fluxoData.investimento?.jurosRecebidos} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Dividendos ou lucros recebidos" valor={fluxoData.investimento?.dividendosRecebidos} corValor="text-green-600" indent="pl-12" />
                    <LinhaSubsecao label="Pagamentos respeitantes a:" />
                    <LinhaItem label="Imobilizações corpóreas" valor={fluxoData.investimento?.pagamentosCorporeas} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Imobilizações incorpóreas" valor={fluxoData.investimento?.pagamentosIncorporeas} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Investimentos financeiros" valor={fluxoData.investimento?.pagamentosFinanceiros} corValor="text-red-600" indent="pl-12" />
                    <LinhaSubtotal label="Fluxos de caixa antes da rubrica extraordinária" valor={fluxoData.investimento?.liquido} />
                    <LinhaTotais label="Caixa líquida usada nas actividades de investimento" valor={fluxoData.investimento?.liquido} />

                    <LinhaSecao label="Fluxo de caixa das actividades de financiamento:" />
                    <LinhaSubsecao label="Recebimentos provenientes de:" />
                    <LinhaItem label="Aumentos de capital" valor={fluxoData.financiamento?.aumentosCapital} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Cobertura de prejuízos" valor={fluxoData.financiamento?.coberturaPrejuizos} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Empréstimos obtidos" valor={fluxoData.financiamento?.emprestimosRecebidos} corValor="text-green-600" indent="pl-12" />
                    <LinhaItem label="Subsídios à exploração e doações" valor={fluxoData.financiamento?.subsidiosExploracao} corValor="text-green-600" indent="pl-12" />
                    <LinhaSubsecao label="Pagamentos respeitantes a:" />
                    <LinhaItem label="Reduções de capital" valor={fluxoData.financiamento?.reducoesCapital} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Compras de acções ou quotas próprias" valor={fluxoData.financiamento?.comprasAcoes} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Dividendos ou lucros pagos" valor={fluxoData.financiamento?.dividendosPagos} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Amortização de empréstimos" valor={fluxoData.financiamento?.amortizacaoEmprestimos} corValor="text-red-600" indent="pl-12" />
                    <LinhaItem label="Amortização de contratos de locação financeira" valor={fluxoData.financiamento?.amortizacaoLocacao} corValor="text-red-600" indent="pl-12" />
                    <LinhaSubtotal label="Fluxos de caixa antes da rubrica extraordinária" valor={fluxoData.financiamento?.liquido} />
                    <LinhaTotais label="Caixa líquida usada nas actividades de financiamento" valor={fluxoData.financiamento?.liquido} />

                    <LinhaFinal label="Aumento líquido de caixa e seus equivalentes" valor={fluxoData.aumentoLiquido} />
                     <tr className="border-b border-gray-200">
                      <td className="py-2 px-4 pl-8 text-gray-700">Caixa e seus equivalentes no início do período</td>
                      <td className="py-2 px-4 text-right font-semibold text-blue-600">{fmt(fluxoData.saldoInicial)} Kz</td>
                     </tr>
                    <LinhaFinal label="Caixa e seus equivalentes no fim do período" valor={fluxoData.saldoFinal} />
                  </tbody>
                </table>

                <div className="mt-6 pt-4 border-t-2 border-gray-300">
                  <p className="text-xs text-gray-500">
                    <strong>Notas:</strong><br />
                    - Os valores em <span className="text-green-600 font-semibold">verde</span> indicam entradas de caixa.<br />
                    - Os valores em <span className="text-red-600 font-semibold">vermelho</span> indicam saídas de caixa.<br />
                    - Apenas pagamentos com status "Pago" são considerados.<br />
                    - Documento elaborado de acordo com o PGCA.<br />
                    - Data de emissão: {new Date().toLocaleDateString("pt-AO")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <FileText className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">📊 Nenhum dado disponível</p>
            <p className="text-gray-500 text-sm mt-2">
              Selecione uma empresa e período e clique em "Atualizar" para visualizar a Demonstração de Fluxos de Caixa.
            </p>
          </div>
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
}

export default FluxoCaixa;