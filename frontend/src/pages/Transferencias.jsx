// frontend/src/pages/Transferencias.jsx - VERSÃO CORRIGIDA
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import { 
  ArrowRightLeft, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  X,
  Printer,
  Eye,
  Trash2,
  AlertTriangle,
  Info,
  Send,
  Receipt,
  Building2,
  User,
  Banknote,
  Globe
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Transferencias() {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresaDados, setEmpresaDados] = useState(null);
  const [bancos, setBancos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  
  // Estado do formulário
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [ibanDestino, setIbanDestino] = useState(""); // 🔥 ADICIONADO
  const [destinoTipo, setDestinoTipo] = useState("conta_interna");
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState("");
  const [destinoExternoNome, setDestinoExternoNome] = useState("");
  const [destinoExternoIBAN, setDestinoExternoIBAN] = useState("");
  const [destinoExternoBanco, setDestinoExternoBanco] = useState("");
  const [valor, setValor] = useState("");
  const [valorDisplay, setValorDisplay] = useState("");
  const [designacao, setDesignacao] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [ibanOrigem, setIbanOrigem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [categoria, setCategoria] = useState("Operacional");
  const [subtipo, setSubtipo] = useState("Transferência Conta a Conta");
  const [dataTransferencia, setDataTransferencia] = useState(new Date().toISOString().split('T')[0]);
  const [referencia, setReferencia] = useState("");
  
  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [transferenciasPorPagina] = useState(10);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Modal de detalhes
  const [mostrarModal, setMostrarModal] = useState(false);
  const [transferenciaSelecionada, setTransferenciaSelecionada] = useState(null);
  
  // Modal de confirmação de exclusão
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
  const [excluirId, setExcluirId] = useState(null);

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const categorias = ["Operacional", "Investimento", "Financiamento"];
  const tiposOpcoes = ["Todos", "Entrada", "Saída"];
  const tiposDestino = [
    { value: "conta_interna", label: "Conta Interna", icon: <Building2 size={16} /> },
    { value: "fornecedor", label: "Fornecedor", icon: <User size={16} /> },
    { value: "externo", label: "Conta Externa", icon: <Globe size={16} /> }
  ];
  
  const subtiposPorCategoria = {
    "Operacional": ["Transferência Conta a Conta", "Fornecedores", "Salários", "Impostos", "Juros", "Aluguer", "Utilidades", "Manutenção", "Abastecimento"],
    "Investimento": ["Transferência Conta a Conta", "Imobilizações Corpóreas", "Imobilizações Incorpóreas", "Investimentos Financeiros", "Subsídios", "Dividendos", "Juros"],
    "Financiamento": ["Transferência Conta a Conta", "Aumentos de Capital", "Cobertura de Prejuízos", "Empréstimos", "Subsídios à Exploração", "Reduções de Capital", "Compras de Ações", "Dividendos", "Amortização de Empréstimos", "Amortização de Locação Financeira"]
  };

  const formatarValorDisplay = (valorNumero) => {
    if (valorNumero === undefined || valorNumero === null || valorNumero === "") return "";
    const numero = typeof valorNumero === 'number' ? valorNumero : parseFloat(String(valorNumero).replace(/\./g, '').replace(',', '.'));
    if (isNaN(numero)) return "";
    return numero.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorChange = (e) => {
    let value = e.target.value;
    let apenasNumeros = value.replace(/[^\d]/g, '');
    if (!apenasNumeros) {
      setValorDisplay("");
      setValor("");
      return;
    }
    let numero = parseInt(apenasNumeros, 10);
    let valorReal = numero / 100;
    setValorDisplay(valorReal.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setValor(valorReal.toString());
  };

  const handleValorBlur = () => {
    if (valor && valor !== "") {
      const numero = parseFloat(valor);
      if (!isNaN(numero)) {
        setValorDisplay(formatarValorDisplay(numero));
      }
    }
  };

  const gerarReferencia = () => {
    const ano = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const sequencial = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TRF-${ano}${mes}-${sequencial}`;
  };

  useEffect(() => {
    setReferencia(gerarReferencia());
  }, []);

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
      setEmpresaDados({ nome: userEmpresaNome || "Empresa" });
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada, userEmpresaNome]);

  useEffect(() => {
    buscarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarBancos();
      carregarFornecedores();
      carregarTransferencias();
    }
  }, [empresaSelecionada]);

  const buscarEmpresas = async () => {
    if (isTecnico()) return;
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
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
    }
  };

  const carregarFornecedores = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/fornecedores?empresaId=${empresaSelecionada}`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setFornecedores(Array.isArray(data) ? data : (data.dados || []));
      }
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
      setFornecedores([]);
    }
  };

  const handleVoltar = () => {
    setRedirecting(true);
    setTimeout(() => {
      window.location.href = '/menu';
    }, 100);
  };

  const carregarBancos = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/bancos?empresaId=${empresaSelecionada}`, { 
        headers: getHeaders() 
      });
      if (!response.ok) return;
      const data = await response.json();
      const bancosComSaldo = (Array.isArray(data) ? data : []).map(banco => ({
        _id: banco._id,
        codNome: banco.codNome,
        nome: banco.nome,
        iban: banco.iban,
        saldoDisponivel: banco.saldoDisponivel || 0
      }));
      setBancos(bancosComSaldo);
    } catch (error) {
      console.error("Erro:", error);
      setBancos([]);
    }
  };

  const carregarTransferencias = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/transferencias?empresaId=${empresaSelecionada}`, 
        { headers: getHeaders() }
      );
      if (!response.ok) return;
      const data = await response.json();
      setTransferencias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro:", error);
      setTransferencias([]);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMsg = (msg, tipo = "info") => {
    setMensagem(msg);
    setTipoMensagem(tipo);
    setTimeout(() => {
      setMensagem("");
      setTipoMensagem("");
    }, 4000);
  };

  const formatarNumero = (numero) => {
    if (numero === undefined || numero === null) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarMoeda = (numero) => `${formatarNumero(numero)} Kz`;

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString("pt-AO");
  };

  const getSaldoConta = (contaCodNome) => {
    if (!contaCodNome) return 0;
    const banco = bancos.find(b => b.codNome === contaCodNome);
    return banco?.saldoDisponivel || 0;
  };

  const handleOrigemChange = (e) => {
    const valor = e.target.value;
    const banco = bancos.find(b => b.codNome === valor);
    setOrigem(valor);
    setIbanOrigem(banco?.iban || "");
  };

  const handleFornecedorChange = (e) => {
    const id = e.target.value;
    const fornecedor = fornecedores.find(f => f._id === id);
    setFornecedorSelecionado(id);
    if (fornecedor) {
      setDestinatario(fornecedor.nome);
      setDestinoExternoIBAN(fornecedor.pagamento?.iban || "");
      setDestinoExternoBanco(fornecedor.pagamento?.banco || "");
    }
  };

  const handleDestinoTipoChange = (tipo) => {
    setDestinoTipo(tipo);
    setDestino("");
    setFornecedorSelecionado("");
    setDestinoExternoNome("");
    setDestinoExternoIBAN("");
    setDestinoExternoBanco("");
    setIbanDestino("");
    if (tipo === "conta_interna") setSubtipo("Transferência Conta a Conta");
    if (tipo === "fornecedor") setSubtipo("Fornecedores");
    if (tipo === "externo") setSubtipo("Fornecedores");
  };

  const realizarTransferencia = async () => {
    if (!empresaSelecionada) {
      mostrarMsg("⚠️ Selecione uma empresa primeiro", "erro");
      return;
    }

    if (!origem || !valor || !designacao || !destinatario) {
      mostrarMsg("⚠️ Preencha todos os campos obrigatórios.", "erro");
      return;
    }

    let contaCreditar = "";
    let ibanCreditar = "";
    let nomeDestino = destinatario;

    if (destinoTipo === "conta_interna") {
      if (!destino) {
        mostrarMsg("⚠️ Selecione a conta de destino interna.", "erro");
        return;
      }
      const bancoDestino = bancos.find(b => b.codNome === destino);
      contaCreditar = destino;
      ibanCreditar = bancoDestino?.iban || ibanDestino || "";
    } else if (destinoTipo === "fornecedor") {
      if (!fornecedorSelecionado) {
        mostrarMsg("⚠️ Selecione um fornecedor.", "erro");
        return;
      }
      const fornecedor = fornecedores.find(f => f._id === fornecedorSelecionado);
      contaCreditar = `EXT-${fornecedor.nome.substring(0, 10)}`;
      ibanCreditar = destinoExternoIBAN || fornecedor.pagamento?.iban || "";
      nomeDestino = fornecedor.nome;
    } else if (destinoTipo === "externo") {
      if (!destinoExternoNome || !destinoExternoIBAN) {
        mostrarMsg("⚠️ Preencha o nome e IBAN do beneficiário externo.", "erro");
        return;
      }
      contaCreditar = `EXT-${destinoExternoNome.substring(0, 15)}`;
      ibanCreditar = destinoExternoIBAN;
      nomeDestino = destinoExternoNome;
    }

    if (destinoTipo === "conta_interna" && origem === destino) {
      mostrarMsg("⚠️ A conta de origem e destino não podem ser iguais.", "erro");
      return;
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      mostrarMsg("⚠️ Insira um valor válido maior que zero.", "erro");
      return;
    }

    const saldoAtual = getSaldoConta(origem);
    if (valorNum > saldoAtual) {
      mostrarMsg(`⚠️ Saldo insuficiente. Disponível: ${formatarMoeda(saldoAtual)}`, "erro");
      return;
    }

    setLoading(true);
    try {
      const novaTransferencia = {
        designacao: designacao.trim(),
        destinatario: nomeDestino,
        contaDebitar: origem,
        ibanDebitar: ibanOrigem,
        valorDebitar: valorNum,
        contaCreditar: contaCreditar,
        ibanCreditar: ibanCreditar,
        valorCreditar: valorNum,
        observacao: observacao || "",
        categoria,
        subtipo,
        empresaId: empresaSelecionada,
        data: dataTransferencia,
        referencia: referencia,
        destinoTipo: destinoTipo,
        destinoOriginal: destinoTipo === "conta_interna" ? destino : nomeDestino
      };

      const response = await fetch(`${BASE_URL}/api/transferencias`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(novaTransferencia),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensagem || "Erro ao realizar transferência");
      }

      alert("✅ Transferência realizada com sucesso! A página vai recarregar.");
      window.location.reload();
      
    } catch (error) {
      console.error("Erro:", error);
      alert(`❌ ${error.message}`);
      setLoading(false);
    }
  };

  const confirmarExclusao = (id) => {
    setExcluirId(id);
    setMostrarModalExcluir(true);
  };

  const excluirTransferencia = async () => {
    if (!excluirId) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/transferencias/${excluirId}?empresaId=${empresaSelecionada}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Erro ao excluir transferência.");
      mostrarMsg("✅ Transferência excluída com sucesso!", "sucesso");
      setMostrarModalExcluir(false);
      setExcluirId(null);
      await Promise.all([carregarTransferencias(), carregarBancos()]);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMsg("❌ Erro ao excluir transferência.", "erro");
    } finally {
      setLoading(false);
    }
  };

  const verDetalhes = (transferencia) => {
    setTransferenciaSelecionada(transferencia);
    setMostrarModal(true);
  };

  const exportarPDF = async () => {
    if (transferenciasFiltradas.length === 0) {
      mostrarMsg("📄 Nenhuma transferência para exportar", "erro");
      return;
    }
    setLoading(true);
    try {
      let empresaNome = "EMPRESA";
      let empresaNif = "---";
      let empresaEndereco = "";
      let empresaTelefone = "";
      let empresaEmail = "";
      
      if (isTecnico() && userEmpresaNome) {
        empresaNome = userEmpresaNome;
      } else if (empresaDados) {
        empresaNome = empresaDados.nome || "EMPRESA";
        empresaNif = empresaDados.nif || "---";
        if (empresaDados.endereco) {
          if (typeof empresaDados.endereco === 'object') {
            empresaEndereco = [empresaDados.endereco.rua, empresaDados.endereco.numero, empresaDados.endereco.bairro, empresaDados.endereco.cidade]
              .filter(Boolean).join(", ");
          } else {
            empresaEndereco = empresaDados.endereco;
          }
        }
        empresaTelefone = empresaDados.telefone || "";
        empresaEmail = empresaDados.email || "";
      }
      
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(empresaNome.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`NIF: ${empresaNif}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 6;
      
      if (empresaEndereco) {
        doc.text(empresaEndereco, pageWidth / 2, yPos, { align: "center" });
        yPos += 6;
      }
      
      if (empresaTelefone || empresaEmail) {
        const contato = [empresaTelefone, empresaEmail].filter(Boolean).join(" | ");
        doc.text(contato, pageWidth / 2, yPos, { align: "center" });
        yPos += 6;
      }
      
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 8;
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("RELATÓRIO DE TRANSFERÊNCIAS", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-AO")}`, pageWidth - 50, yPos);
      doc.text(`Hora: ${new Date().toLocaleTimeString("pt-AO")}`, pageWidth - 50, yPos + 6);
      yPos += 15;
      
      const totalValor = transferenciasFiltradas.reduce((acc, t) => acc + (t.valorDebitar || 0), 0);
      const totalEntradas = transferenciasFiltradas.filter(t => t.tipo === "Entrada").reduce((acc, t) => acc + (t.valorCreditar || 0), 0);
      const totalSaidas = transferenciasFiltradas.filter(t => t.tipo === "Saída").reduce((acc, t) => acc + (t.valorDebitar || 0), 0);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("RESUMO DO PERÍODO", 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total de Transferências: ${transferenciasFiltradas.length}`, 30, yPos);
      doc.text(`Valor Total Transferido: ${formatarMoeda(totalValor)}`, 30, yPos + 7);
      doc.text(`Total de Entradas: ${formatarMoeda(totalEntradas)}`, 30, yPos + 14);
      doc.text(`Total de Saídas: ${formatarMoeda(totalSaidas)}`, 30, yPos + 21);
      yPos += 30;
      
      const tableData = transferenciasFiltradas.map(t => [
        formatarData(t.data),
        t.referencia || "-",
        t.designacao?.substring(0, 25) || "-",
        t.destinatario?.substring(0, 20) || "-",
        t.contaDebitar || "-",
        formatarMoeda(t.valorDebitar),
        t.contaCreditar || "-",
        t.categoria || "-",
        t.tipo || "Saída"
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [["Data", "Ref", "Designação", "Destinatário", "Cta Débito", "Valor", "Cta Crédito", "Categoria", "Tipo"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 15, right: 15 }
      });
      
      const finalY = doc.lastAutoTable?.finalY || yPos + 50;
      yPos = finalY + 15;
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      
      doc.line(30, yPos + 15, 80, yPos + 15);
      doc.setFontSize(9);
      doc.text("Assinatura do Gestor", 55, yPos + 23, { align: "center" });
      
      doc.line(pageWidth - 80, yPos + 15, pageWidth - 30, yPos + 15);
      doc.text("Assinatura do Técnico Responsável", pageWidth - 55, yPos + 23, { align: "center" });
      
      doc.line(pageWidth / 2 - 30, yPos + 15, pageWidth / 2 + 30, yPos + 15);
      doc.text("Carimbo da Empresa", pageWidth / 2, yPos + 23, { align: "center" });
      
      yPos += 40;
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Documento emitido eletronicamente - Sistema de Gestão Empresarial AnDioGest", pageWidth / 2, doc.internal.pageSize.height - 20, { align: "center" });
      doc.text("Este documento é válido como comprovante de movimentação financeira", pageWidth / 2, doc.internal.pageSize.height - 15, { align: "center" });
      
      doc.save(`transferencias_${new Date().toISOString().split("T")[0]}.pdf`);
      mostrarMsg("📄 PDF exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMsg("❌ Erro ao gerar PDF", "erro");
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas
  const totalTransferido = transferencias.reduce((acc, t) => acc + (t.valorDebitar || 0), 0);
  const totalEntradas = transferencias.filter(t => t.tipo === "Entrada").reduce((acc, t) => acc + (t.valorCreditar || 0), 0);
  const totalSaidas = transferencias.filter(t => t.tipo === "Saída").reduce((acc, t) => acc + (t.valorDebitar || 0), 0);

  // Filtros
  const transferenciasFiltradas = transferencias.filter(t => {
    const matchBusca = !busca || 
                       (t.designacao || "").toLowerCase().includes(busca.toLowerCase()) ||
                       (t.destinatario || "").toLowerCase().includes(busca.toLowerCase()) ||
                       (t.referencia || "").toLowerCase().includes(busca.toLowerCase()) ||
                       (t.contaDebitar || "").toLowerCase().includes(busca.toLowerCase()) ||
                       (t.contaCreditar || "").toLowerCase().includes(busca.toLowerCase());
    
    const matchData = (!filtroDataInicio || new Date(t.data) >= new Date(filtroDataInicio)) &&
                      (!filtroDataFim || new Date(t.data) <= new Date(filtroDataFim));
    
    const matchCategoria = !filtroCategoria || t.categoria === filtroCategoria;
    const matchTipo = !filtroTipo || filtroTipo === "Todos" || t.tipo === filtroTipo;
    
    return matchBusca && matchData && matchCategoria && matchTipo;
  });

  const indexInicial = (paginaActual - 1) * transferenciasPorPagina;
  const transferenciasVisiveis = transferenciasFiltradas.slice(indexInicial, indexInicial + transferenciasPorPagina);
  const paginasTotal = Math.ceil(transferenciasFiltradas.length / transferenciasPorPagina);

  if (redirecting) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-2xl p-6 text-center max-w-sm">
          <Loader2 size={48} className="animate-spin mx-auto text-blue-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">A redirecionar...</h3>
          <p className="text-gray-400 text-sm">Voltando ao menu principal</p>
        </div>
      </div>
    );
  }

  if (loading && !transferencias.length && bancos.length === 0) {
    return (
      <Layout title="Transferência de Fundos" showBackButton={true} backToRoute="/menu" customBackAction={handleVoltar}>
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
    <Layout title="Transferência de Fundos" showBackButton={true} backToRoute="/menu" customBackAction={handleVoltar}>
      {mensagem && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            tipoMensagem === "sucesso" ? "bg-green-600" : tipoMensagem === "erro" ? "bg-red-600" : "bg-yellow-600"
          } text-white text-sm whitespace-nowrap`}>
            {tipoMensagem === "sucesso" ? <CheckCircle className="w-4 h-4" /> : 
             tipoMensagem === "erro" ? <AlertCircle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            <span>{mensagem}</span>
          </div>
        </div>
      )}

      <div className="space-y-6 p-4">
        {isTecnico() && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Building2 size={18} />
              <span className="text-sm">Operando como Técnico | Empresa: <strong>{userEmpresaNome}</strong></span>
            </div>
          </div>
        )}

        {!isTecnico() && (
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <label className="block mb-2 font-semibold text-gray-300">🏢 Empresa</label>
            <select
              className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-400"
              value={empresaSelecionada}
              onChange={(e) => setEmpresaSelecionada(e.target.value)}
            >
              {empresas.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.nome}</option>
              ))}
            </select>
          </div>
        )}

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><Send size={24} /><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span></div>
                <p className="text-2xl font-bold">{formatarMoeda(totalTransferido)}</p>
                <p className="text-sm opacity-80 mt-1">Total Transferido</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><Receipt size={24} /><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Qtd</span></div>
                <p className="text-2xl font-bold">{transferencias.length}</p>
                <p className="text-sm opacity-80 mt-1">Total de Transferências</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><TrendingUp size={24} /><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Entradas</span></div>
                <p className="text-2xl font-bold text-green-300">{formatarMoeda(totalEntradas)}</p>
                <p className="text-sm opacity-80 mt-1">Total de Entradas</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3"><TrendingDown size={24} /><span className="text-xs bg-white/20 px-2 py-1 rounded-full">Saídas</span></div>
                <p className="text-2xl font-bold text-red-300">{formatarMoeda(totalSaidas)}</p>
                <p className="text-sm opacity-80 mt-1">Total de Saídas</p>
              </div>
            </div>

            {/* Formulário de Transferência */}
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <ArrowRightLeft size={20} /> Nova Transferência
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div><label className="block mb-1 font-semibold text-gray-300">Referência</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white font-mono text-sm" value={referencia} readOnly /></div>
                <div><label className="block mb-1 font-semibold text-gray-300">Data da Transferência</label><input type="date" className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={dataTransferencia} onChange={(e) => setDataTransferencia(e.target.value)} /></div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div><label className="block mb-1 font-semibold text-gray-300">Designação / Factura *</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={designacao} onChange={(e) => setDesignacao(e.target.value)} placeholder="Ex: Pagamento fornecedor" /></div>
                <div><label className="block mb-1 font-semibold text-gray-300">Destinatário *</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Ex: João Mateus" /></div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div><label className="block mb-1 font-semibold text-gray-300">Valor (Kz) *</label><input type="text" inputMode="decimal" className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={valorDisplay} onChange={handleValorChange} onBlur={handleValorBlur} placeholder="Ex: 250000" /></div>
                <div><label className="block mb-1 font-semibold text-gray-300">Categoria *</label><select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={categoria} onChange={(e) => { setCategoria(e.target.value); setSubtipo("Transferência Conta a Conta"); }}>{categorias.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
                <div><label className="block mb-1 font-semibold text-gray-300">Subtipo *</label><select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={subtipo} onChange={(e) => setSubtipo(e.target.value)}>{subtiposPorCategoria[categoria]?.map(sub => (<option key={sub} value={sub}>{sub}</option>))}</select></div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-semibold text-gray-300">Conta de Origem (Débito) *</label>
                  <select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={origem} onChange={handleOrigemChange}>
                    <option value="">-- Selecionar --</option>
                    {bancos.map((b) => (<option key={b._id} value={b.codNome}>{b.nome} - Saldo: {formatarMoeda(b.saldoDisponivel)}</option>))}
                  </select>
                  {origem && (<p className={`text-xs mt-1 flex items-center gap-1 ${getSaldoConta(origem) >= parseFloat(valor || 0) ? 'text-green-400' : 'text-red-400'}`}><DollarSign size={12} /> Saldo disponível: {formatarMoeda(getSaldoConta(origem))}</p>)}
                  <input type="text" className="w-full mt-2 p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={ibanOrigem} onChange={(e) => setIbanOrigem(e.target.value)} placeholder="IBAN da Conta de Origem" />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-gray-300">Tipo de Destino *</label>
                  <div className="flex gap-2 flex-wrap">
                    {tiposDestino.map((tipo) => (
                      <button key={tipo.value} type="button" onClick={() => handleDestinoTipoChange(tipo.value)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${destinoTipo === tipo.value ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {tipo.icon} {tipo.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                {destinoTipo === "conta_interna" && (
                  <div>
                    <label className="block mb-1 font-semibold text-gray-300">Conta de Destino (Crédito) *</label>
                    <select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={destino} onChange={(e) => setDestino(e.target.value)}>
                      <option value="">-- Selecionar --</option>
                      {bancos.filter(b => b.codNome !== origem).map((b) => (<option key={b._id} value={b.codNome}>{b.nome}</option>))}
                    </select>
                    <input type="text" className="w-full mt-2 p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={ibanDestino} onChange={(e) => setIbanDestino(e.target.value)} placeholder="IBAN da Conta de Destino" />
                  </div>
                )}

                {destinoTipo === "fornecedor" && (
                  <div>
                    <label className="block mb-1 font-semibold text-gray-300">Selecionar Fornecedor *</label>
                    <select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400" value={fornecedorSelecionado} onChange={handleFornecedorChange}>
                      <option value="">-- Selecionar Fornecedor --</option>
                      {fornecedores.map((f) => (<option key={f._id} value={f._id}>{f.nome} - {f.nif}</option>))}
                    </select>
                    {destinoExternoIBAN && (<p className="text-xs text-green-400 mt-1"><Banknote size={12} className="inline mr-1" />IBAN: {destinoExternoIBAN}</p>)}
                    {destinoExternoBanco && (<p className="text-xs text-gray-400">Banco: {destinoExternoBanco}</p>)}
                    <input type="text" className="w-full mt-2 p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={ibanDestino} onChange={(e) => setIbanDestino(e.target.value)} placeholder="IBAN (se diferente do cadastrado)" />
                  </div>
                )}

                {destinoTipo === "externo" && (
                  <div className="space-y-3">
                    <div><label className="block mb-1 font-semibold text-gray-300">Nome do Beneficiário *</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={destinoExternoNome} onChange={(e) => setDestinoExternoNome(e.target.value)} placeholder="Ex: Empresa ABC" /></div>
                    <div><label className="block mb-1 font-semibold text-gray-300">IBAN do Beneficiário *</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={destinoExternoIBAN} onChange={(e) => setDestinoExternoIBAN(e.target.value)} placeholder="Ex: AO0600400000457821" /></div>
                    <div><label className="block mb-1 font-semibold text-gray-300">Banco (opcional)</label><input type="text" className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={destinoExternoBanco} onChange={(e) => setDestinoExternoBanco(e.target.value)} placeholder="Ex: BAI" /></div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-semibold text-gray-300">Observação</label>
                <textarea rows={2} className="w-full p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informação adicional..." />
              </div>

              <button onClick={realizarTransferencia} disabled={loading || bancos.length === 0} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {loading ? "Processando..." : "Realizar Transferência"}
              </button>
            </div>

            {transferencias.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-md p-4 border border-gray-700">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-lg bg-gray-700/50 transition"><Filter size={18} /> {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}</button>
                  <div className="flex gap-2"><button onClick={exportarPDF} className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition"><Printer size={16} /> Exportar PDF</button><button onClick={() => { carregarTransferencias(); carregarBancos(); carregarFornecedores(); }} className="flex items-center gap-2 text-white bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg transition"><RefreshCw size={16} /> Atualizar</button></div>
                </div>
                {mostrarFiltros && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-700">
                    <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Pesquisar..." className="w-full pl-10 p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
                    <input type="date" className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
                    <input type="date" className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
                    <select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}><option value="">Todas categorias</option>{categorias.map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select>
                    <select className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>{tiposOpcoes.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}</select>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="bg-gray-800 rounded-xl p-12 text-center"><Loader2 size={48} className="animate-spin mx-auto text-blue-400" /><p className="text-gray-400 mt-4">Carregando transferências...</p></div>
            ) : transferenciasVisiveis.length > 0 ? (
              <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <h3 className="text-xl font-bold text-blue-400 p-4 border-b border-gray-700 flex items-center gap-2"><FileText size={20} /> Histórico de Transferências</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white"><th className="p-3 text-center">#</th><th className="p-3 text-center">Data</th><th className="p-3 text-left">Ref</th><th className="p-3 text-left">Designação</th><th className="p-3 text-left">Destinatário</th><th className="p-3 text-left">Cta Débito</th><th className="p-3 text-right">Valor</th><th className="p-3 text-left">Cta Crédito</th><th className="p-3 text-center">Tipo</th><th className="p-3 text-center">Ações</th></tr></thead>
                    <tbody>{transferenciasVisiveis.map((t, index) => (<tr key={t._id || index} className="border-t border-gray-700 hover:bg-gray-700/50 transition"><td className="p-3 text-center text-gray-400">{indexInicial + index + 1}</td><td className="p-3 text-center whitespace-nowrap">{formatarData(t.data)}</td><td className="p-3 font-mono text-xs">{t.referencia || "-"}</td><td className="p-3 max-w-xs truncate">{t.designacao || "-"}</td><td className="p-3 max-w-xs truncate">{t.destinatario || "-"}</td><td className="p-3 font-mono text-xs">{t.contaDebitar || "-"}</td><td className="p-3 text-right text-red-400 font-semibold whitespace-nowrap">{formatarMoeda(t.valorDebitar)}</td><td className="p-3 font-mono text-xs">{t.contaCreditar || "-"}</td><td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${t.tipo === "Entrada" ? "bg-green-600/30 text-green-300" : "bg-red-600/30 text-red-300"}`}>{t.tipo === "Entrada" ? "⬆️ Entrada" : "⬇️ Saída"}</span></td><td className="p-3 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => verDetalhes(t)} className="bg-blue-600 hover:bg-blue-700 p-1.5 rounded-md transition" title="Ver detalhes"><Eye size={16} /></button><button onClick={() => confirmarExclusao(t._id)} className="bg-red-600 hover:bg-red-700 p-1.5 rounded-md transition" title="Excluir"><Trash2 size={16} /></button></div></td></tr>))}</tbody>
                  </table>
                </div>
                {paginasTotal > 1 && (<div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-between items-center"><button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold text-white transition disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={18} /> Anterior</button><span className="text-sm text-gray-300">Página {paginaActual} de {paginasTotal}</span><button onClick={() => setPaginaActual(p => Math.min(paginasTotal, p + 1))} disabled={paginaActual === paginasTotal} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold text-white transition disabled:opacity-50 flex items-center gap-2">Próxima <ChevronRight size={18} /></button></div>)}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-700"><FileText className="mx-auto mb-4 text-gray-500" size={48} /><p className="text-gray-400 text-lg">📊 Nenhuma transferência registada.</p><p className="text-gray-500 text-sm mt-2">Preencha o formulário acima para realizar uma transferência.</p></div>
            )}
          </>
        )}

        {empresaSelecionada && bancos.length === 0 && !loading && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-8 text-center"><AlertCircle className="mx-auto mb-4 text-yellow-400" size={48} /><p className="text-yellow-200 text-lg">⚠️ Nenhuma conta bancária encontrada</p><p className="text-yellow-300 text-sm mt-2">Cadastre uma conta bancária para realizar transferências.</p></div>
        )}
      </div>

      {mostrarModal && transferenciaSelecionada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700"><div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-blue-600 p-2 rounded-lg"><FileText className="text-white" size={20} /></div><h2 className="text-xl font-bold text-white">Detalhes da Transferência</h2></div><button onClick={() => setMostrarModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button></div></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Referência</p><p className="font-mono text-sm text-white">{transferenciaSelecionada.referencia || "-"}</p></div><div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Data</p><p className="font-semibold text-white">{formatarData(transferenciaSelecionada.data)}</p></div></div>
              <div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Designação</p><p className="font-semibold text-white">{transferenciaSelecionada.designacao || "-"}</p></div>
              <div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Destinatário</p><p className="font-semibold text-white">{transferenciaSelecionada.destinatario || "-"}</p></div>
              <div className="grid grid-cols-2 gap-4"><div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30"><p className="text-xs text-red-400">Conta de Origem (Débito)</p><p className="font-mono text-sm text-white">{transferenciaSelecionada.contaDebitar || "-"}</p><p className="text-xs text-gray-400 mt-1">IBAN: {transferenciaSelecionada.ibanDebitar || "-"}</p><p className="text-lg font-bold text-red-400 mt-2">- {formatarMoeda(transferenciaSelecionada.valorDebitar)}</p></div><div className="bg-green-900/20 rounded-lg p-3 border border-green-500/30"><p className="text-xs text-green-400">Conta de Destino (Crédito)</p><p className="font-mono text-sm text-white">{transferenciaSelecionada.contaCreditar || "-"}</p><p className="text-xs text-gray-400 mt-1">IBAN: {transferenciaSelecionada.ibanCreditar || "-"}</p><p className="text-lg font-bold text-green-400 mt-2">+ {formatarMoeda(transferenciaSelecionada.valorCreditar)}</p></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Categoria</p><p className="font-semibold text-white">{transferenciaSelecionada.categoria || "-"}</p></div><div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Subtipo</p><p className="font-semibold text-white">{transferenciaSelecionada.subtipo || "-"}</p></div></div>
              {transferenciaSelecionada.observacao && (<div className="bg-gray-700/30 rounded-lg p-3"><p className="text-xs text-gray-400">Observação</p><p className="text-sm text-white">{transferenciaSelecionada.observacao}</p></div>)}
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end"><button onClick={() => setMostrarModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition">Fechar</button></div>
          </div>
        </div>
      )}

      {mostrarModalExcluir && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl"><div className="flex items-center gap-3"><div className="bg-red-600 p-2 rounded-lg"><AlertTriangle className="text-white" size={20} /></div><h3 className="text-xl font-bold text-white">Confirmar Exclusão</h3></div></div>
            <div className="p-6"><p className="text-gray-300">Tem certeza que deseja excluir esta transferência?</p><p className="text-sm text-gray-500 mt-2">Esta ação não pode ser desfeita.</p></div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3"><button onClick={() => setMostrarModalExcluir(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition">Cancelar</button><button onClick={excluirTransferencia} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition">Excluir</button></div>
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

export default Transferencias;